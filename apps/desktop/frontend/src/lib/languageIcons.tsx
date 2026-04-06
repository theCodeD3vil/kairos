import { KairosFileIcon } from '@/components/file-icons/KairosFileIcon';
import { representativeFilenameForLanguage } from '@/lib/file-icons';

export function LanguageIcon({
  language,
  size = 16,
  className,
}: {
  language?: string | null;
  size?: number;
  className?: string;
}) {
  return (
    <KairosFileIcon
      filename={representativeFilenameForLanguage(language)}
      size={size}
      className={className}
    />
  );
}
