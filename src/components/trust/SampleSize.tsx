import type { CSSProperties } from 'react';

export interface SampleSizeProps {
  locals?: number;
  visitors?: number;
  /** time window label, default "last 90 days" */
  window?: string;
  extra?: string;
  style?: CSSProperties;
}

/** The evidence footnote under a pick: real counts and the time window. */
export function SampleSize({
  locals,
  visitors,
  window: windowLabel = 'last 90 days',
  extra,
  style,
}: SampleSizeProps) {
  const parts: string[] = [];
  if (locals != null) parts.push(`${locals.toLocaleString()} locals`);
  if (visitors != null) parts.push(`${visitors.toLocaleString()} visitors`);
  if (windowLabel) parts.push(windowLabel);
  if (extra) parts.push(extra);
  return (
    <p
      style={{
        font: 'var(--type-evidence)',
        color: 'var(--evidence-text)',
        letterSpacing: '0.01em',
        ...style,
      }}
    >
      {parts.join('  ·  ')}
    </p>
  );
}
