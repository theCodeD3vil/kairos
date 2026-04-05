export type MachineInfo = {
  machineName: string;
  machineId: string;
  hostname: string;
  os: string;
  osVersion: string;
  architecture: string;
  editorName: string;
  editorVersion: string;
  extensionVersion: string;
  lastSeenAt: string;
};

export type AppStatus = {
  appVersion: string;
  trackingEnabled: boolean;
  localOnlyMode: boolean;
  lastUpdatedAt: string;
};

export type SystemInfoSnapshot = {
  currentMachine: MachineInfo;
  knownMachines: MachineInfo[];
  appStatus: AppStatus;
};

export const systemInfoSnapshot: SystemInfoSnapshot = {
  currentMachine: {
    machineName: 'Kairos-MacBook-Pro',
    machineId: 'mac_01_hx7a2',
    hostname: 'kairos-dev.local',
    os: 'macOS',
    osVersion: '14.6',
    architecture: 'arm64',
    editorName: 'VS Code',
    editorVersion: '1.102.0',
    extensionVersion: '0.9.0-mock',
    lastSeenAt: 'Today 14:26',
  },
  knownMachines: [
    {
      machineName: 'Kairos-MacBook-Pro',
      machineId: 'mac_01_hx7a2',
      hostname: 'kairos-dev.local',
      os: 'macOS',
      osVersion: '14.6',
      architecture: 'arm64',
      editorName: 'VS Code',
      editorVersion: '1.102.0',
      extensionVersion: '0.9.0-mock',
      lastSeenAt: 'Today 14:26',
    },
    {
      machineName: 'Kairos-ThinkPad',
      machineId: 'linux_02_qm91',
      hostname: 'kairos-lab.local',
      os: 'Ubuntu',
      osVersion: '24.04',
      architecture: 'x86_64',
      editorName: 'VS Code',
      editorVersion: '1.101.2',
      extensionVersion: '0.8.9-mock',
      lastSeenAt: 'Yesterday 18:12',
    },
  ],
  appStatus: {
    appVersion: '0.16.0-mock',
    trackingEnabled: true,
    localOnlyMode: true,
    lastUpdatedAt: 'Today 14:28',
  },
};

