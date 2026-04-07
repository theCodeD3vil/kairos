import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

import * as vscode from 'vscode';

import { HTTPDesktopClient } from './runtime/client';
import { KairosRuntime } from './runtime/runtime';
import type { EditorContext, RuntimeObserver, RuntimeScheduler, RuntimeStatusSnapshot } from './runtime/types';
import {
  buildStatusBarText,
  buildStatusBarTooltip,
  buildStatusSummary,
  getStatusBarActions,
  type StatusBarAction,
} from './statusbar';

const MACHINE_ID_KEY = 'kairos.machineId';
const STATUS_REFRESH_INTERVAL_MS = 15000;
const DESKTOP_BRIDGE_HOST = process.env.KAIROS_EXTENSION_BRIDGE_HOST ?? '127.0.0.1';
const parsedBridgePort = Number.parseInt(process.env.KAIROS_EXTENSION_BRIDGE_PORT ?? '42138', 10);
const DESKTOP_BRIDGE_PORT = Number.isFinite(parsedBridgePort) ? parsedBridgePort : 42138;

let runtime: KairosRuntime | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const output = vscode.window.createOutputChannel('Kairos');
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.name = 'Kairos Status';
  statusBar.command = 'kairos.statusAction';
  statusBar.show();
  const extensionVersion = context.extension.packageJSON.version as string | undefined;

  let lastLogLine = '';
  let lastLogAt = 0;
  let latestStatus: RuntimeStatusSnapshot | undefined;

  const observer: RuntimeObserver = {
    logInfo(message) {
      appendOutput(output, 'INFO', message);
    },
    logWarn(message) {
      appendOutput(output, 'WARN', message, { dedupe: true, dedupeWindowMs: 10000, lastLogAt, lastLogLine, update: updateLastLog });
    },
    logError(message) {
      appendOutput(output, 'ERROR', message, { dedupe: true, dedupeWindowMs: 10000, lastLogAt, lastLogLine, update: updateLastLog });
    },
    updateStatus(snapshot) {
      latestStatus = snapshot;
      renderStatusBar(statusBar, snapshot);
    },
  };

  function updateLastLog(line: string, at: number): void {
    lastLogLine = line;
    lastLogAt = at;
  }

  const scheduler: RuntimeScheduler = {
    setTimeout(callback, delayMs) {
      const handle = setTimeout(callback, delayMs);
      return {
        cancel() {
          clearTimeout(handle);
        },
      };
    },
    setInterval(callback, intervalMs) {
      const handle = setInterval(callback, intervalMs);
      return {
        cancel() {
          clearInterval(handle);
        },
      };
    },
  };

  const machineId = await ensureMachineID(context);
  runtime = new KairosRuntime({
    client: new HTTPDesktopClient(),
    observer,
    scheduler,
    environment: {
      now: () => new Date(),
      randomID: () => crypto.randomUUID(),
      machine: {
        machineId,
        machineName: os.hostname(),
        hostname: os.hostname(),
        osPlatform: mapPlatform(process.platform),
        osVersion: os.release(),
        arch: os.arch(),
      },
      extension: {
        editor: 'vscode',
        editorVersion: vscode.version,
        extensionVersion,
      },
    },
  });

  latestStatus = runtime.getStatusSnapshot();
  renderStatusBar(statusBar, latestStatus);

  const refreshCommand = vscode.commands.registerCommand('kairos.refreshSettings', async () => {
    if (!runtime) {
      return;
    }
    try {
      await runtime.refreshSettings();
      latestStatus = runtime.getStatusSnapshot();
      renderStatusBar(statusBar, latestStatus);
      await vscode.window.showInformationMessage('Kairos settings refreshed from desktop');
    } catch (error) {
      observer.logError(`Manual settings refresh failed: ${formatError(error)}`);
      await vscode.window.showErrorMessage(`Kairos settings refresh failed: ${formatError(error)}`);
    }
  });

  const reconnectCommand = vscode.commands.registerCommand('kairos.reconnectDesktop', async () => {
    if (!runtime) {
      return;
    }

    try {
      await runtime.refreshSettings();
      latestStatus = runtime.getStatusSnapshot();
      renderStatusBar(statusBar, latestStatus);
      await vscode.window.showInformationMessage('Kairos reconnected to the desktop app');
    } catch (error) {
      observer.logWarn(`Reconnect failed: ${formatError(error)}`);
      await vscode.window.showWarningMessage(`Kairos could not reconnect: ${formatError(error)}`);
    }
  });

  const showStatusCommand = vscode.commands.registerCommand('kairos.showStatus', async () => {
    if (!runtime) {
      return;
    }

    latestStatus = runtime.getStatusSnapshot();
    renderStatusBar(statusBar, latestStatus);
    await vscode.window.showInformationMessage(buildStatusSummary(latestStatus));
  });

  const showOutputCommand = vscode.commands.registerCommand('kairos.showOutput', () => {
    output.show(true);
  });

  const openDesktopCommand = vscode.commands.registerCommand('kairos.openDesktop', async () => {
    const launched = await tryOpenKairosDesktop();
    if (launched) {
      observer.logInfo('Open Kairos Desktop command dispatched');
      return;
    }

    observer.logWarn('Open Kairos Desktop is not available on this machine');
    await vscode.window.showInformationMessage(
      'Kairos Desktop could not be opened automatically. Start the desktop app manually, then use “Refresh Kairos Settings”.',
    );
  });

  const statusActionCommand = vscode.commands.registerCommand('kairos.statusAction', async () => {
    if (!runtime) {
      return;
    }

    latestStatus = runtime.getStatusSnapshot();
    renderStatusBar(statusBar, latestStatus);
    const choice = await vscode.window.showQuickPick(
      getStatusBarActions(latestStatus).map((item) => ({
        label: item.label,
        description: item.description,
        action: item.action,
      })),
      {
        title: 'Kairos',
        placeHolder: 'Choose a Kairos action',
      },
    );

    if (!choice) {
      return;
    }

    await runStatusAction(choice.action, {
      openDesktop: () => vscode.commands.executeCommand('kairos.openDesktop'),
      reconnect: () => vscode.commands.executeCommand('kairos.reconnectDesktop'),
      refresh: () => vscode.commands.executeCommand('kairos.refreshSettings'),
      showStatus: () => vscode.commands.executeCommand('kairos.showStatus'),
      showOutput: () => vscode.commands.executeCommand('kairos.showOutput'),
    });
  });

  const statusTicker = setInterval(() => {
    if (!runtime) {
      return;
    }

    latestStatus = runtime.getStatusSnapshot();
    renderStatusBar(statusBar, latestStatus);
  }, STATUS_REFRESH_INTERVAL_MS);

  context.subscriptions.push(
    output,
    statusBar,
    refreshCommand,
    reconnectCommand,
    showStatusCommand,
    showOutputCommand,
    openDesktopCommand,
    statusActionCommand,
    {
      dispose() {
        clearInterval(statusTicker);
      },
    },
  );

  await runtime.updateActiveEditor(toEditorContext(vscode.window.activeTextEditor?.document));
  await runtime.setWindowFocused(vscode.window.state.focused);
  await runtime.start();

  const desktopBridge = createDesktopBridgeServer({
    getSnapshot: () => runtime?.getStatusSnapshot(),
    reconnect: () => runtime?.refreshSettings(),
    logInfo: observer.logInfo,
    logWarn: observer.logWarn,
  });
  context.subscriptions.push(desktopBridge);

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      const editorContext = toEditorContext(editor?.document);
      runRuntimeTask(observer, 'update active editor', () => runtime?.updateActiveEditor(editorContext));
      if (editorContext) {
        runRuntimeTask(observer, 'record open event', () => runtime?.recordOpen(editorContext));
      }
    }),
    vscode.workspace.onDidSaveTextDocument((document) => {
      const editorContext = toEditorContext(document);
      if (editorContext) {
        runRuntimeTask(observer, 'record save event', () => runtime?.recordSave(editorContext));
      }
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      if (event.contentChanges.length === 0) {
        return;
      }
      const editorContext = toEditorContext(event.document);
      if (editorContext) {
        runRuntimeTask(observer, 'record edit event', () => runtime?.recordEdit(editorContext));
      }
    }),
    vscode.window.onDidChangeWindowState((state) => {
      runRuntimeTask(observer, 'update window focus', () => runtime?.setWindowFocused(state.focused));
    }),
    {
      dispose() {
        runtime?.dispose();
        runtime = undefined;
      },
    },
  );
}

