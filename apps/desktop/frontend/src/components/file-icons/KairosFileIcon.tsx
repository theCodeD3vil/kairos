import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { resolveKairosFileIcon, resolveKairosFileIconSync } from '@/lib/file-icons';

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
      className={cn('inline-flex shrink-0 items-center justify-center overflow-hidden', className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
      title={resolved.basename}
    >
      <i
        className={cn('kairos-file-icon', resolved.className)}
        style={{
          transform: `scale(${size / 16})`,
          transformOrigin: 'center',
        }}
      />
    </span>
  );
}
