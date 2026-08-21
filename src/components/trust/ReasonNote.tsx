import type { CSSProperties, ReactNode } from 'react';

export interface ReasonNoteProps {
  children?: ReactNode;
  /** default "Why this one"; use "Why this is a gem" with tone="gem" */
  label?: string;
  tone?: 'plain' | 'gem';
  style?: CSSProperties;
}

/**
 * The one-sentence reason attached to a pick. Capped at --reason-max (46ch)
 * via CSS max-width so it always wraps into 2-3 lines rather than truncating.
 */
export function ReasonNote({
  children,
  label = 'Why this one',
  tone = 'plain',
  style,
}: ReasonNoteProps) {
  const rail = tone === 'gem' ? 'var(--action-accent)' : 'var(--teal-200)';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        paddingLeft: 'var(--space-3)',
        borderLeft: `2px solid ${rail}`,
        maxWidth: 'var(--reason-max)',
        ...style,
      }}
    >
      <span
        style={{
          font: 'var(--type-eyebrow)',
          textTransform: 'uppercase',
          letterSpacing: 'var(--tracking-eyebrow)',
          color: tone === 'gem' ? 'var(--coral-600)' : 'var(--teal-600)',
        }}
      >
        {label}
      </span>
      <p style={{ font: 'var(--type-body)', color: 'var(--text-body)' }}>{children}</p>
    </div>
  );
}
