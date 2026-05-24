import { useEffect, useState } from 'react';

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function format(date: Date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function LiveClock({ className }: { className?: string }) {
  const [now, setNow] = useState(() => format(new Date()));

  useEffect(() => {
    const id = window.setInterval(() => setNow(format(new Date())), 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className={className} aria-live="off">
      [ LOCAL TIME: {now} ]
    </span>
  );
}
