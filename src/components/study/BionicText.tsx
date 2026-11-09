import { Fragment, useMemo } from "react";

/**
 * "Bionic"-style emphasis: bolds the first ~40% of each word so the eye has
 * fixation anchors. Evidence is mixed, so it's always an opt-in toggle.
 */
export function BionicText({ text, enabled, className = "" }: { text: string; enabled: boolean; className?: string }) {
  const paragraphs = useMemo(() => text.split(/\n{2,}/), [text]);

  return (
    <div className={className}>
      {paragraphs.map((para, pi) => (
        <p key={pi} className="mb-5 last:mb-0">
          {enabled
            ? para.split(/(\s+)/).map((token, ti) => {
                if (/^\s+$/.test(token) || token.length === 0) return <Fragment key={ti}>{token}</Fragment>;
                const n = token.length <= 3 ? 1 : Math.ceil(token.length * 0.4);
                return (
                  <Fragment key={ti}>
                    <b className="font-semibold text-ink">{token.slice(0, n)}</b>
                    <span className="text-ink-muted">{token.slice(n)}</span>
                  </Fragment>
                );
              })
            : para}
        </p>
      ))}
    </div>
  );
}
