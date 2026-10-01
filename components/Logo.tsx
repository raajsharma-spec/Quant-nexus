/** The Quantum Nexus mark: a qubit wire passing through a gate. */
export function LogoMark({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <defs>
        <linearGradient id="qn-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#5ad7f0" />
          <stop offset="55%" stopColor="#6394ff" />
          <stop offset="100%" stopColor="#a892ff" />
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="30" height="30" rx="9" fill="#0b1124" stroke="url(#qn-mark)" strokeWidth="1.5" />
      <path d="M5 16h6M21 16h6" stroke="url(#qn-mark)" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="16" r="5.2" fill="none" stroke="url(#qn-mark)" strokeWidth="2" />
      <circle cx="16" cy="16" r="1.7" fill="#e9edfb" />
    </svg>
  );
}

export function Wordmark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="leading-none">
        <span className="block whitespace-nowrap text-[0.95rem] font-semibold tracking-[0.16em]">QUANTUM NEXUS</span>
        {!compact && (
          <span className="mt-1 block whitespace-nowrap text-[0.64rem] text-mute">From Confusion to Quantum Clarity</span>
        )}
      </span>
    </span>
  );
}
