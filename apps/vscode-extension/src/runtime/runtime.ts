import type { ActivityEventType } from '@kairos/shared/ingestion';
import type { ExtensionEffectiveSettings, ExtensionHandshakeResponse } from '@kairos/shared/settings';

import {
  CONNECTION_PROBE_FAILURE_THRESHOLD,
  CONNECTION_PROBE_INTERVAL_MS,
  DESKTOP_PROTOCOL_VERSION,
  DELIVERY_REPLAY_TRANSIENT_FAILURE_THRESHOLD,
  INITIAL_RETRY_DELAY_MS,
  MAX_RETRY_DELAY_MS,
} from './constants';
import {
  createActivityEvent,
  isCodingContext,
  isExcludedContext,
  sanitizeMachine,
  shapeContextForEmission,
  shouldEmitEvent,
} from './filters';
import {
  DEFAULT_OUTBOX_THRESHOLDS,
  type OutboxLimitStatus,
} from './outbox-limits';
import { ExtensionSettingsMirror } from './settings/mirror';
import { OutboxSyncWorker } from './sync-worker';
import type {
  ConnectionState,
  EditorContext,
  RuntimeObserver,
  RuntimeOptions,
  RuntimeSchedulerHandle,
  RuntimeStatusSnapshot,
  StatusDisplayState,
} from './types';

const FILE_DWELL_THRESHOLD_MS = 15_000;

export class KairosRuntime {
  private readonly observer: RuntimeObserver;
  private readonly scheduler: RuntimeOptions['scheduler'];
  private readonly environment: RuntimeOptions['environment'];
  private readonly installationID: string;
  private readonly syncWorker: OutboxSyncWorker;
  private readonly settingsMirror: ExtensionSettingsMirror;

  private state: ConnectionState = 'disconnected';
  private focused = true;
  private activeContext?: EditorContext;
  private queueSize = 0;
  private flushing = false;
  private disposed = false;
  private heartbeatHandle?: RuntimeSchedulerHandle;
  private connectionProbeHandle?: RuntimeSchedulerHandle;
  private retryHandle?: RuntimeSchedulerHandle;
  private dwellHandle?: RuntimeSchedulerHandle;
  private retryDelayMs = INITIAL_RETRY_DELAY_MS;
  private consecutiveProbeFailures = 0;
  private consecutiveTransientReplayFailures = 0;
  private stateDetail = 'Disconnected';
  private trackedMinuteKeys = new Set<string>();
  private trackedDateKey: string;
  private lastTrackedActivityAt?: Date;
  private lastHandshakeAt?: string;
  private lastSuccessfulSendAt?: string;
  private lastEventAt?: string;
  private activeContextKey?: string;
  private qualifiedContextKey?: string;
  private lastHandshakeResponse?: ExtensionHandshakeResponse;
  private outboxLimitStatus: OutboxLimitStatus = {
    estimatedSizeBytes: 0,
    thresholdState: 'normal',
    captureBlockedByHardCap: false,
    thresholds: DEFAULT_OUTBOX_THRESHOLDS,
  };

  constructor(options: RuntimeOptions) {
    this.observer = options.observer;
    this.scheduler = options.scheduler;
    this.environment = options.environment;
    this.installationID = options.installationID;
    this.settingsMirror = new ExtensionSettingsMirror({
      storage: options.storage,
      observer: options.observer,
      now: options.environment.now,
      initialSettings: options.initialSettings,
    });
    this.trackedDateKey = toDateKey(this.environment.now());
    this.syncWorker = new OutboxSyncWorker({
      client: options.client,
      storage: options.storage,
      scheduler: options.scheduler,
      observer: options.observer,
      environment: options.environment,
    });
  }

  async start(): Promise<void> {
    try {
      await this.settingsMirror.initialize();

      const recovered = await this.syncWorker.recoverStaleSendingRows();
      if (recovered > 0) {
        this.observer.logInfo(`Recovered ${recovered} sending outbox row(s) to pending on startup`);
      }
      await this.refreshOutboxHealth();
      this.publishStatus();
      this.resetConnectionProbeSchedule();

      await this.connectAndSync();
    } catch (error) {
      // Initial activation should degrade gracefully when the desktop app is unavailable.
      this.observer.logWarn(`Runtime start degraded gracefully: ${formatError(error)}`);
    }
  }

  dispose(): void {
    this.disposed = true;
    this.heartbeatHandle?.cancel();
    this.connectionProbeHandle?.cancel();
    this.retryHandle?.cancel();
    this.dwellHandle?.cancel();
    this.syncWorker.dispose();
  }

  getConnectionState(): ConnectionState {
    return this.state;
  }

