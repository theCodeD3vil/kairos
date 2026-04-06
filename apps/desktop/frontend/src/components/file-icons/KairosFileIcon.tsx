import { useEffect, useMemo, useState } from 'react';
import { FileIcon } from 'react-file-icon';
import { resolveKairosFileIcon, resolveKairosFileIconSync } from '@/lib/file-icons';
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
  const initialResolution = useMemo(() => resolveKairosFileIconSync(filename), [filename]);
  const [resolved, setResolved] = useState(initialResolution);

  useEffect(() => {
    let isDisposed = false;
    setResolved(initialResolution);

    if (initialResolution.resolutionSource !== 'fallback') {
      return () => {
        isDisposed = true;
      };
    }

    void resolveKairosFileIcon(filename).then((nextResolution) => {
      if (!isDisposed) {
        setResolved(nextResolution);
      }
    });

    return () => {
      isDisposed = true;
    };
  }, [filename, initialResolution]);

  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
      title={resolved.basename}
    >
      <FileIcon
        extension={resolved.extensionLabel}
        {...resolved.style}
        width={size}
        height={size}
      />
    </span>
  );
}
