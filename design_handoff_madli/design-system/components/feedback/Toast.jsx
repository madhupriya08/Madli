import React from "react";
import { Icon } from "../core/Icon.jsx";

const TONES = {
  neutral: { bg: "var(--teal-800)", fg: "var(--white)", icon: null },
  success: { bg: "var(--teal-800)", fg: "var(--white)", icon: "check" },
  warn: { bg: "var(--amber-600)", fg: "var(--white)", icon: "alert-triangle" },
  error: { bg: "var(--red-600)", fg: "var(--white)", icon: "alert-circle" },
};

/** Dark, single-line confirmation. Sits above the tab bar; no auto-dismiss animation flourish. */
export function Toast({ children, tone = "neutral", action, actionLabel, onDismiss, style, ...rest }) {
  const t = TONES[tone] || TONES.neutral;
  return (
    <div
      role="status"
      style={{
        display: "flex", alignItems: "center", gap: "var(--space-3)",
        padding: "12px 14px", borderRadius: "var(--radius-md)",
        background: t.bg, color: t.fg, boxShadow: "var(--shadow-lg)",
        font: "var(--type-body-sm)", animation: "madli-fade-up var(--dur-base) var(--ease-out)",
        ...style,
      }}
      {...rest}
    >
      {t.icon ? <Icon name={t.icon} size={17} color="currentColor" /> : null}
      <span style={{ flex: 1 }}>{children}</span>
      {actionLabel ? (
        <button onClick={action} style={{ background: "transparent", border: "none", color: "inherit", font: "var(--type-label)", cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3, padding: 0 }}>
          {actionLabel}
        </button>
      ) : null}
      {onDismiss ? (
        <span onClick={onDismiss} style={{ cursor: "pointer", opacity: 0.7, display: "inline-flex" }}><Icon name="x" size={15} color="currentColor" /></span>
      ) : null}
    </div>
  );
}