function createDesktopBridgeServer(options: {
  getSnapshot: () => RuntimeStatusSnapshot | undefined;
  reconnect: () => Promise<void> | undefined;
  logInfo: (message: string) => void;
  logWarn: (message: string) => void;
}): vscode.Disposable {
  const server = http.createServer((request, response) => {
    void (async () => {
      response.setHeader('Content-Type', 'application/json');

      if (!request.url) {
        response.statusCode = 400;
        response.end(JSON.stringify({ error: 'missing request url' }));
        return;
      }

      if (request.url === '/health' && request.method === 'GET') {
        writeHealthResponse(response, options.getSnapshot());
        return;
      }

      if ((request.url === '/reconnect' || request.url === '/refresh') && request.method === 'POST') {
        try {
          await options.reconnect();
        } catch (error) {
          response.statusCode = 502;
          response.end(JSON.stringify({ error: formatError(error) }));
          return;
        }
        writeHealthResponse(response, options.getSnapshot());
        return;
      }

      response.statusCode = 404;
      response.end(JSON.stringify({ error: 'not found' }));
    })();
  });

  server.on('error', (error) => {
    options.logWarn(`Desktop bridge server error: ${formatError(error)}`);
  });

  server.listen(DESKTOP_BRIDGE_PORT, DESKTOP_BRIDGE_HOST, () => {
    options.logInfo(`Desktop bridge listening on ${DESKTOP_BRIDGE_HOST}:${DESKTOP_BRIDGE_PORT}`);
  });

  return new vscode.Disposable(() => {
    server.close();
  });
}

