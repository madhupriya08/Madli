import React from "react";

export function Switch({ label, description, checked = false, onChange, disabled = false, style, ...rest }) {
  return (
    <label
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1, ...style }}
      {...rest}
    >
      <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {label ? <span style={{ font: "var(--type-body)", color: "var(--text-heading)" }}>{label}</span> : null}
        {description ? <span style={{ font: "var(--type-caption)", color: "var(--text-muted)" }}>{description}</span> : null}
      </span>
      <span
        onClick={() => !disabled && onChange && onChange(!checked)}
        style={{
          width: 44, height: 26, flex: "0 0 auto", borderRadius: "var(--radius-pill)", padding: 3,
          display: "inline-flex", alignItems: "center",
          background: checked ? "var(--action-primary)" : "var(--slate-300)",
          transition: "background-color var(--dur-fast) var(--ease-standard)",
        }}
      >
        <span
          style={{
            width: 20, height: 20, borderRadius: "var(--radius-circle)", background: "var(--white)",
            boxShadow: "var(--shadow-xs)",
            transform: checked ? "translateX(18px)" : "translateX(0)",
            transition: "transform var(--dur-fast) var(--ease-standard)",
          }}
        />
      </span>
    </label>
  );
}
