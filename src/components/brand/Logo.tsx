/**
 * Brand mark: a thick open ring that brightens as it travels — washed indigo at
 * the base rising to light sage at the opening — with a terracotta satellite
 * resting in the gap and a deep-slate core at the centre.
 *
 * The open gap is a forgiving structure (no closed streak). The satellite is
 * the next small step, already in reach. The core is the one thing in front
 * of you.
 *
 * Geometry: 22-radius arc with a 90° gap centred on the top-right. Keep this
 * path in lockstep with `src/app/icon.svg`.
 */
const RING = "M 50.56 31.17 A 22 22 0 1 1 32.83 9.44";

export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="qf-ring-grad" x1="10" y1="54" x2="54" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#6B7A8F" />
          <stop offset="0.5" stopColor="#84A59D" />
          <stop offset="1" stopColor="#A8C0B9" />
        </linearGradient>
        <radialGradient id="qf-core-grad" cx="0.35" cy="0.3" r="1.1">
          <stop offset="0" stopColor="#46535f" />
          <stop offset="1" stopColor="#2C363F" />
        </radialGradient>
      </defs>
      {/* Parchment disc + hairline halo keep the mark legible on any surface. */}
      <circle cx="32" cy="32" r="30" className="fill-surface-raised" />
      <circle cx="32" cy="32" r="29.25" fill="none" stroke="#2C363F" strokeOpacity="0.08" strokeWidth="1.5" />
      <path d={RING} fill="none" stroke="url(#qf-ring-grad)" strokeWidth="7" strokeLinecap="round" />
      {/* Terracotta satellite in the gap: the next small step, already in reach. */}
      <circle cx="45.6" cy="17.1" r="3.1" fill="#E27D60" />
      <circle cx="32" cy="32" r="6" fill="url(#qf-core-grad)" />
      <circle cx="30.2" cy="30.2" r="1.5" fill="#F7F5F0" fillOpacity="0.55" />
    </svg>
  );
}

export function Logo({ className = "", compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark className="size-8" />
      {!compact ? <span className="font-display text-xl lowercase tracking-tight text-ink">kairos</span> : null}
    </span>
  );
}
