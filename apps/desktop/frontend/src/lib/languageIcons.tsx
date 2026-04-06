import { KairosFileIcon } from '@/components/file-icons/KairosFileIcon';
import { cn } from '@/lib/utils';
import { resolveKairosLanguageIcon } from '@/lib/file-icons';

export function LanguageIcon({
  language,
  size = 16,
  className,
}: {
  language?: string | null;
  size?: number;
  className?: string;
}) {
  const resolved = resolveKairosLanguageIcon(language);

  if (!resolved.isFallback) {
    return (
      <span
        className={cn('inline-flex shrink-0 items-center justify-center', className)}
        style={{ width: size, height: size }}
        aria-hidden="true"
        title={language ?? resolved.basename}
      >
        <img src={resolved.src} alt="" width={size} height={size} className="block shrink-0" />
      </span>
    );
  }

  return <KairosFileIcon filename={language ?? 'file.txt'} size={size} className={className} />;
}
