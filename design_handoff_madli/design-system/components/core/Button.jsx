import React from "react";

const SIZES = {
  sm: { height: 36, padding: "0 14px", font: "var(--type-body-sm)", radius: "var(--radius-sm)", gap: 6 },
  md: { height: 44, padding: "0 20px", font: "var(--type-label)", radius: "var(--radius-md)", gap: 8 },
  lg: { height: 52, padding: "0 26px", font: "var(--type-body-lg)", radius: "var(--radius-md)", gap: 10 },
};

const VARIANTS = {
  primary: {
    background: "var(--action-primary)", color: "var(--text-on-dark)",
    border: "1px solid transparent", boxShadow: "var(--shadow-xs)",
  },
  accent: {
    background: "var(--action-accent)", color: "var(--text-on-dark)",
    border: "1px solid transparent", boxShadow: "var(--shadow-xs)",
  },
  secondary: {
    background: "var(--surface-card)", color: "var(--text-heading)",
    border: "1px solid var(--border-strong)", boxShadow: "var(--shadow-xs)",
  },
  ghost: {
    background: "transparent", color: "var(--text-body)",
    border: "1px solid transparent", boxShadow: "none",
  },
  quiet: {
    background: "var(--surface-sunken)", color: "var(--text-heading)",
    border: "1px solid transparent", boxShadow: "none",
  },
  inverse: {
    background: "var(--white)", color: "var(--teal-800)",
    border: "1px solid transparent", boxShadow: "none",
  },
};

const HOVER = {
  primary: "var(--action-primary-hover)",
  accent: "var(--action-accent-hover)",
  secondary: "var(--slate-50)",
  ghost: "var(--action-ghost-hover)",
  quiet: "var(--slate-200)",
  inverse: "var(--slate-100)",
};

export function Button({
  children, variant = "primary", size = "md", block = false, disabled = false,
  iconLeft, iconRight, type = "button", onClick, style, ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const s = SIZES[size] || SIZES.md;
  const v = VARIANTS[variant] || VARIANTS.primary;
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        display: block ? "flex" : "inline-flex", width: block ? "100%" : undefined,
        alignItems: "center", justifyContent: "center", gap: s.gap,
        height: s.height, padding: s.padding, font: s.font,
        letterSpacing: "0.01em", borderRadius: s.radius, cursor: disabled ? "not-allowed" : "pointer",
        transition: "var(--transition-color), var(--transition-shadow), var(--transition-transform)",
        whiteSpace: "nowrap", textAlign: "center",
        ...v,
        ...(disabled ? { background: "var(--action-disabled-bg)", color: "var(--action-disabled-text)", border: "1px solid transparent", boxShadow: "none" } : {}),
        ...(!disabled && hover ? { background: HOVER[variant] } : {}),
        ...(!disabled && press ? { transform: "var(--press-translate)", boxShadow: "none" } : {}),
        ...style,
      }}
      {...rest}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}