  getBufferedEventCount(): number {
    return this.queueSize;
  }

  getSettings(): ExtensionEffectiveSettings {
    return this.effectiveSettings;
  }

  getStatusSnapshot(): RuntimeStatusSnapshot {
    return this.createStatusSnapshot();
  }

  async refreshSettings(): Promise<void> {
    await this.connectAndSync();
  }

  async updateActiveEditor(context?: EditorContext): Promise<void> {
    this.activeContext = context;
    const nextContextKey = getContextKey(context);
    if (nextContextKey !== this.activeContextKey) {
      this.activeContextKey = nextContextKey;
      this.qualifiedContextKey = undefined;
      this.dwellHandle?.cancel();
      this.dwellHandle = undefined;

      if (context && isCodingContext(context) && nextContextKey) {
        this.dwellHandle = this.scheduler.setTimeout(() => {
          if (this.disposed || this.activeContextKey !== nextContextKey || !this.activeContext || !isCodingContext(this.activeContext)) {
            return;
          }
          this.qualifiedContextKey = nextContextKey;
          this.observer.logInfo('File active for 15s; starting tracked timer');
        }, FILE_DWELL_THRESHOLD_MS);
      }
    }
    this.publishStatus();
  }

  async setWindowFocused(focused: boolean): Promise<void> {
    const changed = this.focused !== focused;
    this.focused = focused;
    this.publishStatus();
    if (!changed || !this.activeContext) {
      return;
    }

    await this.recordEvent(focused ? 'focus' : 'blur', this.activeContext);
  }

  async recordOpen(context: EditorContext): Promise<void> {
    await this.recordEvent('open', context);
  }

  async recordSave(context: EditorContext): Promise<void> {
    await this.recordEvent('save', context);
  }

  async recordEdit(context: EditorContext): Promise<void> {
    await this.recordEvent('edit', context);
  }

  async emitHeartbeat(): Promise<void> {
    if (!this.activeContext) {
      return;
    }
    await this.recordEvent('heartbeat', this.activeContext);
  }

  private async connectAndSync(options?: {
    silentWhenAlreadyConnected?: boolean;
    failureReason?: string;
    suppressFailureTransition?: boolean;
  }): Promise<void> {
    if (this.disposed) {
      return;
    }

    const shouldSilentlySync = options?.silentWhenAlreadyConnected === true && this.state === 'connected';
    if (!shouldSilentlySync) {
      this.setState('connecting', 'Connecting');
    }

    try {
      const response = await this.syncWorker.performHandshake();
      if (response.protocolVersion !== DESKTOP_PROTOCOL_VERSION) {
        throw new Error(
          `desktop protocol mismatch: expected v${DESKTOP_PROTOCOL_VERSION}, received v${response.protocolVersion}`,
        );
      }
      await this.settingsMirror.applyHandshake(response);

      this.lastHandshakeResponse = response;
      this.lastHandshakeAt = response.serverTimestamp;
      this.consecutiveProbeFailures = 0;
      this.consecutiveTransientReplayFailures = 0;
      this.retryDelayMs = INITIAL_RETRY_DELAY_MS;
      this.retryHandle?.cancel();
      this.retryHandle = undefined;
      if (!shouldSilentlySync || this.state !== 'connected') {
        this.setState('connected', 'Connected');
      } else if (this.stateDetail !== 'Connected') {
        this.stateDetail = 'Connected';
        this.publishStatus();
      }
      this.observer.logInfo('Kairos desktop settings synchronized');
      this.resetHeartbeatSchedule();
      await this.refreshOutboxHealth();
      await this.flushQueue();
    } catch (error) {
      this.observer.logWarn(`Failed to synchronize with Kairos desktop: ${formatError(error)}`);
      this.resetHeartbeatSchedule();
      await this.refreshOutboxHealth();
      if (!options?.suppressFailureTransition) {
        this.handleConnectionFailure(options?.failureReason ?? 'handshake failed');
      }
      throw error;
    }
  }

  private async recordEvent(eventType: ActivityEventType, context: EditorContext): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.activeContext = context;
    if (!isCodingContext(context)) {
      this.observer.logInfo(`Skipped ${eventType} event: non-coding context`);
      return;
    }

    const settings = this.effectiveSettings;
    const decision = shouldEmitEvent(eventType, settings, this.focused);
    if (!decision.allowed) {
      this.observer.logInfo(`Skipped ${eventType} event: ${decision.reason}`);
      return;
    }

    if (settings.respectDesktopExclusions && isExcludedContext(context, this.environment.machine, settings.exclusions)) {
      this.observer.logInfo(`Skipped ${eventType} event: excluded by desktop settings`);
      return;
    }

