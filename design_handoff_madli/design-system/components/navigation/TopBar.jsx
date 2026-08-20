import React from "react";
import { Icon } from "../core/Icon.jsx";

/** App header. Sticky, translucent over scrolling content, hairline underneath. */
export function TopBar({ title, subtitle, leading, trailing, onBack, sticky = true, style, ...rest }) {
  return (
    <header
      style={{
        position: sticky ? "sticky" : "static", top: 0, zIndex: 20,
        display: "flex", alignItems: "center", gap: "var(--space-3)",
        minHeight: 56, padding: "10px var(--gutter-mobile)",
        background: "var(--bar-scrim)", backdropFilter: "var(--blur-bar)",
        WebkitBackdropFilter: "var(--blur-bar)",
        borderBottom: "1px solid var(--border-hairline)",
        ...style,
      }}
      {...rest}
    >
      {onBack ? (
        <button onClick={onBack} aria-label="Back" style={{ width: 36, height: 36, display: "inline-flex", alignItems: "center", justifyContent: "center", background: "transparent", border: "none", cursor: "pointer", marginLeft: -8 }}>
          <Icon name="arrow-left" size={20} color="var(--text-heading)" />
        </button>
      ) : leading}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        {title ? <span style={{ font: "var(--type-h4)", color: "var(--text-heading)" }}>{title}</span> : null}
        {subtitle ? <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{subtitle}</span> : null}
      </div>
      {trailing}
    </header>
  );
}
