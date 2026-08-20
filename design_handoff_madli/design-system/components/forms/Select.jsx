import React from "react";
import { Icon } from "../core/Icon.jsx";

export function Select({ label, value, onChange, options = [], hint, disabled = false, id, style, ...rest }) {
  const selectId = id || React.useMemo(() => "sel-" + Math.random().toString(36).slice(2, 7), []);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label ? <label htmlFor={selectId} style={{ font: "var(--type-label)", color: "var(--text-heading)" }}>{label}</label> : null}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <select
          id={selectId} value={value} onChange={onChange} disabled={disabled}
          style={{
            appearance: "none", width: "100%", height: 44, padding: "0 38px 0 12px",
            borderRadius: "var(--radius-md)", background: disabled ? "var(--surface-sunken)" : "var(--surface-card)",
            border: "1px solid var(--border-strong)", font: "var(--type-body)", color: "var(--text-heading)",
            cursor: disabled ? "not-allowed" : "pointer", outline: "none",
          }}
          {...rest}
        >
          {options.map((o) => (
            <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>
          ))}
        </select>
        <Icon name="chevron-down" size={17} color="var(--text-muted)" style={{ position: "absolute", right: 12, pointerEvents: "none" }} />
      </div>
      {hint ? <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{hint}</span> : null}
    </div>
  );
}
