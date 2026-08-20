import React from "react";

/**
 * States the distance between this pick and the next one, plainly.
 * Madli shows gaps openly — a near-tie is said out loud, not hidden.
 */
const TONES = {
  clear: { color: "var(--gap-clear)", label: "Clear gap" },
  close: { color: "var(--gap-close)", label: "Close call" },
  thin: { color: "var(--gap-thin)", label: "Thin data" },
};

export function RankGap({ tone = "clear", points, comparedTo = "#2", note, showBar = true, style, ...rest }) {
  const t = TONES[tone] || TONES.clear;
  const pct = tone === "clear" ? 82 : tone === "close" ? 34 : 14;
  const text = note || (points != null
    ? `${points > 0 ? "+" : ""}${points} pts over ${comparedTo}`
    : t.label);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, ...style }} {...rest}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        <span style={{ width: 6, height: 6, borderRadius: "var(--radius-circle)", background: t.color, flex: "0 0 auto" }} />
        <span style={{ font: "var(--type-body-sm)", color: "var(--text-body)" }}>{text}</span>
      </div>
      {showBar ? (
        <div style={{ height: 3, borderRadius: "var(--radius-pill)", background: "var(--surface-sunken)", overflow: "hidden" }}>
          <div style={{ width: pct + "%", height: "100%", background: t.color, borderRadius: "var(--radius-pill)" }} />
        </div>
      ) : null}
    </div>
  );
}
