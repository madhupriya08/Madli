import React from "react";
import { Icon } from "./Icon.jsx";

export function Tag({ children, icon, selected = false, onClick, onRemove, style, ...rest }) {
  const [hover, setHover] = React.useState(false);
  const interactive = !!onClick;
  return (
    <span
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        font: "var(--type-body-sm)", padding: onRemove ? "6px 8px 6px 11px" : "6px 11px",
        borderRadius: "var(--radius-sm)", cursor: interactive ? "pointer" : "default",
        transition: "var(--transition-color)",
        background: selected ? "var(--teal-500)" : "var(--surface-sunken)",
        color: selected ? "var(--text-on-dark)" : "var(--text-body)",
        border: "1px solid " + (selected ? "var(--teal-500)" : "var(--border-hairline)"),
        ...(interactive && hover && !selected ? { background: "var(--slate-200)" } : {}),
        ...style,
      }}
      {...rest}
    >
      {icon ? <Icon name={icon} size={14} /> : null}
      {children}
      {onRemove ? (
        <span
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          style={{ display: "inline-flex", cursor: "pointer", opacity: 0.6 }}
        >
          <Icon name="x" size={13} />
        </span>
      ) : null}
    </span>
  );
}
