import React from "react";

export function Card({
  children, padding = "var(--space-5)", interactive = false, elevation = "sm",
  radius = "var(--radius-lg)", as = "div", style, ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const El = as;
  const shadows = { none: "none", xs: "var(--shadow-xs)", sm: "var(--shadow-sm)", md: "var(--shadow-md)", lg: "var(--shadow-lg)" };
  return (
    <El
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "var(--surface-card)", border: "1px solid var(--border-hairline)",
        borderRadius: radius, padding, boxShadow: shadows[elevation] ?? shadows.sm,
        transition: "var(--transition-shadow), var(--transition-color)",
        cursor: interactive ? "pointer" : undefined,
        ...(interactive && hover ? { boxShadow: "var(--shadow-md)", borderColor: "var(--border-strong)" } : {}),
        ...style,
      }}
      {...rest}
    >
      {children}
    </El>
  );
}
