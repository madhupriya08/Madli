import React from "react";

/** Explains a trust term (score, sample window) on hover or tap. Dark, small, 2 lines max. */
export function Tooltip({ label, children, placement = "top", style, ...rest }) {
  const [open, setOpen] = React.useState(false);
  const pos = placement === "bottom"
    ? { top: "calc(100% + 6px)" }
    : { bottom: "calc(100% + 6px)" };
  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)} onBlur={() => setOpen(false)}
      {...rest}
    >
      {children}
      {open ? (
        <span
          role="tooltip"
          style={{
            position: "absolute", left: "50%", transform: "translateX(-50%)", ...pos,
            background: "var(--teal-800)", color: "var(--white)",
            font: "var(--type-caption)", padding: "7px 10px", borderRadius: "var(--radius-sm)",
            width: "max-content", maxWidth: 220, boxShadow: "var(--shadow-md)", zIndex: 40,
            animation: "madli-fade-up var(--dur-fast) var(--ease-out)", ...style,
          }}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
