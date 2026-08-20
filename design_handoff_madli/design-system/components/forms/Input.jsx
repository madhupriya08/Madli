import React from "react";
import { Icon } from "../core/Icon.jsx";

export function Input({
  label, hint, error, value, onChange, placeholder, type = "text",
  iconLeft, suffix, disabled = false, id, style, ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const inputId = id || React.useMemo(() => "in-" + Math.random().toString(36).slice(2, 7), []);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label ? (
        <label htmlFor={inputId} style={{ font: "var(--type-label)", color: "var(--text-heading)" }}>{label}</label>
      ) : null}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 8, height: 44,
          padding: "0 12px", borderRadius: "var(--radius-md)",
          background: disabled ? "var(--surface-sunken)" : "var(--surface-card)",
          border: "1px solid " + (error ? "var(--red-500)" : focus ? "var(--border-focus)" : "var(--border-strong)"),
          boxShadow: focus && !error ? "var(--shadow-focus)" : "none",
          transition: "var(--transition-color), var(--transition-shadow)",
        }}
      >
        {iconLeft ? <Icon name={iconLeft} size={17} color="var(--text-faint)" /> : null}
        <input
          id={inputId} type={type} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{
            flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent",
            font: "var(--type-body)", color: "var(--text-heading)",
          }}
          {...rest}
        />
        {suffix ? <span style={{ font: "var(--type-caption)", color: "var(--text-faint)" }}>{suffix}</span> : null}
      </div>
      {error ? (
        <span style={{ font: "var(--type-caption)", color: "var(--status-error-fg)" }}>{error}</span>
      ) : hint ? (
        <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{hint}</span>
      ) : null}
    </div>
  );
}
