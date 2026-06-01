/// <reference path="./globals.d.ts" />
// @kairos-version: 0.1.0

// Single-file Fresh plugin — no imports so Fresh's bundler has nothing to resolve.

const EXTENSION_VERSION = '0.1.0';

// Candidate paths tried in order. getConfigDir() is the most reliable since
// it's absolute and doesn't depend on launchd PATH. The bare name is a fallback
// for shells where ~/.local/bin is on PATH.
const BRIDGE_CANDIDATES = [
  '/usr/local/bin/kairos-fresh-bridge',   // always in macOS launchd PATH
  editor.getConfigDir() + '/kairos-fresh-bridge', // fallback: Fresh config dir
];

// --- Inlined utilities ---

function extname(path: string): string {
  const dot = path.lastIndexOf('.');
  const slash = Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\'));
  return dot > slash && dot !== -1 ? path.slice(dot) : '';
}

const EXT_TO_LANGUAGE: Record<string, string> = {
  '.ts': 'typescript', '.tsx': 'typescriptreact',
  '.js': 'javascript', '.jsx': 'javascriptreact',
  '.mjs': 'javascript', '.cjs': 'javascript',
  '.mts': 'typescript', '.cts': 'typescript',
  '.go': 'go', '.rs': 'rust', '.py': 'python', '.rb': 'ruby',
  '.java': 'java', '.kt': 'kotlin', '.swift': 'swift',
  '.c': 'c', '.cc': 'cpp', '.cpp': 'cpp', '.cxx': 'cpp',
  '.h': 'c', '.hpp': 'cpp', '.cs': 'csharp', '.php': 'php',
  '.html': 'html', '.htm': 'html', '.css': 'css',
  '.scss': 'scss', '.less': 'less',
  '.json': 'json', '.jsonc': 'jsonc',
  '.yaml': 'yaml', '.yml': 'yaml', '.toml': 'toml',
  '.md': 'markdown', '.mdx': 'mdx',
  '.sh': 'shellscript', '.bash': 'shellscript',
  '.zsh': 'shellscript', '.fish': 'shellscript',
  '.lua': 'lua', '.vim': 'vim', '.sql': 'sql',
  '.graphql': 'graphql', '.gql': 'graphql',
  '.tf': 'terraform', '.tfvars': 'terraform',
  '.proto': 'protobuf', '.dart': 'dart', '.elm': 'elm',
  '.ex': 'elixir', '.exs': 'elixir',
  '.erl': 'erlang', '.hrl': 'erlang',
  '.hs': 'haskell', '.ml': 'ocaml', '.mli': 'ocaml',
  '.clj': 'clojure', '.cljs': 'clojurescript',
  '.r': 'r', '.R': 'r', '.scala': 'scala',
  '.nix': 'nix', '.zig': 'zig',
};

function languageFromExtension(ext: string): string {
  return EXT_TO_LANGUAGE[ext] ?? 'unknown';
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof (crypto as { randomUUID?: () => string }).randomUUID === 'function') {
    return (crypto as { randomUUID: () => string }).randomUUID();
  }
  return `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

function getWindowRoot(): string {
  const winId = editor.activeWindow();
  const windows = editor.listWindows();
  const win = windows.find((w) => w.id === winId);
  return win?.root ?? '';
}

const HEARTBEAT_MS = 30_000;

// --- State ---

let activeBufferId: number | undefined;
// Tracks the last time an event was emitted per buffer. Used to:
// - suppress the very first open event until the buffer is confirmed active
// - emit heartbeats every HEARTBEAT_MS while the user stays in the same file
const lastEmitByBuffer = new Map<number, number>();

// --- Core ---

async function spawnBridge(args: string[]): Promise<boolean> {
  for (const bin of BRIDGE_CANDIDATES) {
    try {
      await editor.spawnProcess(bin, args);
      return true;
    } catch {
      // try next candidate
    }
  }
  editor.warn(`kairos: bridge not found. Tried: ${BRIDGE_CANDIDATES.join(', ')}`);
  return false;
}

async function recordEvent(eventType: string, filePath: string): Promise<void> {
  if (!filePath) return;
  const cwd = getWindowRoot();
  const projectName = cwd.split('/').filter(Boolean).pop() ?? 'unknown';
  const ev = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    eventType,
    machineId: '',
    workspaceId: cwd,
    projectName,
    language: languageFromExtension(extname(filePath)),
    filePath,
  };
  await spawnBridge(['record', JSON.stringify(ev)]);
}

function shouldEmit(bufferId: number): boolean {
  const last = lastEmitByBuffer.get(bufferId);
  return last === undefined || Date.now() - last >= HEARTBEAT_MS;
}

function markEmitted(bufferId: number): void {
  lastEmitByBuffer.set(bufferId, Date.now());
}

// --- Event handlers (global functions referenced by name) ---

globalThis.kairosHandleBufferSave = function (data: BufferSaveEvent) {
  // Saves always emit regardless of heartbeat interval.
  void recordEvent('save', data.path);
};

globalThis.kairosHandleBufferModified = function (data: BufferModifiedEvent) {
  if (!shouldEmit(data.buffer_id)) return;
  const path = editor.getBufferPath(data.buffer_id);
  if (!path) return;
  const isFirst = !lastEmitByBuffer.has(data.buffer_id);
  markEmitted(data.buffer_id);
  void recordEvent(isFirst ? 'edit' : 'heartbeat', path);
};

globalThis.kairosHandleCursorMoved = function (data: CursorMovedEvent) {
  const bufferChanged = data.buffer_id !== activeBufferId;
  activeBufferId = data.buffer_id;

  if (!shouldEmit(data.buffer_id)) return;
  const path = editor.getBufferPath(data.buffer_id);
  if (!path) return;
  markEmitted(data.buffer_id);
  void recordEvent(bufferChanged ? 'open' : 'heartbeat', path);
};

globalThis.kairosShowStatus = async function () {
  const ok = await spawnBridge(['status']);
  editor.setStatus(ok ? 'Kairos: status logged' : 'Kairos: bridge not found');
};

globalThis.kairosReconnect = async function () {
  editor.setStatus('Kairos: next event will retry desktop connection');
};

// --- Registration ---

editor.on('buffer_save', 'kairosHandleBufferSave');
editor.on('buffer_modified', 'kairosHandleBufferModified');
editor.on('cursor_moved', 'kairosHandleCursorMoved');

editor.registerCommand('kairos_show_status', 'Show Kairos Desktop sync status', 'kairosShowStatus');
editor.registerCommand('kairos_reconnect', 'Reconnect to Kairos Desktop', 'kairosReconnect');
editor.registerCommand('kairos_version', `Kairos Fresh v${EXTENSION_VERSION}`, 'kairosShowStatus');

editor.setStatus(`Kairos v${EXTENSION_VERSION} active`);
editor.info(`kairos-fresh: plugin loaded. config dir: ${editor.getConfigDir()}. bridge candidates: ${BRIDGE_CANDIDATES.join(', ')}`);

// This is me testing kairos fdkjdkjvdf dskbsjbvsjcv uksvsuaf wurgbiuqwviuwf iuvwyggfv uwtyuigur This is me testing
