export type ActivityEventType = 'heartbeat' | 'edit' | 'save' | 'open' | 'focus' | 'blur';

export type OsPlatform = 'darwin' | 'windows' | 'linux';

export type ActivityEvent = {
  id: string;
  timestamp: string;
  eventType: ActivityEventType;
  machineId: string;
  workspaceId: string;
  projectName: string;
  language: string;
  filePath?: string;
  gitBranch?: string;
};

export type MachineInfo = {
  machineId: string;
  machineName: string;
  hostname?: string;
  osPlatform: OsPlatform;
  osVersion?: string;
  arch?: string;
};

export type ExtensionInfo = {
  editor: 'vscode';
  editorVersion?: string;
  extensionVersion?: string;
};

export type IngestEventsRequest = {
  machine: MachineInfo;
  extension: ExtensionInfo;
  events: ActivityEvent[];
};

export type IngestEventsResponse = {
  acceptedCount: number;
  rejectedCount: number;
  warnings?: string[];
  serverTimestamp: string;
};

export type IngestionStats = {
  totalAcceptedEvents: number;
  totalRejectedEvents: number;
  knownMachineCount: number;
  lastIngestedAt?: string;
  lastEventAt?: string;
  lastMachineSeen?: string;
};
