import crypto from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

import * as vscode from 'vscode';

import { HTTPDesktopClient } from './runtime/client';
import { KairosRuntime } from './runtime/runtime';
import type { ConnectionState, EditorContext, RuntimeObserver, RuntimeScheduler } from './runtime/types';

const MACHINE_ID_KEY = 'kairos.machineId';

let runtime: KairosRuntime | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const output = vscode.window.createOutputChannel('Kairos');
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.name = 'Kairos Status';
  statusBar.command = 'kairos.refreshSettings';
  statusBar.show();

  let lastLogLine = '';
  let lastLogAt = 0;

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
    updateStatus(state, detail) {
      statusBar.text = statusText(state);
      statusBar.tooltip = detail ? `Kairos: ${detail}` : 'Kairos';
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
        extensionVersion: context.extension.packageJSON.version as string | undefined,
      },
    },
  });

  const refreshCommand = vscode.commands.registerCommand('kairos.refreshSettings', async () => {
    if (!runtime) {
      return;
    }
    try {
      await runtime.refreshSettings();
      await vscode.window.showInformationMessage('Kairos settings refreshed from desktop');
    } catch (error) {
      observer.logError(`Manual settings refresh failed: ${formatError(error)}`);
      await vscode.window.showErrorMessage(`Kairos settings refresh failed: ${formatError(error)}`);
    }
  });

  context.subscriptions.push(output, statusBar, refreshCommand);

  await runtime.updateActiveEditor(toEditorContext(vscode.window.activeTextEditor?.document));
  await runtime.setWindowFocused(vscode.window.state.focused);
  await runtime.start();

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

function statusText(state: ConnectionState): string {
  switch (state) {
    case 'connected':
      return 'Kairos: Connected';
    case 'connecting':
      return 'Kairos: Connecting';
    case 'retrying':
      return 'Kairos: Retrying';
    case 'offline-buffering':
      return 'Kairos: Buffering';
    case 'disconnected':
    default:
      return 'Kairos: Disconnected';
  }
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
