import { describe, expect, it } from 'vitest';
import { adaptEditorIntegrationStatuses, editorDisplayName } from '@/lib/editor-integrations';

const noFormat = (v?: string) => v ?? '—';

describe('editorDisplayName', () => {
  it('maps vscode', () => {
    expect(editorDisplayName('vscode')).toBe('VS Code');
  });

  it('maps fresh', () => {
    expect(editorDisplayName('fresh')).toBe('Fresh');
  });

  it('trims and lowercases before matching', () => {
    expect(editorDisplayName('  VSCode  ')).toBe('VS Code');
    expect(editorDisplayName('FRESH')).toBe('Fresh');
  });

  it('returns raw value for unknown editors', () => {
    expect(editorDisplayName('neovim')).toBe('neovim');
  });

  it('returns Unknown editor for empty string', () => {
    expect(editorDisplayName('')).toBe('Unknown editor');
  });
});

describe('adaptEditorIntegrationStatuses', () => {
  it('always returns both vscode and fresh even when source is empty', () => {
    const result = adaptEditorIntegrationStatuses({}, noFormat);
    const editors = result.map((r) => r.editor);
    expect(editors).toContain('vscode');
    expect(editors).toContain('fresh');
  });

  it('vscode comes before fresh in the result order', () => {
    const result = adaptEditorIntegrationStatuses({}, noFormat);
    const vscodeIdx = result.findIndex((r) => r.editor === 'vscode');
    const freshIdx = result.findIndex((r) => r.editor === 'fresh');
    expect(vscodeIdx).toBeLessThan(freshIdx);
  });

  it('merges extensionStatus and extensionStatuses without duplicates', () => {
    const result = adaptEditorIntegrationStatuses(
      {
        extensionStatus: { editor: 'vscode', connected: true, extensionVersion: '1.0.0' },
        extensionStatuses: [
          { editor: 'vscode', connected: true, extensionVersion: '1.0.0' },
          { editor: 'fresh', connected: false, extensionVersion: '0.1.0' },
        ],
      },
      noFormat,
    );
    const vsCodeEntries = result.filter((r) => r.editor === 'vscode');
    expect(vsCodeEntries).toHaveLength(1);
  });

  it('reflects connected status from extensionStatuses for fresh', () => {
    const result = adaptEditorIntegrationStatuses(
      {
        extensionStatuses: [
          { editor: 'fresh', installed: true, connected: true, extensionVersion: '0.1.0' },
        ],
      },
      noFormat,
    );
    const fresh = result.find((r) => r.editor === 'fresh');
    expect(fresh?.connected).toBe(true);
    expect(fresh?.installed).toBe(true);
    expect(fresh?.extensionVersion).toBe('0.1.0');
  });

  it('marks fresh as not installed when absent from source', () => {
    const result = adaptEditorIntegrationStatuses(
      {
        extensionStatus: { editor: 'vscode', connected: true },
      },
      noFormat,
    );
    const fresh = result.find((r) => r.editor === 'fresh');
    expect(fresh?.installed).toBe(false);
    expect(fresh?.connected).toBe(false);
  });

  it('uses editorDisplayName as the label', () => {
    const result = adaptEditorIntegrationStatuses({}, noFormat);
    const vscode = result.find((r) => r.editor === 'vscode');
    const fresh = result.find((r) => r.editor === 'fresh');
    expect(vscode?.label).toBe('VS Code');
    expect(fresh?.label).toBe('Fresh');
  });

  it('formats dates via the provided formatter', () => {
    const result = adaptEditorIntegrationStatuses(
      {
        extensionStatuses: [
          {
            editor: 'vscode',
            connected: true,
            lastHandshakeAt: '2026-06-01T12:00:00Z',
            lastEventAt: '2026-06-01T11:00:00Z',
          },
        ],
      },
      (v) => (v ? `fmt:${v}` : '—'),
    );
    const vscode = result.find((r) => r.editor === 'vscode');
    expect(vscode?.lastExtensionSync).toBe('fmt:2026-06-01T12:00:00Z');
    expect(vscode?.lastExtensionEvent).toBe('fmt:2026-06-01T11:00:00Z');
  });

  it('falls back to dash for missing version and dates', () => {
    const result = adaptEditorIntegrationStatuses({}, noFormat);
    const fresh = result.find((r) => r.editor === 'fresh');
    expect(fresh?.extensionVersion).toBe('—');
    expect(fresh?.lastExtensionSync).toBe('—');
    expect(fresh?.lastExtensionEvent).toBe('—');
  });
});
