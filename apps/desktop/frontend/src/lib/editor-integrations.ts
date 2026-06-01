import type { EditorIntegrationStatus } from '@/data/mockSettings';

type ExtensionStatusLike = {
  installed?: boolean;
  connected?: boolean;
  editor?: string;
  extensionVersion?: string;
  lastHandshakeAt?: string;
  lastEventAt?: string;
};

type EditorIntegrationSource = {
  extensionStatus?: ExtensionStatusLike;
  extensionStatuses?: ExtensionStatusLike[] | null;
};

const preferredEditorOrder = ['vscode', 'fresh'];

export function editorDisplayName(editor?: string): string {
  const normalized = (editor ?? '').trim().toLowerCase();
  if (normalized === 'vscode') {
    return 'VS Code';
  }
  if (normalized === 'fresh') {
    return 'Fresh';
  }
  return editor?.trim() || 'Unknown editor';
}

function normalizeEditor(editor?: string): string {
  const normalized = (editor ?? '').trim().toLowerCase();
  return normalized || 'vscode';
}

function compareEditorStatuses(left: ExtensionStatusLike, right: ExtensionStatusLike): number {
  const leftEditor = normalizeEditor(left.editor);
  const rightEditor = normalizeEditor(right.editor);
  const leftIndex = preferredEditorOrder.indexOf(leftEditor);
  const rightIndex = preferredEditorOrder.indexOf(rightEditor);

  if (leftIndex !== -1 || rightIndex !== -1) {
    if (leftIndex === -1) {
      return 1;
    }
    if (rightIndex === -1) {
      return -1;
    }
    return leftIndex - rightIndex;
  }

  return editorDisplayName(leftEditor).localeCompare(editorDisplayName(rightEditor));
}

export function adaptEditorIntegrationStatuses(
  source: EditorIntegrationSource,
  formatDate: (value?: string) => string,
): EditorIntegrationStatus[] {
  const statusesByEditor = new Map<string, ExtensionStatusLike>();

  const addStatus = (status?: ExtensionStatusLike) => {
    if (!status) {
      return;
    }
    const editor = normalizeEditor(status.editor);
    statusesByEditor.set(editor, { ...status, editor });
  };

  addStatus(source.extensionStatus);
  source.extensionStatuses?.forEach(addStatus);

  for (const editor of preferredEditorOrder) {
    if (!statusesByEditor.has(editor)) {
      statusesByEditor.set(editor, { editor, installed: false, connected: false });
    }
  }

  return [...statusesByEditor.values()].sort(compareEditorStatuses).map((status) => {
    const editor = normalizeEditor(status.editor);
    return {
      editor,
      label: editorDisplayName(editor),
      installed: Boolean(status.installed),
      connected: Boolean(status.connected),
      extensionVersion: status.extensionVersion ?? '—',
      lastExtensionSync: formatDate(status.lastHandshakeAt),
      lastExtensionEvent: formatDate(status.lastEventAt),
      lastEventAtRaw: status.lastEventAt,
    };
  });
}
