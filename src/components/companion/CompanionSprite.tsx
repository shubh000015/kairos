import type { CompanionHue, Mood } from "@/store/useCompanionStore";

const HUES: Record<CompanionHue, { leaf: string; leafDark: string; pot: string; potDark: string }> = {
  sage: { leaf: "#84A59D", leafDark: "#6B7A8F", pot: "#EBE9E1", potDark: "#2C363F" },
  mist: { leaf: "#6B7A8F", leafDark: "#2C363F", pot: "#EBE9E1", potDark: "#84A59D" },
  clay: { leaf: "#E27D60", leafDark: "#2C363F", pot: "#EBE9E1", potDark: "#6B7A8F" },
};

interface Props {
  stage: number; // 0..5
  mood: Mood;
  hue: CompanionHue;
  className?: string;
}

/**
 * A small potted plant with a face. Stage adds leaves; mood only changes the eyes
 * (closed = resting). There is no sad, wilted, or dead state by design.
 */
export function CompanionSprite({ stage, mood, hue, className = "size-40" }: Props) {
  const c = HUES[hue];
  const resting = mood === "resting";

  return (
    <svg viewBox="0 0 120 120" className={className} role="img" aria-label={`Your companion, stage ${stage + 1} of 6, ${mood}`}>
      {/* Soil + pot */}
      <ellipse cx="60" cy="108" rx="34" ry="5" fill="#2C363F" opacity="0.08" />
      <path d="M38 78 H82 L78 106 H42 Z" fill={c.pot} />
      <rect x="35" y="72" width="50" height="9" rx="3" fill={c.potDark} />
      <ellipse cx="60" cy="78" rx="21" ry="3" fill="#2C363F" opacity="0.55" />

      <g className="breathe">
        {/* Stem */}
        {stage >= 1 ? <path d="M60 76 C60 66, 60 58, 60 46" stroke={c.leafDark} strokeWidth="3" strokeLinecap="round" fill="none" /> : null}

        {/* Seed (stage 0) */}
        {stage === 0 ? <ellipse cx="60" cy="70" rx="6" ry="8" fill={c.leafDark} /> : null}

        {/* Sprout leaves */}
        {stage >= 1 ? (
          <>
            <path d="M60 60 C50 60, 44 54, 46 46 C54 46, 60 52, 60 60 Z" fill={c.leaf} />
            <path d="M60 56 C70 56, 76 50, 74 42 C66 42, 60 48, 60 56 Z" fill={c.leaf} />
          </>
        ) : null}

        {/* Leafy */}
        {stage >= 2 ? (
          <>
            <path d="M60 70 C48 72, 38 66, 38 56 C48 56, 58 62, 60 70 Z" fill={c.leafDark} />
            <path d="M60 68 C72 70, 82 64, 82 54 C72 54, 62 60, 60 68 Z" fill={c.leafDark} />
          </>
        ) : null}

        {/* Budding */}
        {stage >= 3 ? (
          <>
            <path d="M60 46 C60 38, 60 32, 60 26" stroke={c.leafDark} strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M60 36 C52 36, 48 30, 50 24 C56 24, 60 30, 60 36 Z" fill={c.leaf} />
            <circle cx="60" cy="24" r={stage >= 4 ? 0 : 4} fill="#E27D60" />
          </>
        ) : null}

        {/* Blooming */}
        {stage >= 4 ? (
          <g transform="translate(60 22)">
            {[0, 60, 120, 180, 240, 300].map((deg) => (
              <ellipse key={deg} cx="0" cy="-6" rx="3.5" ry="6" fill="#F8E8E2" transform={`rotate(${deg})`} />
            ))}
            <circle r="3" fill="#E27D60" />
          </g>
        ) : null}

        {/* Grove: tiny side sprouts */}
        {stage >= 5 ? (
          <>
            <path d="M44 76 C44 70, 40 66, 36 64 C36 70, 40 74, 44 76 Z" fill={c.leaf} />
            <path d="M76 76 C76 70, 80 66, 84 64 C84 70, 80 74, 76 76 Z" fill={c.leaf} />
          </>
        ) : null}

        {/* Face on the pot */}
        <g transform="translate(0 0)">
          {resting ? (
            <>
              <path d="M50 92 q4 3 8 0" stroke="#2C363F" strokeWidth="2" strokeLinecap="round" fill="none" />
              <path d="M62 92 q4 3 8 0" stroke="#2C363F" strokeWidth="2" strokeLinecap="round" fill="none" />
            </>
          ) : (
            <>
              <circle cx="54" cy="91" r="2.2" fill="#2C363F" />
              <circle cx="66" cy="91" r="2.2" fill="#2C363F" />
            </>
          )}
          <path d="M56 97 q4 3 8 0" stroke="#2C363F" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          {mood === "cozy" ? (
            <>
              <circle cx="49" cy="95" r="2" fill="#E27D60" opacity="0.55" />
              <circle cx="71" cy="95" r="2" fill="#E27D60" opacity="0.55" />
            </>
          ) : null}
        </g>
      </g>
    </svg>
  );
}
