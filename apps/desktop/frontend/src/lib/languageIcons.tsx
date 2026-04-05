import { FileIcon } from 'react-files-icons';

export function languageToFileIconName(language?: string | null) {
  if (!language) return 'file';
  const normalized = language.trim().toLowerCase();
  const extByLang: Record<string, string> = {
    javascript: 'js',
    js: 'js',
    typescript: 'ts',
    ts: 'ts',
    go: 'go',
    golang: 'go',
    rust: 'rs',
    python: 'py',
    py: 'py',
    sql: 'sql',
    postgres: 'sql',
    markdown: 'md',
    md: 'md',
    yaml: 'yml',
    yml: 'yml',
    json: 'json',
    css: 'css',
  };
  const ext = extByLang[normalized] ?? 'txt';
  return `language.${ext}`;
}

export function LanguageIcon({ language, size = 16 }: { language?: string | null; size?: number }) {
  return <FileIcon name={languageToFileIconName(language)} width={size} height={size} />;
}