function writeHealthResponse(response: http.ServerResponse, snapshot: RuntimeStatusSnapshot | undefined): void {
  if (!snapshot) {
    response.statusCode = 503;
    response.end(JSON.stringify({ error: 'runtime unavailable' }));
    return;
  }

  response.statusCode = 200;
  response.end(JSON.stringify({
    connectionState: snapshot.connectionState,
    extensionVersion: snapshot.extensionVersion,
    lastHandshakeAt: snapshot.lastHandshakeAt,
    lastSuccessfulSendAt: snapshot.lastSuccessfulSendAt,
    lastEventAt: snapshot.lastEventAt,
  }));
}

export function deactivate(): void {
  runtime?.dispose();
  runtime = undefined;
}

async function ensureMachineID(context: vscode.ExtensionContext): Promise<string> {
  const existing = context.globalState.get<string>(MACHINE_ID_KEY);
  if (existing) {
    return existing;
  }

  const generated = crypto.randomUUID();
  await context.globalState.update(MACHINE_ID_KEY, generated);
  return generated;
}

function toEditorContext(document: vscode.TextDocument | undefined): EditorContext | undefined {
  if (!document) {
    return undefined;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
  const workspaceId = workspaceFolder?.uri.fsPath ?? fallbackWorkspaceID(document);
  const projectName = workspaceFolder?.name ?? fallbackProjectName(document, workspaceId);
  const filePath = document.uri.scheme === 'file' ? document.uri.fsPath : undefined;

  return {
    workspaceId,
    projectName,
    language: document.languageId || 'plaintext',
    filePath,
  };
}

function fallbackWorkspaceID(document: vscode.TextDocument): string {
  if (document.uri.scheme === 'file' && document.uri.fsPath) {
    return path.dirname(document.uri.fsPath);
  }
  return 'untitled-workspace';
}

function fallbackProjectName(document: vscode.TextDocument, workspaceID: string): string {
  if (document.uri.scheme === 'file' && document.uri.fsPath) {
    return path.basename(path.dirname(document.uri.fsPath));
  }
  return path.basename(workspaceID) || 'untitled-project';
}

function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function runRuntimeTask(
  observer: RuntimeObserver,
  label: string,
  task: () => Promise<void> | undefined,
): void {
  void Promise.resolve(task()).catch((error) => {
    observer.logWarn(`Runtime task failed during ${label}: ${formatError(error)}`);
  });
}

function appendOutput(
  output: vscode.OutputChannel,
  level: 'INFO' | 'WARN' | 'ERROR',
  message: string,
  options?: {
    dedupe: boolean;
    dedupeWindowMs: number;
    lastLogLine: string;
    lastLogAt: number;
    update: (line: string, at: number) => void;
  },
): void {
  const line = `[${level}] ${message}`;
  const now = Date.now();

  if (options?.dedupe && options.lastLogLine === line && now-options.lastLogAt < options.dedupeWindowMs) {
    return;
  }

  output.appendLine(line);
  options?.update(line, now);
}

function renderStatusBar(statusBar: vscode.StatusBarItem, snapshot: RuntimeStatusSnapshot): void {
  statusBar.text = buildStatusBarText(snapshot);
  const tooltip = new vscode.MarkdownString(buildStatusBarTooltip(snapshot), true);
  tooltip.supportThemeIcons = true;
  tooltip.isTrusted = false;
  statusBar.tooltip = tooltip;
}

async function runStatusAction(
  action: StatusBarAction,
  handlers: {
    openDesktop: () => Thenable<unknown>;
    reconnect: () => Thenable<unknown>;
    refresh: () => Thenable<unknown>;
    showStatus: () => Thenable<unknown>;
    showOutput: () => Thenable<unknown>;
  },
): Promise<void> {
  switch (action) {
    case 'open-desktop':
      await handlers.openDesktop();
      break;
    case 'reconnect-desktop':
      await handlers.reconnect();
      break;
    case 'show-status':
      await handlers.showStatus();
      break;
    case 'show-output':
      await handlers.showOutput();
      break;
    case 'refresh-settings':
    default:
      await handlers.refresh();
      break;
  }
}

async function tryOpenKairosDesktop(): Promise<boolean> {
  const candidates = getDesktopLaunchCandidates();
  for (const candidate of candidates) {
    const launched = await launchCommand(candidate.command, candidate.args);
    if (launched) {
      return true;
    }
  }

  return false;
}

function getDesktopLaunchCandidates(): Array<{ command: string; args: string[] }> {
  switch (process.platform) {
    case 'darwin':
      return [
        { command: 'open', args: ['-a', 'Kairos'] },
      ];
    case 'win32':
      return [
        { command: 'cmd', args: ['/c', 'start', '', 'Kairos'] },
      ];
    case 'linux':
      return [
        { command: 'gtk-launch', args: ['kairos'] },
        { command: 'xdg-open', args: ['kairos://desktop'] },
      ];
    default:
      return [];
  }
}

function launchCommand(command: string, args: string[]): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      detached: true,
      stdio: 'ignore',
    });

    let settled = false;
    child.once('error', () => {
      if (!settled) {
        settled = true;
        resolve(false);
      }
    });
    child.once('spawn', () => {
      child.unref();
      if (!settled) {
        settled = true;
        resolve(true);
      }
    });
  });
}

function mapPlatform(platform: NodeJS.Platform): 'darwin' | 'windows' | 'linux' {
  switch (platform) {
    case 'darwin':
      return 'darwin';
    case 'win32':
      return 'windows';
    default:
      return 'linux';
  }
}
