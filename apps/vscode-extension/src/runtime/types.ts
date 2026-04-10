import type {
  ActivityEvent,
  ExtensionInfo,
  IngestEventsRequest,
  IngestEventsResponse,
  MachineInfo,
} from '@kairos/shared/ingestion';
import type {
  ExtensionEffectiveSettings,
  ExtensionHandshakeRequest,
  ExtensionHandshakeResponse,
} from '@kairos/shared/settings';
import type { OutboxThresholdState } from './outbox-limits';
import type { OutboxStorageHandle } from './storage';

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'retrying' | 'offline-buffering';
export type StatusDisplayState =
  | 'active'
  | 'idle'
  | 'tracking-disabled'
  | 'disconnected'
  | 'buffering'
  | 'connecting'
  | 'retrying';

export type EditorContext = {
  workspaceId: string;
  projectName: string;
  language: string;
  filePath?: string;
  gitBranch?: string;
};

export interface DesktopClient {
  handshake(request: ExtensionHandshakeRequest): Promise<ExtensionHandshakeResponse>;
  ingestEvents(request: IngestEventsRequest): Promise<IngestEventsResponse>;
}

export interface RuntimeObserver {
  logInfo(message: string): void;
  logWarn(message: string): void;
  logError(message: string): void;
  updateStatus(snapshot: RuntimeStatusSnapshot): void;
}

export interface RuntimeSchedulerHandle {
  cancel(): void;
}

export interface RuntimeScheduler {
  setTimeout(callback: () => void, delayMs: number): RuntimeSchedulerHandle;
  setInterval(callback: () => void, intervalMs: number): RuntimeSchedulerHandle;
}

export interface RuntimeEnvironment {
  now(): Date;
  randomID(): string;
  machine: MachineInfo;
  extension: ExtensionInfo;
}

export type RuntimeOptions = {
  client: DesktopClient;
  storage: OutboxStorageHandle;
  observer: RuntimeObserver;
  scheduler: RuntimeScheduler;
  environment: RuntimeEnvironment;
  installationID: string;
  initialSettings?: ExtensionEffectiveSettings;
};

export type RuntimeStatusSnapshot = {
  connectionState: ConnectionState;
  displayState: StatusDisplayState;
  detail: string;
  todayTrackedMinutes: number;
  trackingEnabled: boolean;
  queueSize: number;
  focused: boolean;
  trackOnlyWhenFocused: boolean;
  bufferingEnabled: boolean;
  heartbeatIntervalSeconds: number;
  filePathMode: ExtensionEffectiveSettings['filePathMode'];
  machineName: string;
  editorVersion?: string;
  extensionVersion?: string;
  lastHandshakeAt?: string;
  lastSuccessfulSendAt?: string;
  lastEventAt?: string;
  outboxSizeBytes: number;
  outboxThresholdState: OutboxThresholdState;
  captureBlockedByHardCap: boolean;
  outboxSoftThresholdBytes: number;
  outboxWarningThresholdBytes: number;
  outboxHardCapBytes: number;
};

export type PendingBatch = {
  machine: MachineInfo;
  extension: ExtensionInfo;
  events: ActivityEvent[];
};
