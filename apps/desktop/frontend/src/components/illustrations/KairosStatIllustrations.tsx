export function CodingOrbitIllustration() {
  return (
    <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label="Coding time orbit illustration">
      <circle cx="100" cy="100" r="52" fill="none" stroke="#0F4E57" strokeWidth="8" opacity="0.25" />
      <path d="M100 48 A52 52 0 0 1 142 70" fill="none" stroke="#EDF56F" strokeWidth="8" strokeLinecap="round" />
      <line x1="100" y1="100" x2="142" y2="70" stroke="#0F4E57" strokeWidth="6" strokeLinecap="round" />
      <circle cx="100" cy="100" r="7" fill="#0F4E57" />
      <circle cx="142" cy="70" r="7" fill="#EDF56F" />
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
            <rect x={bar.x + 2.5} y={activeY + 2.5} width="9" height={Math.max(6, activeH - 5)} rx="4.5" fill="#EDF56F" />
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
      <circle cx="100" cy="100" r="11" fill="#EDF56F" />
      <circle cx="108" cy="92" r="4" fill="#f8ffb4" />
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

      <circle cx="72" cy="100" r="8" fill="#EDF56F" />
      <circle cx="118" cy="66" r="6.5" fill="#EDF56F" />
      <circle cx="118" cy="100" r="6.5" fill="#EDF56F" />
      <circle cx="118" cy="134" r="6.5" fill="#EDF56F" />

      <path d="M162 57 L174 66 L162 75" fill="none" stroke="#0F4E57" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M162 91 L174 100 L162 109" fill="none" stroke="#0F4E57" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M162 125 L174 134 L162 143" fill="none" stroke="#0F4E57" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
