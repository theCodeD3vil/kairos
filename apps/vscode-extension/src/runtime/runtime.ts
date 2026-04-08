import type { ActivityEvent, ActivityEventType } from '@kairos/shared/ingestion';
import type { ExtensionEffectiveSettings } from '@kairos/shared/settings';

import {
  INITIAL_RETRY_DELAY_MS,
  MAX_BATCH_SIZE,
  MAX_BUFFERED_EVENTS,
  MAX_RETRY_DELAY_MS,
} from './constants';
import {
  createActivityEvent,
  getDefaultEffectiveSettings,
  isCodingContext,
  isExcludedContext,
  sanitizeEffectiveSettings,
  sanitizeMachine,
  shapeContextForEmission,
  shouldEmitEvent,
} from './filters';
import type {
  ConnectionState,
  DesktopClient,
  EditorContext,
  PendingBatch,
  RuntimeObserver,
  RuntimeOptions,
  RuntimeSchedulerHandle,
  RuntimeStatusSnapshot,
  StatusDisplayState,
} from './types';

const FILE_DWELL_THRESHOLD_MS = 15_000;

export class KairosRuntime {
  private readonly client: DesktopClient;
  private readonly observer: RuntimeObserver;
  private readonly scheduler: RuntimeOptions['scheduler'];
  private readonly environment: RuntimeOptions['environment'];

  private settings: ExtensionEffectiveSettings;
  private state: ConnectionState = 'disconnected';
  private focused = true;
  private activeContext?: EditorContext;
  private pendingEvents: ActivityEvent[] = [];
  private flushing = false;
  private disposed = false;
  private heartbeatHandle?: RuntimeSchedulerHandle;
  private retryHandle?: RuntimeSchedulerHandle;
  private dwellHandle?: RuntimeSchedulerHandle;
  private retryDelayMs = INITIAL_RETRY_DELAY_MS;
  private stateDetail = 'Disconnected';
  private trackedMinuteKeys = new Set<string>();
  private trackedDateKey: string;
  private lastTrackedActivityAt?: Date;
  private lastHandshakeAt?: string;
  private lastSuccessfulSendAt?: string;
  private lastEventAt?: string;
  private activeContextKey?: string;
  private qualifiedContextKey?: string;

  constructor(options: RuntimeOptions) {
    this.client = options.client;
    this.observer = options.observer;
    this.scheduler = options.scheduler;
    this.environment = options.environment;
    this.settings = sanitizeEffectiveSettings(options.initialSettings ?? getDefaultEffectiveSettings());
    this.trackedDateKey = toDateKey(this.environment.now());
  }

  async start(): Promise<void> {
    try {
      await this.connectAndSync();
    } catch {
      // Initial activation should degrade gracefully when the desktop app is unavailable.
    }
  }

  dispose(): void {
    this.disposed = true;
    this.heartbeatHandle?.cancel();
    this.retryHandle?.cancel();
    this.dwellHandle?.cancel();
  }

  getConnectionState(): ConnectionState {
    return this.state;
  }

  getBufferedEventCount(): number {
    return this.pendingEvents.length;
  }

