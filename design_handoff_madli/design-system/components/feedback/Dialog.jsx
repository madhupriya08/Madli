import React from "react";
import { IconButton } from "../core/IconButton.jsx";

/**
 * One dialog component, two presentations: a centred modal on wide viewports
 * and a bottom sheet on the phone. Both fade the scrim and slide 8px, no bounce.
 */
export function Dialog({ open = true, variant = "modal", title, subtitle, onClose, footer, children, width = 460, style, ...rest }) {
  if (!open) return null;
  const sheet = variant === "sheet";
  return (
    <div
      style={{
        position: "absolute", inset: 0, zIndex: 60, display: "flex",
        alignItems: sheet ? "flex-end" : "center", justifyContent: "center",
        background: "var(--scrim-flat)", padding: sheet ? 0 : "var(--space-6)",
        animation: "madli-fade-up var(--dur-base) var(--ease-out)",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: sheet ? "100%" : "min(100%, " + width + "px)",
          background: "var(--surface-card)",
          borderRadius: sheet ? "var(--radius-2xl) var(--radius-2xl) 0 0" : "var(--radius-xl)",
          boxShadow: sheet ? "var(--shadow-sheet)" : "var(--shadow-lg)",
          padding: "var(--space-6)",
          display: "flex", flexDirection: "column", gap: "var(--space-4)",
          ...style,
        }}
        {...rest}
      >
        {sheet ? <span style={{ width: 36, height: 4, borderRadius: "var(--radius-pill)", background: "var(--border-strong)", alignSelf: "center", marginTop: -8 }} /> : null}
        {title ? (
          <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-4)" }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
              <h3 style={{ font: "var(--type-h3)" }}>{title}</h3>
              {subtitle ? <p style={{ font: "var(--type-body-sm)", color: "var(--text-muted)" }}>{subtitle}</p> : null}
            </div>
            {onClose && !sheet ? <IconButton icon="x" label="Close" size="sm" onClick={onClose} style={{ marginRight: -6, marginTop: -4 }} /> : null}
          </div>
        ) : null}
        {children}
        {footer ? <div style={{ display: "flex", justifyContent: "flex-end", gap: "var(--space-2)" }}>{footer}</div> : null}
      </div>
    </div>
  );
}
