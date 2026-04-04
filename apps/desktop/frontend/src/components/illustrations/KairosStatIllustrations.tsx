export function CodingOrbitIllustration() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="Coding time orbit illustration">
      <circle cx="100" cy="100" r="52" fill="none" stroke="#0F4E57" strokeWidth="8" opacity="0.25" />
      <path d="M100 48 A52 52 0 0 1 142 70" fill="none" stroke="hsl(var(--secondary))" strokeWidth="8" strokeLinecap="round" />
      <line x1="100" y1="100" x2="142" y2="70" stroke="#0F4E57" strokeWidth="6" strokeLinecap="round" />
      <circle cx="100" cy="100" r="7" fill="#0F4E57" />
      <circle cx="142" cy="70" r="7" fill="hsl(var(--secondary))" />
      <line x1="100" y1="30" x2="100" y2="40" stroke="#0F4E57" strokeWidth="4" strokeLinecap="round" />
      <line x1="148" y1="52" x2="142" y2="60" stroke="#0F4E57" strokeWidth="4" strokeLinecap="round" />
      <line x1="170" y1="100" x2="160" y2="100" stroke="#0F4E57" strokeWidth="4" strokeLinecap="round" />
      <line x1="148" y1="148" x2="140" y2="142" stroke="#0F4E57" strokeWidth="4" strokeLinecap="round" />
      <line x1="100" y1="170" x2="100" y2="160" stroke="#0F4E57" strokeWidth="4" strokeLinecap="round" />
      <line x1="52" y1="148" x2="60" y2="142" stroke="#0F4E57" strokeWidth="4" strokeLinecap="round" />
      <line x1="30" y1="100" x2="40" y2="100" stroke="#0F4E57" strokeWidth="4" strokeLinecap="round" />
      <line x1="52" y1="52" x2="60" y2="60" stroke="#0F4E57" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export function WeeklyMomentumIllustration() {
  const bars = [
    { x: 20, h: 58, fill: 0.35 },
    { x: 43, h: 72, fill: 0.5 },
    { x: 66, h: 64, fill: 0.42 },
    { x: 89, h: 86, fill: 0.78 },
    { x: 112, h: 74, fill: 0.56 },
    { x: 135, h: 68, fill: 0.48 },
    { x: 158, h: 80, fill: 0.72 },
  ];

  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="Weekly coding momentum illustration">
      <path d="M20 166 C52 160, 84 170, 116 162 C146 154, 172 158, 180 152" fill="none" stroke="#0F4E57" strokeWidth="3" strokeLinecap="round" />
      {bars.map((bar, index) => {
        const y = 166 - bar.h;
        const activeH = bar.h * bar.fill;
        const activeY = 166 - activeH;

        return (
          <g key={`${bar.x}-${index}`}>
            <rect x={bar.x} y={y} width="14" height={bar.h} rx="7" fill="none" stroke="#0F4E57" strokeWidth="3" />
            <rect x={bar.x + 2.5} y={activeY + 2.5} width="9" height={Math.max(6, activeH - 5)} rx="4.5" fill="hsl(var(--secondary))" />
          </g>
        );
      })}
      <circle cx="27" cy="166" r="3.5" fill="#0F4E57" />
      <circle cx="50" cy="160" r="3.5" fill="#0F4E57" />
      <circle cx="73" cy="165" r="3.5" fill="#0F4E57" />
      <circle cx="96" cy="156" r="3.5" fill="#0F4E57" />
      <circle cx="119" cy="162" r="3.5" fill="#0F4E57" />
      <circle cx="142" cy="157" r="3.5" fill="#0F4E57" />
      <circle cx="165" cy="154" r="3.5" fill="#0F4E57" />
    </svg>
  );
}

export function FocusTunnelIllustration() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="Focus tunnel illustration">
      <path
        d="M 34 100 C 52 72, 76 58, 100 58 C 124 58, 148 72, 166 100 C 148 128, 124 142, 100 142 C 76 142, 52 128, 34 100 Z"
        fill="none"
        stroke="#0F4E57"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="100" cy="100" r="23" fill="#0F4E57" />
      <circle cx="100" cy="100" r="11" fill="hsl(var(--secondary))" />
      <circle cx="108" cy="92" r="4" fill="hsl(var(--secondary) / 0.65)" />
    </svg>
  );
}

export function ContextSwitchIllustration() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="Context switches network illustration">
      <rect x="0" y="0" width="200" height="200" fill="#e7edeb" rx="18" />

      <path d="M22 100 L72 100" stroke="#0F4E57" strokeWidth="5" strokeLinecap="round" />
      <path d="M72 100 L118 66" stroke="#0F4E57" strokeWidth="5" strokeLinecap="round" />
      <path d="M72 100 L118 100" stroke="#0F4E57" strokeWidth="5" strokeLinecap="round" />
      <path d="M72 100 L118 134" stroke="#0F4E57" strokeWidth="5" strokeLinecap="round" />
      <path d="M118 66 L174 66" stroke="#0F4E57" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M118 100 L174 100" stroke="#0F4E57" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M118 134 L174 134" stroke="#0F4E57" strokeWidth="4.5" strokeLinecap="round" />

      <circle cx="72" cy="100" r="8" fill="hsl(var(--secondary))" />
      <circle cx="118" cy="66" r="6.5" fill="hsl(var(--secondary))" />
      <circle cx="118" cy="100" r="6.5" fill="hsl(var(--secondary))" />
      <circle cx="118" cy="134" r="6.5" fill="hsl(var(--secondary))" />

      <path d="M162 57 L174 66 L162 75" fill="none" stroke="#0F4E57" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M162 91 L174 100 L162 109" fill="none" stroke="#0F4E57" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M162 125 L174 134 L162 143" fill="none" stroke="#0F4E57" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function SessionsTimelineIllustration() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="Sessions timeline illustration">
      <line x1="24" y1="136" x2="176" y2="136" stroke="#0F4E57" strokeWidth="6" strokeLinecap="round" />
      <rect x="32" y="100" width="20" height="36" rx="8" fill="#0F4E57" opacity="0.25" />
      <rect x="58" y="88" width="20" height="48" rx="8" fill="#0F4E57" opacity="0.35" />
      <rect x="84" y="74" width="20" height="62" rx="8" fill="hsl(var(--secondary))" />
      <rect x="110" y="92" width="20" height="44" rx="8" fill="#0F4E57" opacity="0.35" />
      <rect x="136" y="80" width="20" height="56" rx="8" fill="hsl(var(--secondary) / 0.85)" />
      <circle cx="94" cy="68" r="4" fill="#0F4E57" />
      <circle cx="146" cy="74" r="4" fill="#0F4E57" />
    </svg>
  );
}

export function AverageSessionBarsIllustration() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="Average session illustration">
      <line x1="28" y1="142" x2="172" y2="142" stroke="#0F4E57" strokeWidth="5" strokeLinecap="round" />
      <rect x="36" y="112" width="18" height="30" rx="6" fill="#0F4E57" opacity="0.35" />
      <rect x="62" y="98" width="18" height="44" rx="6" fill="#0F4E57" opacity="0.45" />
      <rect x="88" y="82" width="22" height="60" rx="7" fill="hsl(var(--secondary))" />
      <rect x="118" y="100" width="18" height="42" rx="6" fill="#0F4E57" opacity="0.45" />
      <rect x="144" y="108" width="18" height="34" rx="6" fill="#0F4E57" opacity="0.35" />
      <line x1="24" y1="82" x2="176" y2="82" stroke="#0F4E57" strokeWidth="3" strokeDasharray="6 6" opacity="0.6" />
    </svg>
  );
}
