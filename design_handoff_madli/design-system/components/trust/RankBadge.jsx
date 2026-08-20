import React from "react";

const TONE = {
  1: { fill: "var(--rank-1)", ring: "rgba(15,118,110,0.18)", ink: "var(--white)" },
  2: { fill: "var(--rank-2)", ring: "rgba(56,189,248,0.22)", ink: "var(--teal-900)" },
  3: { fill: "var(--rank-3)", ring: "rgba(100,116,139,0.20)", ink: "var(--white)" },
};
const SIZES = {
  sm: { box: 26, font: 14, ring: 2 },
  md: { box: 34, font: 19, ring: 3 },
  lg: { box: 46, font: 26, ring: 4 },
};

export function RankBadge({ rank = 1, size = "md", variant = "solid", style, ...rest }) {
  const s = SIZES[size] || SIZES.md;
  const t = TONE[rank] || TONE[3];
  const solid = variant === "solid";
  return (
    <span
      style={{
        width: s.box, height: s.box, flex: "0 0 auto",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        borderRadius: "var(--radius-circle)",
        background: solid ? t.fill : "var(--white)",
        color: solid ? t.ink : t.fill,
        // a soft halo ring instead of a hard border — reads as a medal, not a bullet
        boxShadow: solid
          ? `0 0 0 ${s.ring}px ${t.ring}, var(--shadow-xs)`
          : `inset 0 0 0 1.5px ${t.fill}, 0 0 0 ${s.ring}px ${t.ring}`,
        fontFamily: "var(--font-display)", fontWeight: "var(--weight-black)",
        fontStyle: "var(--display-upright)", fontSize: s.font, lineHeight: 1,
        fontVariantNumeric: "lining-nums",
        // optical centering: Cooper's numerals sit slightly low and left-heavy
        paddingLeft: 1, paddingBottom: 1,
        ...style,
      }}
      {...rest}
    >
      {rank}
    </span>
  );
}
