import { useState, type CSSProperties, type ReactNode } from 'react';

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
  /** e.g. "madli-hover-zoom" — CSS-driven hover effects a plain style prop can't express. */
  className?: string;
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
  className,
}: PhotoFrameProps) {
  // Photography is currently served from a public placeholder host (see
  // src/lib/placePhoto.ts), so a load can fail for reasons that have nothing
  // to do with this app: offline, a content blocker, a corporate proxy. On
  // failure fall back to the labelled placeholder this component already
  // renders for a missing src, rather than leaving the browser's broken-image
  // glyph in a card the whole product's credibility rests on.
  // Records *which* src failed rather than a bare boolean: a new src is then
  // retried automatically, with no reset effect, so one failure can't poison
  // the slot for every later place rendered through the same component.
  const [failedSrc, setFailedSrc] = useState<string | undefined>(undefined);
  const showImage = Boolean(src) && failedSrc !== src;

  return (
    <div
      className={className}
      style={{
        position: 'relative',
        aspectRatio: children && !ratio ? undefined : ratio,
        borderRadius: radius,
        overflow: 'hidden',
        background: showImage ? 'var(--surface-sunken)' : 'var(--brand-cream)',
        ...style,
      }}
    >
      {showImage ? (
        <img
          src={src}
          alt={alt || label || ''}
          loading="lazy"
          onError={() => setFailedSrc(src)}
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
