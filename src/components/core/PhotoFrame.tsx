import type { CSSProperties, ReactNode } from 'react';

export interface PhotoFrameProps {
  src?: string;
  alt?: string;
  /** shown in the placeholder when no src is supplied */
  label?: string;
  ratio?: string;
  radius?: string;
  /** applies --scrim-bottom so white text stays legible */
  overlay?: boolean;
  children?: ReactNode;
  style?: CSSProperties;
}

/**
 * Photography container. No real photography exists yet — a PhotoFrame with
 * no `src` renders a quiet warm placeholder naming what belongs there. Never
 * an illustration or icon in the slot.
 */
export function PhotoFrame({
  src,
  alt,
  label,
  ratio = '16 / 10',
  radius = 'var(--radius-lg)',
  overlay = false,
  children,
  style,
}: PhotoFrameProps) {
  return (
    <div
      style={{
        position: 'relative',
        aspectRatio: children && !ratio ? undefined : ratio,
        borderRadius: radius,
        overflow: 'hidden',
        background: src ? 'var(--surface-sunken)' : 'var(--brand-cream)',
        ...style,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={alt || label || ''}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'flex-end',
            padding: 'var(--space-3)',
            background: 'var(--brand-cream)',
            boxShadow: 'var(--shadow-inset-hair)',
          }}
        >
          <span
            style={{
              font: 'var(--type-evidence)',
              textTransform: 'uppercase',
              letterSpacing: 'var(--tracking-eyebrow)',
              color: 'var(--slate-400)',
            }}
          >
            Photo — {label || 'placeholder'}
          </span>
        </div>
      )}
      {overlay ? (
        <div style={{ position: 'absolute', inset: 0, background: 'var(--scrim-bottom)' }} />
      ) : null}
      {children ? <div style={{ position: 'absolute', inset: 0 }}>{children}</div> : null}
    </div>
  );
}
