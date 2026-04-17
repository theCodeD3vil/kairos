import { describe, expect, it } from 'vitest';
import {
  isSensitiveFilePresetEnabled,
  sensitiveFilePresets,
  withSensitiveFilePreset,
} from '@/lib/exclusion-presets';

const baseExclusions = {
  folders: [],
  projectNames: [],
  workspacePatterns: [],
  fileExtensions: [],
  machineNames: [],
};

describe('exclusion-presets', () => {
  it('enables a sensitive file preset by adding its exclusion suffix', () => {
    const dotenv = sensitiveFilePresets.find((preset) => preset.id === 'dotenv');
    expect(dotenv).toBeDefined();

    const next = withSensitiveFilePreset(baseExclusions, dotenv!, true);
    expect(next.fileExtensions).toContain('.env');
    expect(isSensitiveFilePresetEnabled(next, dotenv!)).toBe(true);
  });

  it('disables a sensitive file preset by removing matching entries case-insensitively', () => {
    const dotenv = sensitiveFilePresets.find((preset) => preset.id === 'dotenv');
    expect(dotenv).toBeDefined();

    const next = withSensitiveFilePreset(
      { ...baseExclusions, fileExtensions: ['.ENV', '.pem'] },
      dotenv!,
      false,
    );

    expect(next.fileExtensions).toEqual(['.pem']);
    expect(isSensitiveFilePresetEnabled(next, dotenv!)).toBe(false);
  });

  it('supports credentials filename presets', () => {
    const credentials = sensitiveFilePresets.find((preset) => preset.id === 'credentials-json');
    expect(credentials).toBeDefined();

    const enabled = withSensitiveFilePreset(baseExclusions, credentials!, true);
    expect(enabled.fileExtensions).toContain('credentials.json');
    expect(isSensitiveFilePresetEnabled(enabled, credentials!)).toBe(true);

    const disabled = withSensitiveFilePreset(
      { ...enabled, fileExtensions: ['CREDENTIALS.JSON', ...enabled.fileExtensions] },
      credentials!,
      false,
    );
    expect(disabled.fileExtensions).not.toContain('credentials.json');
    expect(disabled.fileExtensions).not.toContain('CREDENTIALS.JSON');
  });
});
