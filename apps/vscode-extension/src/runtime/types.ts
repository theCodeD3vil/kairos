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
  observer: RuntimeObserver;
  scheduler: RuntimeScheduler;
  environment: RuntimeEnvironment;
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
  extensionVersion?: string;
  lastHandshakeAt?: string;
  lastSuccessfulSendAt?: string;
  lastEventAt?: string;
};

export type PendingBatch = {
  machine: MachineInfo;
  extension: ExtensionInfo;
  events: ActivityEvent[];
};
