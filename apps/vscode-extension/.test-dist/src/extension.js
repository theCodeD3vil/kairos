"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_child_process_1 = require("node:child_process");
const node_os_1 = __importDefault(require("node:os"));
const vscode = __importStar(require("vscode"));
const client_1 = require("./runtime/client");
const runtime_1 = require("./runtime/runtime");
const storage_1 = require("./runtime/storage");
const statusbar_1 = require("./statusbar");
const MACHINE_ID_KEY = 'kairos.machineId';
const INSTALLATION_ID_KEY = 'kairos.installationId';
const STATUS_REFRESH_INTERVAL_MS = 15000;
const NO_WORKSPACE_SENTINEL = 'no-workspace';
let runtime;
async function activate(context) {
    const output = vscode.window.createOutputChannel('Kairos');
    const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBar.name = 'Kairos Status';
    statusBar.command = 'kairos.statusAction';
    statusBar.show();
    const extensionVersion = context.extension.packageJSON.version;
    let lastLogLine = '';
    let lastLogAt = 0;
    let latestStatus;
    const observer = {
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
    function updateLastLog(line, at) {
        lastLogLine = line;
        lastLogAt = at;
    }
    const scheduler = {
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
    const installationID = await ensureInstallationID(context);
    const outboxDatabasePath = (0, storage_1.resolveOutboxDatabasePath)({ context });
    const outboxStorage = await (0, storage_1.openOutboxStorage)({ databasePath: outboxDatabasePath });
    runtime = new runtime_1.KairosRuntime({
        client: new client_1.WebSocketDesktopClient(),
        storage: outboxStorage,
        observer,
        scheduler,
        environment: {
            now: () => new Date(),
            randomID: () => node_crypto_1.default.randomUUID(),
            machine: {
                machineId,
                machineName: node_os_1.default.hostname(),
                hostname: node_os_1.default.hostname(),
                osPlatform: mapPlatform(process.platform),
                osVersion: node_os_1.default.release(),
                arch: node_os_1.default.arch(),
            },
            extension: {
                editor: 'vscode',
                editorVersion: vscode.version,
                extensionVersion,
            },
        },
        installationID,
    });
    observer.logInfo(`Outbox storage initialized at ${outboxDatabasePath}`);
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
        }
        catch (error) {
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
        }
        catch (error) {
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
        await vscode.window.showInformationMessage((0, statusbar_1.buildStatusSummary)(latestStatus));
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
        await vscode.window.showInformationMessage('Kairos Desktop could not be opened automatically. Start the desktop app manually, then use “Refresh Kairos Settings”.');
    });
    const statusActionCommand = vscode.commands.registerCommand('kairos.statusAction', async () => {
        if (!runtime) {
            return;
        }
        latestStatus = runtime.getStatusSnapshot();
        renderStatusBar(statusBar, latestStatus);
        const choice = await vscode.window.showQuickPick((0, statusbar_1.getStatusBarActions)(latestStatus).map((item) => ({
            label: item.label,
            description: item.description,
            action: item.action,
        })), {
            title: 'Kairos',
            placeHolder: 'Choose a Kairos action',
        });
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
    context.subscriptions.push(output, statusBar, refreshCommand, reconnectCommand, showStatusCommand, showOutputCommand, openDesktopCommand, statusActionCommand, {
        dispose() {
            clearInterval(statusTicker);
        },
    }, {
        dispose() {
            void outboxStorage.close();
        },
    });
    await runtime.updateActiveEditor(toEditorContext(vscode.window.activeTextEditor?.document));
    await runtime.setWindowFocused(vscode.window.state.focused);
    await runtime.start();
    context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor((editor) => {
        const editorContext = toEditorContext(editor?.document);
        runRuntimeTask(observer, 'update active editor', () => runtime?.updateActiveEditor(editorContext));
        if (editorContext) {
            runRuntimeTask(observer, 'record open event', () => runtime?.recordOpen(editorContext));
        }
    }), vscode.workspace.onDidSaveTextDocument((document) => {
        const editorContext = toEditorContext(document);
        if (editorContext) {
            runRuntimeTask(observer, 'record save event', () => runtime?.recordSave(editorContext));
        }
    }), vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.contentChanges.length === 0) {
            return;
        }
        const editorContext = toEditorContext(event.document);
        if (editorContext) {
            runRuntimeTask(observer, 'record edit event', () => runtime?.recordEdit(editorContext));
        }
    }), vscode.window.onDidChangeWindowState((state) => {
        runRuntimeTask(observer, 'update window focus', () => runtime?.setWindowFocused(state.focused));
    }), {
        dispose() {
            runtime?.dispose();
            runtime = undefined;
        },
    });
}
function deactivate() {
    runtime?.dispose();
    runtime = undefined;
}
async function ensureMachineID(context) {
    const existing = context.globalState.get(MACHINE_ID_KEY);
    if (existing) {
        return existing;
    }
    const generated = node_crypto_1.default.randomUUID();
    await context.globalState.update(MACHINE_ID_KEY, generated);
    return generated;
}
async function ensureInstallationID(context) {
    const existing = context.globalState.get(INSTALLATION_ID_KEY);
    if (existing) {
        return existing;
    }
    const generated = node_crypto_1.default.randomUUID();
    await context.globalState.update(INSTALLATION_ID_KEY, generated);
    return generated;
}
function toEditorContext(document) {
    if (!document) {
        return undefined;
    }
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    const workspaceId = workspaceFolder?.uri.fsPath ?? fallbackWorkspaceID();
    const projectName = workspaceFolder?.name ?? fallbackProjectName();
    const filePath = document.uri.scheme === 'file' ? document.uri.fsPath : undefined;
    return {
        workspaceId,
        projectName,
        language: document.languageId || 'plaintext',
        filePath,
    };
}
function fallbackWorkspaceID() {
    const firstWorkspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (firstWorkspaceFolder) {
        return firstWorkspaceFolder.uri.fsPath;
    }
    return NO_WORKSPACE_SENTINEL;
}
function fallbackProjectName() {
    const firstWorkspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (firstWorkspaceFolder) {
        return firstWorkspaceFolder.name;
    }
    return NO_WORKSPACE_SENTINEL;
}
function formatError(error) {
    if (error instanceof Error) {
        return error.message;
    }
    return String(error);
}
function runRuntimeTask(observer, label, task) {
    void Promise.resolve(task()).catch((error) => {
        observer.logWarn(`Runtime task failed during ${label}: ${formatError(error)}`);
    });
}
function appendOutput(output, level, message, options) {
    const line = `[${level}] ${message}`;
    const now = Date.now();
    if (options?.dedupe && options.lastLogLine === line && now - options.lastLogAt < options.dedupeWindowMs) {
        return;
    }
    output.appendLine(line);
    options?.update(line, now);
}
function renderStatusBar(statusBar, snapshot) {
    statusBar.text = (0, statusbar_1.buildStatusBarText)(snapshot);
    const tooltip = new vscode.MarkdownString((0, statusbar_1.buildStatusBarTooltip)(snapshot), true);
    tooltip.supportThemeIcons = true;
    tooltip.isTrusted = false;
    statusBar.tooltip = tooltip;
}
async function runStatusAction(action, handlers) {
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
async function tryOpenKairosDesktop() {
    const candidates = getDesktopLaunchCandidates();
    for (const candidate of candidates) {
        const launched = await launchCommand(candidate.command, candidate.args);
        if (launched) {
            return true;
        }
    }
    return false;
}
function getDesktopLaunchCandidates() {
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
function launchCommand(command, args) {
    return new Promise((resolve) => {
        const child = (0, node_child_process_1.spawn)(command, args, {
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
function mapPlatform(platform) {
    switch (platform) {
        case 'darwin':
            return 'darwin';
        case 'win32':
            return 'windows';
        default:
            return 'linux';
    }
}
//# sourceMappingURL=extension.js.map