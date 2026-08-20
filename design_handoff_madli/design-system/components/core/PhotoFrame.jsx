import React from "react";

/**
 * Photography container. Madli leans on real photos; until they are supplied a
 * PhotoFrame with no `src` renders a quiet warm placeholder that states what
 * belongs there. Never fills the slot with an illustration or icon.
 */
export function PhotoFrame({ src, alt, label, ratio = "16 / 10", radius = "var(--radius-lg)", overlay = false, children, style, ...rest }) {
  return (
    <div
      style={{
        position: "relative", aspectRatio: children && !ratio ? undefined : ratio,
        borderRadius: radius, overflow: "hidden",
        background: src ? "var(--surface-sunken)" : "var(--brand-cream)",
        ...style,
      }}
      {...rest}
    >
      {src ? (
        <img src={src} alt={alt || label || ""} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        <div
          style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "flex-end",
            padding: "var(--space-3)", background: "var(--brand-cream)",
            boxShadow: "var(--shadow-inset-hair)",
          }}
        >
          <span style={{ font: "var(--type-evidence)", textTransform: "uppercase", letterSpacing: "var(--tracking-eyebrow)", color: "var(--slate-400)" }}>
            Photo — {label || "placeholder"}
          </span>
        </div>
      )}
      {overlay ? <div style={{ position: "absolute", inset: 0, background: "var(--scrim-bottom)" }} /> : null}
      {children ? <div style={{ position: "absolute", inset: 0 }}>{children}</div> : null}
    </div>
  );
}
