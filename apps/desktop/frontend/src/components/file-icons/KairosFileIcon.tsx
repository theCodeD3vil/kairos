import { resolveKairosFileIcon } from '@/lib/file-icons';
import { cn } from '@/lib/utils';

type KairosFileIconProps = {
  filename: string;
  size?: number;
  className?: string;
};

export function KairosFileIcon({
  filename,
  size = 16,
  className,
}: KairosFileIconProps) {
  const resolved = resolveKairosFileIcon(filename);

  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
      title={resolved.basename}
    >
      <img
        src={resolved.src}
        alt=""
        width={size}
        height={size}
        className="block shrink-0"
        loading="lazy"
      />
    </span>
  );
}