    if (eventType !== 'focus' && eventType !== 'blur') {
      if (!context.filePath) {
        this.observer.logInfo(`Skipped ${eventType} event: no active file`);
        return;
      }
      const contextKey = getContextKey(context);
      if (!contextKey || this.qualifiedContextKey !== contextKey) {
        this.observer.logInfo(`Skipped ${eventType} event: waiting for 15s file dwell`);
        return;
      }
    }

    const shapedContext = shapeContextForEmission(context, settings);
    const event = createActivityEvent(
      eventType,
      shapedContext,
      sanitizeMachine(this.environment.machine, settings.sendMachineAttribution),
      this.environment.now(),
      this.environment.randomID(),
    );

    const enqueueOutcome = await this.syncWorker.enqueueEvent(event, {
      workspaceID: shapedContext.workspaceId,
      workspaceName: shapedContext.projectName,
      projectIDHint: shapedContext.projectName,
      installationID: this.installationID,
      settings,
    });
    this.applyOutboxLimitStatus(enqueueOutcome.health.limitStatus);
    this.queueSize = enqueueOutcome.health.queueSize;
    if (enqueueOutcome.kind === 'blocked_hard_cap') {
      this.observer.logWarn(
        `Skipped ${eventType} event: outbox hard cap reached (${formatBytes(this.outboxLimitStatus.thresholds.hardCapBytes)})`,
      );
      this.publishStatus();
      await this.flushQueueOrBuffer();
      return;
    }

