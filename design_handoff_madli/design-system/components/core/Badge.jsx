import React from "react";

const TONES = {
  neutral: { background: "var(--surface-sunken)", color: "var(--text-body)" },
  teal: { background: "var(--teal-50)", color: "var(--teal-600)" },
  sky: { background: "var(--status-info-bg)", color: "var(--status-info-fg)" },
  coral: { background: "var(--surface-coral-soft)", color: "var(--coral-600)" },
  success: { background: "var(--status-success-bg)", color: "var(--status-success-fg)" },
  warn: { background: "var(--status-warn-bg)", color: "var(--status-warn-fg)" },
  solid: { background: "var(--action-primary)", color: "var(--text-on-dark)" },
  onImage: { background: "rgba(11,47,54,0.72)", color: "var(--white)" },
};

export function Badge({ children, tone = "neutral", uppercase = true, style, ...rest }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        font: "var(--type-eyebrow)",
        textTransform: uppercase ? "uppercase" : "none",
        letterSpacing: uppercase ? "var(--tracking-wide)" : "0",
        padding: "4px 9px", borderRadius: "var(--radius-pill)", whiteSpace: "nowrap",
        ...t, ...style,
      }}
      {...rest}
    >
      {children}
    </span>
  );
}
