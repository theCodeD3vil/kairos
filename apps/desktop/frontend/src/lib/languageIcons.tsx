import { FileIcon } from 'react-files-icons';

export function languageToFileIconName(language?: string | null) {
  if (!language) return 'file';
  const normalized = language.trim().toLowerCase();
  const extByLang: Record<string, string> = {
    javascript: 'js',
    js: 'js',
    typescript: 'ts',
    ts: 'ts',
    typescriptreact: 'tsx',
    tsx: 'tsx',
    go: 'go',
    golang: 'go',
    rust: 'rs',
    python: 'py',
    py: 'py',
    sql: 'sql',
    postgres: 'sql',
    markdown: 'md',
    md: 'md',
    mdc: 'md',
    plaintext: 'txt',
    text: 'txt',
    txt: 'txt',
    yaml: 'yml',
    yml: 'yml',
    json: 'json',
    css: 'css',
  };
  // Prefer explicit mapping for common/ambiguous labels; otherwise rely on react-files-icons'
  // broad language pack (covers 200+ languages/frameworks) by passing through the normalized name.
  const ext = extByLang[normalized];
  if (ext) return `language.${ext}`;
  return `language.${normalized || 'file'}`;
}

export function LanguageIcon({ language, size = 16 }: { language?: string | null; size?: number }) {
  return <FileIcon name={languageToFileIconName(language)} width={size} height={size} />;
}
