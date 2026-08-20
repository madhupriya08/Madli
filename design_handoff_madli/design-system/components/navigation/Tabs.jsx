import React from "react";

/** Segmented control. Madli uses it for scope switches (Eat / Do / Stay). */
export function Tabs({ items = [], value, onChange, size = "md", style, ...rest }) {
  const h = size === "sm" ? 34 : 40;
  return (
    <div
      role="tablist"
      style={{
        display: "inline-flex", gap: 2, padding: 3, height: h + 6,
        background: "var(--surface-sunken)", borderRadius: "var(--radius-md)",
        ...style,
      }}
      {...rest}
    >
      {items.map((it) => {
        const v = it.value ?? it;
        const active = v === value;
        return (
          <button
            key={v} role="tab" aria-selected={active} onClick={() => onChange && onChange(v)}
            style={{
              height: h, padding: "0 16px", border: "none", cursor: "pointer",
              borderRadius: "var(--radius-sm)", font: "var(--type-label)",
              background: active ? "var(--surface-card)" : "transparent",
              color: active ? "var(--text-heading)" : "var(--text-muted)",
              boxShadow: active ? "var(--shadow-xs)" : "none",
              transition: "var(--transition-color), var(--transition-shadow)",
            }}
          >
            {it.label ?? v}
          </button>
        );
      })}
    </div>
  );
}
