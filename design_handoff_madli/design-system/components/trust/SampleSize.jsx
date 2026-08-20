import React from "react";

/**
 * The evidence line. Always real counts, never "thousands of reviews".
 * Reads as a footnote: small, grey, factual, no icon decoration.
 */
export function SampleSize({ locals, visitors, window: windowLabel = "last 90 days", extra, style, ...rest }) {
  const parts = [];
  if (locals != null) parts.push(`${locals.toLocaleString()} locals`);
  if (visitors != null) parts.push(`${visitors.toLocaleString()} visitors`);
  if (windowLabel) parts.push(windowLabel);
  if (extra) parts.push(extra);
  return (
    <p style={{ font: "var(--type-evidence)", color: "var(--evidence-text)", letterSpacing: "0.01em", ...style }} {...rest}>
      {parts.join("  ·  ")}
    </p>
  );
}
