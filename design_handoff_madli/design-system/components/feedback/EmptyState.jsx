import React from "react";
import { Icon } from "../core/Icon.jsx";

/** Says what is missing and what to do next. Never apologises twice. */
export function EmptyState({ icon = "map-pin-off", title, body, action, style, ...rest }) {
  return (
    <div
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)",
        textAlign: "center", padding: "var(--space-9) var(--space-6)", ...style,
      }}
      {...rest}
    >
      <Icon name={icon} size={26} color="var(--text-faint)" />
      <h4 style={{ font: "var(--type-h4)", color: "var(--text-heading)" }}>{title}</h4>
      {body ? <p style={{ font: "var(--type-body-sm)", color: "var(--text-muted)", maxWidth: "34ch" }}>{body}</p> : null}
      {action}
    </div>
  );
}