  getSettings(): ExtensionEffectiveSettings {
    return this.settings;
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

  private async connectAndSync(): Promise<void> {
    if (this.disposed) {
      return;
    }

    this.setState('connecting', 'Connecting');

    try {
      const response = await this.client.handshake({
        machine: this.environment.machine,
        extension: this.environment.extension,
      });
      this.settings = sanitizeEffectiveSettings(response.settings);
      this.lastHandshakeAt = response.serverTimestamp;
      this.retryDelayMs = INITIAL_RETRY_DELAY_MS;
      this.retryHandle?.cancel();
      this.retryHandle = undefined;
      this.setState('connected', 'Connected');
      this.observer.logInfo('Kairos desktop settings synchronized');
      this.resetHeartbeatSchedule();
      await this.flushQueue();
    } catch (error) {
      this.observer.logWarn(`Failed to synchronize with Kairos desktop: ${formatError(error)}`);
      this.resetHeartbeatSchedule();
      this.handleConnectionFailure('handshake failed');
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

    const decision = shouldEmitEvent(eventType, this.settings, this.focused);
    if (!decision.allowed) {
      this.observer.logInfo(`Skipped ${eventType} event: ${decision.reason}`);
      return;
    }

    if (this.settings.respectDesktopExclusions && isExcludedContext(context, this.environment.machine, this.settings.exclusions)) {
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

    const shapedContext = shapeContextForEmission(context, this.settings);
    const event = createActivityEvent(
      eventType,
      shapedContext,
      sanitizeMachine(this.environment.machine, this.settings.sendMachineAttribution),
      this.environment.now(),
      this.environment.randomID(),
    );

    this.pendingEvents.push(event);
    this.lastEventAt = event.timestamp;
    this.enforceQueueBounds();
    if (this.state === 'connected' || this.settings.bufferEventsWhenOffline) {
      this.recordTrackedActivity(eventType, new Date(event.timestamp));
    }
    this.publishStatus();
    await this.flushQueueOrBuffer();
  }

  private async flushQueueOrBuffer(): Promise<void> {
    if (this.pendingEvents.length === 0) {
      return;
    }

    if (this.state !== 'connected') {
      if (this.settings.bufferEventsWhenOffline) {
        this.setState('offline-buffering', `Buffered ${this.pendingEvents.length} event(s)`);
        this.scheduleRetryIfNeeded();
        return;
      }

      const dropped = this.pendingEvents.length;
      this.pendingEvents = [];
      this.observer.logWarn(`Dropped ${dropped} event(s) because desktop is unavailable and buffering is disabled`);
      this.scheduleRetryIfNeeded();
      return;
    }

    await this.flushQueue();
  }

  private async flushQueue(): Promise<void> {
    if (this.flushing || this.pendingEvents.length === 0 || this.state !== 'connected' || this.disposed) {
      return;
    }

    this.flushing = true;
    try {
      while (this.pendingEvents.length > 0) {
        const batch = this.pendingEvents.slice(0, MAX_BATCH_SIZE);
        const request: PendingBatch = {
          machine: sanitizeMachine(this.environment.machine, this.settings.sendMachineAttribution),
          extension: this.environment.extension,
          events: batch,
        };

        try {
          const response = await this.client.ingestEvents(request);
          this.pendingEvents.splice(0, batch.length);
          this.lastSuccessfulSendAt = response.serverTimestamp;

          if (response.warnings?.length) {
            this.observer.logWarn(`Desktop warnings: ${response.warnings.join(' | ')}`);
          }

          if (response.acceptedCount !== batch.length || response.rejectedCount > 0) {
            this.observer.logWarn(
              `Ingestion batch result: accepted=${response.acceptedCount} rejected=${response.rejectedCount}`,
            );
          }
        } catch (error) {
          this.observer.logWarn(`Failed to send activity batch: ${formatError(error)}`);
          this.handleConnectionFailure('event delivery failed');
          return;
        }
      }

      this.setState('connected', 'Connected');
      this.publishStatus();
    } finally {
      this.flushing = false;
    }
  }

  private resetHeartbeatSchedule(): void {
    this.heartbeatHandle?.cancel();
    this.heartbeatHandle = undefined;

    if (this.disposed || !this.settings.sendHeartbeatEvents) {
      return;
    }

    this.heartbeatHandle = this.scheduler.setInterval(() => {
      void this.emitHeartbeat();
    }, this.settings.heartbeatIntervalSeconds * 1000);
  }

  private handleConnectionFailure(reason: string): void {
    if (this.pendingEvents.length > 0 && this.settings.bufferEventsWhenOffline) {
      this.setState('offline-buffering', `Buffered ${this.pendingEvents.length} event(s)`);
    } else if (this.settings.retryConnectionAutomatically) {
      this.setState('retrying', reason);
    } else {
      this.setState('disconnected', reason);
    }

    this.scheduleRetryIfNeeded();
  }

  private scheduleRetryIfNeeded(): void {
    if (!this.settings.retryConnectionAutomatically || this.disposed || this.retryHandle) {
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
    this.setState(this.pendingEvents.length > 0 && this.settings.bufferEventsWhenOffline ? 'offline-buffering' : 'retrying', `Retrying in ${Math.round(delayMs / 1000)}s`);
  }

  private enforceQueueBounds(): void {
    if (this.pendingEvents.length <= MAX_BUFFERED_EVENTS) {
      return;
    }

    const droppedCount = this.pendingEvents.length - MAX_BUFFERED_EVENTS;
    this.pendingEvents.splice(0, droppedCount);
    this.observer.logWarn(`Buffered event queue limit reached; dropped ${droppedCount} oldest event(s)`);
    this.publishStatus();
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
      trackingEnabled: this.settings.trackingEnabled,
      queueSize: this.pendingEvents.length,
      focused: this.focused,
      trackOnlyWhenFocused: this.settings.trackOnlyWhenFocused,
      bufferingEnabled: this.settings.bufferEventsWhenOffline,
      heartbeatIntervalSeconds: this.settings.heartbeatIntervalSeconds,
      filePathMode: this.settings.filePathMode,
      machineName: this.environment.machine.machineName,
      extensionVersion: this.environment.extension.extensionVersion,
      lastHandshakeAt: this.lastHandshakeAt,
      lastSuccessfulSendAt: this.lastSuccessfulSendAt,
      lastEventAt: this.lastEventAt,
    };
  }

  private getDisplayState(now: Date): StatusDisplayState {
    if (!this.settings.trackingEnabled) {
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
    return Math.max(1, this.settings.idleTimeoutMinutes) * 60 * 1000;
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
