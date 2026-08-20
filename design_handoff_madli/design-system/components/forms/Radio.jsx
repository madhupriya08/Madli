import React from "react";

export function Radio({ label, description, checked = false, onChange, disabled = false, name, style, ...rest }) {
  return (
    <label
      style={{
        display: "flex", alignItems: description ? "flex-start" : "center", gap: 10,
        cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1, ...style,
      }}
      {...rest}
    >
      <input type="radio" name={name} checked={checked} onChange={() => onChange && onChange(true)} disabled={disabled} style={{ position: "absolute", opacity: 0, pointerEvents: "none" }} />
      <span
        style={{
          width: 20, height: 20, flex: "0 0 auto", marginTop: description ? 2 : 0,
          borderRadius: "var(--radius-circle)", display: "inline-flex", alignItems: "center", justifyContent: "center",
          background: "var(--surface-card)",
          border: "1px solid " + (checked ? "var(--action-primary)" : "var(--border-strong)"),
          transition: "var(--transition-color)",
        }}
      >
        {checked ? <span style={{ width: 10, height: 10, borderRadius: "var(--radius-circle)", background: "var(--action-primary)" }} /> : null}
      </span>
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        <span style={{ font: "var(--type-body)", color: "var(--text-heading)" }}>{label}</span>
        {description ? <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{description}</span> : null}
      </span>
    </label>
  );
}
