// Ambient declarations for the Fresh terminal IDE plugin API.
// Fresh exposes `editor` as a global object — there are no module imports.
// Plugins are loaded as .ts files directly by Fresh's QuickJS runtime.

type WindowInfo = {
  id: number;
  label: string;
  root: string;
};

type BufferSaveEvent = {
  path: string;
};

type BufferModifiedEvent = {
  buffer_id: number;
};

type CursorMovedEvent = {
  buffer_id: number;
  line: number;
  col: number;
};

type SpawnResult = {
  exit_code: number;
};

type BackgroundProcessResult = {
  process_id: number;
};

// Plugin handler functions placed on globalThis so Fresh can reference them
// by name when registering commands and event subscriptions.
declare var kairosHandleBufferSave: (data: BufferSaveEvent) => void;
declare var kairosHandleBufferModified: (data: BufferModifiedEvent) => void;
declare var kairosHandleCursorMoved: (data: CursorMovedEvent) => void;
declare var kairosShowStatus: () => Promise<void>;
declare var kairosReconnect: () => Promise<void>;

declare const editor: {
  // Command palette
  registerCommand(name: string, description: string, handlerName: string, context?: string): boolean;
  unregisterCommand(name: string): boolean;
  setContext(name: string, active: boolean): boolean;

  // Events — handlers must be global function names (strings)
  on(event: string, handlerName: string): boolean;
  off(event: string, handlerName: string): boolean;

  // Config paths
  getConfigDir(): string;

  // Status bar
  setStatus(message: string): void;

  // Buffer queries
  getActiveBufferId(): number;
  getBufferPath(bufferId: number): string;
  listBuffers(): Array<{ id: number; path?: string }>;

  // Window / session
  activeWindow(): number;
  listWindows(): WindowInfo[];

  // Process spawning
  spawnProcess(command: string, args: string[]): Promise<SpawnResult>;
  spawnBackgroundProcess(command: string, args: string[], cwd: string): Promise<BackgroundProcessResult>;
  isProcessRunning(processId: number): boolean;
  killProcess(processId: number): Promise<boolean>;
  delay(ms: number): Promise<void>;

  // Logging
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
  debug(message: string): void;
};