    this.lastEventAt = event.timestamp;
    if (this.state === 'connected' || settings.bufferEventsWhenOffline) {
      this.recordTrackedActivity(eventType, new Date(event.timestamp));
    }
    this.publishStatus();
    await this.flushQueueOrBuffer();
  }

  private async flushQueueOrBuffer(): Promise<void> {
    if (this.queueSize === 0) {
      return;
    }

    if (this.state !== 'connected') {
      if (this.effectiveSettings.bufferEventsWhenOffline) {
        this.setState('offline-buffering', `Buffered ${this.queueSize} event(s)`);
        this.scheduleRetryIfNeeded();
        return;
      }

      this.setState(this.effectiveSettings.retryConnectionAutomatically ? 'retrying' : 'disconnected', 'desktop unavailable');
      this.scheduleRetryIfNeeded();
      return;
    }

    await this.flushQueue();
  }

  private async flushQueue(): Promise<void> {
    if (this.flushing || this.queueSize === 0 || this.state !== 'connected' || this.disposed) {
      return;
    }
    if (!this.lastHandshakeResponse) {
      return;
    }

    this.flushing = true;
    try {
      const outcome = await this.syncWorker.replayPendingEvents(this.lastHandshakeResponse);
      await this.refreshOutboxHealth();

      if (outcome.kind === 'error') {
        this.observer.logWarn(`Failed to replay outbox batch: ${outcome.message}`);
        if (
          this.effectiveSettings.retryConnectionAutomatically
          && isLikelyTransientReplayFailure(outcome.message)
        ) {
          this.consecutiveTransientReplayFailures += 1;
          if (this.consecutiveTransientReplayFailures < DELIVERY_REPLAY_TRANSIENT_FAILURE_THRESHOLD) {
            return;
          }
          this.consecutiveTransientReplayFailures = 0;
        }
        this.handleConnectionFailure('event delivery failed');
        return;
      }

      if (outcome.deliveredAt) {
        this.lastSuccessfulSendAt = outcome.deliveredAt;
      }
      this.consecutiveTransientReplayFailures = 0;

      this.setState('connected', 'Connected');
      this.publishStatus();
    } finally {
      this.flushing = false;
    }
  }

  private resetHeartbeatSchedule(): void {
    this.heartbeatHandle?.cancel();
    this.heartbeatHandle = undefined;

    if (this.disposed || !this.effectiveSettings.sendHeartbeatEvents) {
      return;
    }

    this.heartbeatHandle = this.scheduler.setInterval(() => {
      void this.emitHeartbeat();
    }, this.effectiveSettings.heartbeatIntervalSeconds * 1000);
  }

  private resetConnectionProbeSchedule(): void {
    this.connectionProbeHandle?.cancel();
    this.connectionProbeHandle = undefined;

    if (this.disposed) {
      return;
    }

    this.connectionProbeHandle = this.scheduler.setInterval(() => {
      void this.runConnectionProbe();
    }, CONNECTION_PROBE_INTERVAL_MS);
  }

  private async runConnectionProbe(): Promise<void> {
    if (this.disposed || this.state !== 'connected') {
      return;
    }

    try {
      await this.connectAndSync({
        silentWhenAlreadyConnected: true,
        failureReason: 'connection probe failed',
        suppressFailureTransition: true,
      });
    } catch {
      this.consecutiveProbeFailures += 1;
      if (this.consecutiveProbeFailures >= CONNECTION_PROBE_FAILURE_THRESHOLD) {
        this.consecutiveProbeFailures = 0;
        this.handleConnectionFailure('connection probe failed');
      }
    }
  }

  private handleConnectionFailure(reason: string): void {
    if (this.queueSize > 0 && this.effectiveSettings.bufferEventsWhenOffline) {
      this.setState('offline-buffering', `Buffered ${this.queueSize} event(s)`);
    } else if (this.effectiveSettings.retryConnectionAutomatically) {
      this.setState('retrying', reason);
    } else {
      this.setState('disconnected', reason);
    }

    this.scheduleRetryIfNeeded();
  }

  private scheduleRetryIfNeeded(): void {
    if (!this.effectiveSettings.retryConnectionAutomatically || this.disposed || this.retryHandle) {
      return;
    }

    const delayMs = this.retryDelayMs;
    this.retryDelayMs = Math.min(this.retryDelayMs * 2, MAX_RETRY_DELAY_MS);
    this.retryHandle = this.scheduler.setTimeout(() => {
      this.retryHandle = undefined;
      void this.connectAndSync().catch(() => {
        if (!this.disposed) {
          this.scheduleRetryIfNeeded();
        }
      });
    }, delayMs);
    this.setState(
      this.queueSize > 0 && this.effectiveSettings.bufferEventsWhenOffline ? 'offline-buffering' : 'retrying',
      `Retrying in ${Math.round(delayMs / 1000)}s`,
    );
  }

  private async refreshOutboxHealth(): Promise<void> {
    const health = await this.syncWorker.getOutboxHealth(this.effectiveSettings);
    this.queueSize = health.queueSize;
    this.applyOutboxLimitStatus(health.limitStatus);
  }

  private applyOutboxLimitStatus(nextStatus: OutboxLimitStatus): void {
    const previousState = this.outboxLimitStatus.thresholdState;
    this.outboxLimitStatus = nextStatus;
    if (previousState === nextStatus.thresholdState) {
      return;
    }

    switch (nextStatus.thresholdState) {
      case 'hard':
        this.observer.logWarn('Outbox hard cap reached; capture will pause until backlog drains');
        break;
      case 'warning':
        this.observer.logWarn('Outbox warning threshold reached');
        break;
      case 'soft':
        this.observer.logInfo('Outbox soft threshold reached');
        break;
      case 'normal':
      default:
        this.observer.logInfo('Outbox backlog returned below soft threshold');
        break;
    }
  }

  private get effectiveSettings(): ExtensionEffectiveSettings {
    return this.settingsMirror.getEffectiveSettings();
  }

  private setState(state: ConnectionState, detail: string): void {
    this.state = state;
    this.stateDetail = detail;
    this.publishStatus();
  }

  private publishStatus(): void {
    this.observer.updateStatus(this.createStatusSnapshot());
  }

  private createStatusSnapshot(): RuntimeStatusSnapshot {
    const now = this.environment.now();
    this.ensureTrackedDay(now);

    return {
      connectionState: this.state,
      displayState: this.getDisplayState(now),
      detail: this.stateDetail,
      todayTrackedMinutes: this.getTodayTrackedMinutes(now),
      trackingEnabled: this.effectiveSettings.trackingEnabled,
      queueSize: this.queueSize,
      focused: this.focused,
      trackOnlyWhenFocused: this.effectiveSettings.trackOnlyWhenFocused,
      bufferingEnabled: this.effectiveSettings.bufferEventsWhenOffline,
      heartbeatIntervalSeconds: this.effectiveSettings.heartbeatIntervalSeconds,
      filePathMode: this.effectiveSettings.filePathMode,
      machineName: this.environment.machine.machineName,
      editorVersion: this.environment.extension.editorVersion,
      extensionVersion: this.environment.extension.extensionVersion,
      lastHandshakeAt: this.lastHandshakeAt,
      lastSuccessfulSendAt: this.lastSuccessfulSendAt,
      lastEventAt: this.lastEventAt,
      outboxSizeBytes: this.outboxLimitStatus.estimatedSizeBytes,
      outboxThresholdState: this.outboxLimitStatus.thresholdState,
      captureBlockedByHardCap: this.outboxLimitStatus.captureBlockedByHardCap,
      outboxSoftThresholdBytes: this.outboxLimitStatus.thresholds.softThresholdBytes,
      outboxWarningThresholdBytes: this.outboxLimitStatus.thresholds.warningThresholdBytes,
      outboxHardCapBytes: this.outboxLimitStatus.thresholds.hardCapBytes,
    };
  }

  private getDisplayState(now: Date): StatusDisplayState {
    if (!this.effectiveSettings.trackingEnabled) {
      return 'tracking-disabled';
    }

    switch (this.state) {
      case 'connecting':
        return 'connecting';
      case 'retrying':
        return 'retrying';
      case 'offline-buffering':
        return 'buffering';
      case 'disconnected':
        return 'disconnected';
      case 'connected':
      default:
        return this.isActiveNow(now) ? 'active' : 'idle';
    }
  }

  private getTodayTrackedMinutes(now: Date): number {
    const effectiveMinutes = new Set(this.trackedMinuteKeys);
    if (this.isActiveNow(now) && this.lastTrackedActivityAt) {
      addMinuteKeysBetween(effectiveMinutes, this.lastTrackedActivityAt, now);
    }

    return effectiveMinutes.size;
  }

  private isActiveNow(now: Date): boolean {
    if (!this.lastTrackedActivityAt) {
      return false;
    }

    if (!this.activeContext?.filePath) {
      return false;
    }
    if (!this.activeContextKey || this.qualifiedContextKey !== this.activeContextKey) {
      return false;
    }

    if (toDateKey(this.lastTrackedActivityAt) !== toDateKey(now)) {
      return false;
    }

    return now.getTime() - this.lastTrackedActivityAt.getTime() <= this.getIdleThresholdMs();
  }

  private getIdleThresholdMs(): number {
    return Math.max(1, this.effectiveSettings.idleTimeoutMinutes) * 60 * 1000;
  }

  private recordTrackedActivity(eventType: ActivityEventType, at: Date): void {
    if (eventType !== 'edit') {
      return;
    }

    this.ensureTrackedDay(at);
    if (this.lastTrackedActivityAt && toDateKey(this.lastTrackedActivityAt) === this.trackedDateKey) {
      const gapMs = at.getTime() - this.lastTrackedActivityAt.getTime();
      if (gapMs >= 0 && gapMs <= this.getIdleThresholdMs()) {
        addMinuteKeysBetween(this.trackedMinuteKeys, this.lastTrackedActivityAt, at);
      } else {
        this.trackedMinuteKeys.add(toMinuteKey(at));
      }
    } else {
      this.trackedMinuteKeys.add(toMinuteKey(at));
    }

    this.lastTrackedActivityAt = at;
  }

  private ensureTrackedDay(at: Date): void {
    const dateKey = toDateKey(at);
    if (dateKey === this.trackedDateKey) {
      return;
    }

    this.trackedDateKey = dateKey;
    this.trackedMinuteKeys.clear();
    if (this.lastTrackedActivityAt && toDateKey(this.lastTrackedActivityAt) !== dateKey) {
      this.lastTrackedActivityAt = undefined;
    }
  }
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function formatBytes(bytes: number): string {
  const kibibyte = 1024;
  const mebibyte = kibibyte * 1024;
  if (bytes < kibibyte) {
    return `${bytes} B`;
  }
  if (bytes < mebibyte) {
    return `${(bytes / kibibyte).toFixed(1)} KiB`;
  }
  return `${(bytes / mebibyte).toFixed(1)} MiB`;
}

function isLikelyTransientReplayFailure(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes('timed out')
    || normalized.includes('closed')
    || normalized.includes('connect failed')
    || normalized.includes('response type mismatch')
    || normalized.includes('malformed');
}

function addMinuteKeysBetween(target: Set<string>, start: Date, end: Date): void {
  const startMs = floorToMinute(start).getTime();
  const endMs = floorToMinute(end).getTime();
  const stepMs = 60 * 1000;

  for (let currentMs = Math.min(startMs, endMs); currentMs <= Math.max(startMs, endMs); currentMs += stepMs) {
    target.add(toMinuteKey(new Date(currentMs)));
  }
}

function floorToMinute(date: Date): Date {
  const floored = new Date(date);
  floored.setSeconds(0, 0);
  return floored;
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
}

function toMinuteKey(date: Date): string {
  return `${toDateKey(date)}T${padNumber(date.getHours())}:${padNumber(date.getMinutes())}`;
}

function padNumber(value: number): string {
  return String(value).padStart(2, '0');
}

function getContextKey(context?: EditorContext): string | undefined {
  if (!context) {
    return undefined;
  }
  return `${context.workspaceId}::${context.projectName}::${context.language}::${context.filePath ?? ''}`;
}
