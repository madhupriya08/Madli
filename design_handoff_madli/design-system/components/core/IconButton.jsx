import React from "react";
import { Icon } from "./Icon.jsx";

const SIZES = { sm: 32, md: 40, lg: 44 };

export function IconButton({
  icon, label, size = "md", variant = "ghost", disabled = false, onClick, style, ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const box = SIZES[size] || SIZES.md;
  const skins = {
    ghost: { background: "transparent", color: "var(--text-body)", border: "1px solid transparent", hover: "var(--action-ghost-hover)" },
    outline: { background: "var(--surface-card)", color: "var(--text-heading)", border: "1px solid var(--border-strong)", hover: "var(--slate-50)" },
    solid: { background: "var(--action-primary)", color: "var(--text-on-dark)", border: "1px solid transparent", hover: "var(--action-primary-hover)" },
    onImage: { background: "rgba(255,255,255,0.9)", color: "var(--teal-800)", border: "1px solid transparent", hover: "var(--white)" },
  };
  const sk = skins[variant] || skins.ghost;
  return (
    <button
      type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: box, height: box, display: "inline-flex", alignItems: "center", justifyContent: "center",
        borderRadius: "var(--radius-md)", cursor: disabled ? "not-allowed" : "pointer",
        transition: "var(--transition-color)",
        background: sk.background, color: sk.color, border: sk.border,
        ...(hover && !disabled ? { background: sk.hover } : {}),
        ...(disabled ? { color: "var(--action-disabled-text)" } : {}),
        ...style,
      }}
      {...rest}
    >
      {typeof icon === "string" ? <Icon name={icon} size={size === "sm" ? 16 : 20} /> : icon}
    </button>
  );
}
