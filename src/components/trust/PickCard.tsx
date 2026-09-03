import { useState, type CSSProperties } from 'react';
import { RankBadge, type Rank } from './RankBadge';
import { RankGap, type GapTone } from './RankGap';
import { SampleSize } from './SampleSize';
import { ReasonNote } from './ReasonNote';
import { Badge } from '../core/Badge';
import { PhotoFrame } from '../core/PhotoFrame';

export interface PickCardProps {
  rank?: Rank;
  name?: string;
  category?: string;
  neighborhood?: string;
  priceLevel?: string;
  /** required in practice — a pick without a reason is not a pick */
  reason?: string;
  reasonLabel?: string;
  gem?: boolean;
  gapTone?: GapTone;
  gapPoints?: number;
  gapNote?: string;
  locals?: number;
  visitors?: number;
  dataWindow?: string;
  photoSrc?: string;
  photoLabel?: string;
  layout?: 'vertical' | 'horizontal';
  onClick?: () => void;
  style?: CSSProperties;
  /**
   * When false, skip the rank-gap line (Google-only picks have no Madli gap).
   * The sample-size line is independent: it renders whenever real
   * locals/visitors counts are passed, because a Google pick can still carry
   * Madli rankings even though it carries no gap.
   */
  showStats?: boolean;
}

/**
 * One of Madli's three picks, with its reason, gap and sample size attached.
 * The atomic unit — used identically on the results screens and the
 * marketing site. One component, one code path; do not fork it per screen.
 */
export function PickCard({
  rank = 1,
  name,
  category,
  neighborhood,
  priceLevel,
  reason,
  reasonLabel,
  gem = false,
  gapTone = 'clear',
  gapPoints,
  gapNote,
  locals,
  visitors,
  dataWindow,
  photoSrc,
  photoLabel,
  layout = 'vertical',
  onClick,
  style,
  showStats = true,
}: PickCardProps) {
  const [hover, setHover] = useState(false);
  const horizontal = layout === 'horizontal';
  const meta = [category, neighborhood, priceLevel].filter(Boolean).join('  ·  ');
  const Wrapper = onClick ? 'button' : 'article';

  return (
    <Wrapper
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      type={onClick ? 'button' : undefined}
      className={onClick ? 'madli-hover-lift' : undefined}
      style={{
        display: 'flex',
        flexDirection: horizontal ? 'row' : 'column',
        gap: horizontal ? 'var(--space-5)' : 0,
        background: 'var(--surface-card)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        boxShadow: hover && onClick ? 'var(--shadow-md)' : 'var(--shadow-sm)',
        transition: 'var(--transition-shadow), var(--transition-color)',
        cursor: onClick ? 'pointer' : undefined,
        textAlign: 'left',
        width: '100%',
        font: 'inherit',
        color: 'inherit',
        ...style,
      }}
    >
      <div style={{ position: 'relative', flex: horizontal ? '0 0 190px' : undefined }}>
        <PhotoFrame
          src={photoSrc}
          label={photoLabel || name}
          ratio={horizontal ? '1 / 1' : '16 / 10'}
          radius="0"
          className={onClick ? 'madli-hover-zoom' : undefined}
          style={{ height: horizontal ? '100%' : undefined }}
        />
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            display: 'flex',
            gap: 6,
            alignItems: 'center',
          }}
        >
          <RankBadge rank={rank} size="md" />
          {gem ? <Badge tone="onImage">Local gem</Badge> : null}
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
          padding: horizontal ? 'var(--space-5) var(--space-5) var(--space-5) 0' : 'var(--space-5)',
          flex: 1,
          minWidth: 0,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <h3 style={{ font: 'var(--type-h3)', letterSpacing: 'var(--tracking-display)' }}>
            {name}
          </h3>
          {meta ? (
            <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>{meta}</p>
          ) : null}
        </div>
        {reason ? (
          <ReasonNote
            label={reasonLabel || (gem ? 'Why this is a gem' : 'Why this one')}
            tone={gem ? 'gem' : 'plain'}
          >
            {reason}
          </ReasonNote>
        ) : null}
        {showStats || locals != null || visitors != null ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-2)',
              marginTop: 'auto',
            }}
          >
            {showStats ? <RankGap tone={gapTone} points={gapPoints} note={gapNote} /> : null}
            <SampleSize locals={locals} visitors={visitors} window={dataWindow} />
          </div>
        ) : null}
      </div>
    </Wrapper>
  );
}
