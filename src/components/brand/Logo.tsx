/**
 * Brand mark: an open eye — presence without staring. Concentric iris rings
 * and quiet radial ticks, lids that don't quite close. Sage line on parchment.
 *
 * Geometry lives here and in `src/app/icon.svg` (simplified for the favicon).
 */

const CX = 60;
const CY = 44;

function rays(r0: number, r1: number, count: number) {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2;
    return {
      x1: CX + Math.cos(a) * r0,
      y1: CY + Math.sin(a) * r0,
      x2: CX + Math.cos(a) * r1,
      y2: CY + Math.sin(a) * r1,
    };
  });
}

const INNER_TICKS = rays(7.4, 16.6, 16);
const OUTER_RAYS = rays(19.2, 24, 8);

export function LogoMark({ className = "h-8 w-11" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 88" className={className} aria-hidden="true" fill="none">
      <g className="stroke-current" strokeLinecap="round" strokeLinejoin="round">
        <path d="M26 47C38 22 84 18 96 42" strokeWidth="3.1" />
        <path d="M22 49C36 74 88 76 100 46" strokeWidth="3.1" />
        <circle cx={CX} cy={CY} r="18.2" strokeWidth="2.2" />
        <circle cx={CX} cy={CY} r="12.2" strokeWidth="2" />
        <circle cx={CX} cy={CY} r="6.6" strokeWidth="2" />
        {INNER_TICKS.map((l, i) => (
          <line key={`in-${i}`} {...l} strokeWidth="1.7" />
        ))}
        {OUTER_RAYS.map((l, i) => (
          <line key={`out-${i}`} {...l} strokeWidth="2" />
        ))}
      </g>
      <circle cx={CX} cy={CY} r="3.3" className="fill-current" />
    </svg>
  );
}

function Wordmark({ stacked = false }: { stacked?: boolean }) {
  return (
    <span className={`inline-flex flex-col ${stacked ? "items-center" : "items-start"}`}>
      <span className="font-logo text-[0.95rem] leading-none text-current sm:text-base">Kairos</span>
      {stacked ? (
        <span className="mt-1.5 font-logo text-[0.58rem] tracking-[0.42em] text-current/80">Since 2026</span>
      ) : null}
    </span>
  );
}

export function Logo({
  className = "",
  compact = false,
  stacked = false,
}: {
  className?: string;
  compact?: boolean;
  stacked?: boolean;
}) {
  if (compact) {
    return (
      <span className={`inline-flex text-accent ${className}`}>
        <LogoMark className="h-8 w-11" />
      </span>
    );
  }

  if (stacked) {
    return (
      <span className={`inline-flex flex-col items-center gap-2.5 text-accent ${className}`}>
        <LogoMark className="h-[4.25rem] w-[5.8rem]" />
        <Wordmark stacked />
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2.5 text-accent ${className}`}>
      <LogoMark className="h-8 w-11" />
      <Wordmark />
    </span>
  );
}
