import React from "react";

/**
 * The reason next to a pick — the one thing Madli never crowds out.
 * One sentence, body-size, held to --reason-max so it always sets in 2–3 lines.
 */
export function ReasonNote({ children, label = "Why this one", tone = "plain", style, ...rest }) {
  const rail = tone === "gem" ? "var(--action-accent)" : "var(--teal-200)";
  return (
    <div
      style={{
        display: "flex", flexDirection: "column", gap: 5,
        paddingLeft: "var(--space-3)", borderLeft: "2px solid " + rail,
        maxWidth: "var(--reason-max)", ...style,
      }}
      {...rest}
    >
      <span style={{ font: "var(--type-eyebrow)", textTransform: "uppercase", letterSpacing: "var(--tracking-eyebrow)", color: tone === "gem" ? "var(--coral-600)" : "var(--teal-600)" }}>
        {label}
      </span>
      <p style={{ font: "var(--type-body)", color: "var(--text-body)" }}>{children}</p>
    </div>
  );
}
