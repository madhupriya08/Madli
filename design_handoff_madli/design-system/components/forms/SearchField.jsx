import React from "react";
import { Icon } from "../core/Icon.jsx";

export function SearchField({
  value, onChange, placeholder = "Search a city or a craving", onSubmit,
  size = "md", onClear, style, ...rest
}) {
  const [focus, setFocus] = React.useState(false);
  const h = size === "lg" ? 52 : 44;
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit && onSubmit(value); }}
      style={{
        display: "flex", alignItems: "center", gap: 10, height: h, padding: "0 14px",
        borderRadius: "var(--radius-pill)", background: "var(--surface-card)",
        border: "1px solid " + (focus ? "var(--border-focus)" : "var(--border-hairline)"),
        boxShadow: focus ? "var(--shadow-focus)" : "var(--shadow-sm)",
        transition: "var(--transition-color), var(--transition-shadow)",
        ...style,
      }}
      {...rest}
    >
      <Icon name="search" size={18} color="var(--text-faint)" />
      <input
        value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{ flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", font: size === "lg" ? "var(--type-body-lg)" : "var(--type-body)", color: "var(--text-heading)" }}
      />
      {value && onClear ? (
        <span onClick={onClear} style={{ cursor: "pointer", display: "inline-flex" }}>
          <Icon name="x" size={16} color="var(--text-faint)" />
        </span>
      ) : null}
    </form>
  );
}
