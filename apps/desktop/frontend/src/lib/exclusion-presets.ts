import type { ExclusionsSettings } from '@/data/mockSettings';

export type SensitiveFilePreset = {
  id: string;
  label: string;
  value: string;
};

export const sensitiveFilePresets: SensitiveFilePreset[] = [
  { id: 'dotenv', label: '.env files', value: '.env' },
  { id: 'private-key', label: 'Private keys (.key)', value: '.key' },
  { id: 'cert-pem', label: 'Certificates (.pem)', value: '.pem' },
  { id: 'pkcs12', label: 'PKCS12 bundles (.p12)', value: '.p12' },
  { id: 'pfx', label: 'PFX bundles (.pfx)', value: '.pfx' },
  { id: 'ssh-rsa', label: 'SSH key (id_rsa)', value: 'id_rsa' },
  { id: 'ssh-ed25519', label: 'SSH key (id_ed25519)', value: 'id_ed25519' },
  { id: 'npmrc', label: 'NPM tokens (.npmrc)', value: '.npmrc' },
  { id: 'credentials-json', label: 'Credentials (credentials.json)', value: 'credentials.json' },
  { id: 'service-account-json', label: 'Service account (service-account.json)', value: 'service-account.json' },
];

function unique(items: string[]) {
  return [...new Set(items)];
}

export function isSensitiveFilePresetEnabled(
  exclusions: ExclusionsSettings,
  preset: SensitiveFilePreset,
): boolean {
  const candidate = preset.value.toLowerCase();
  return exclusions.fileExtensions.some((entry) => entry.trim().toLowerCase() === candidate);
}

export function withSensitiveFilePreset(
  exclusions: ExclusionsSettings,
  preset: SensitiveFilePreset,
  enabled: boolean,
): ExclusionsSettings {
  const normalizedTarget = preset.value.toLowerCase();
  const existing = exclusions.fileExtensions;
  const filtered = existing.filter((entry) => entry.trim().toLowerCase() !== normalizedTarget);

  return {
    ...exclusions,
    fileExtensions: enabled ? unique([...filtered, preset.value]) : filtered,
  };
}
