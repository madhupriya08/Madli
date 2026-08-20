import React from "react";
import { Icon } from "../core/Icon.jsx";

/** Bottom bar for the Madli app. Four destinations, labels always visible. */
export function TabBar({ items = [], value, onChange, style, ...rest }) {
  return (
    <nav
      style={{
        display: "flex", alignItems: "stretch",
        background: "var(--bar-scrim)", backdropFilter: "var(--blur-bar)",
        WebkitBackdropFilter: "var(--blur-bar)",
        borderTop: "1px solid var(--border-hairline)",
        padding: "8px 6px 10px",
        ...style,
      }}
      {...rest}
    >
      {items.map((it) => {
        const active = it.value === value;
        return (
          <button
            key={it.value} onClick={() => onChange && onChange(it.value)}
            style={{
              flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              minHeight: "var(--tap-target-min)", padding: "4px 0",
              background: "transparent", border: "none", cursor: "pointer",
              color: active ? "var(--teal-500)" : "var(--text-faint)",
              transition: "var(--transition-color)",
            }}
          >
            <Icon name={it.icon} size={21} />
            <span style={{ font: "var(--type-evidence)", fontWeight: active ? "var(--weight-demi)" : "var(--weight-book)", letterSpacing: "0.02em" }}>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
