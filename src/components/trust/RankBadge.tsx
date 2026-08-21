import type { CSSProperties } from 'react';

export type Rank = 1 | 2 | 3;

export interface RankBadgeProps {
  rank?: Rank;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'outline';
  style?: CSSProperties;
}

const TONE: Record<Rank, { fill: string; ring: string; ink: string }> = {
  1: { fill: 'var(--rank-1)', ring: 'rgba(15,118,110,0.18)', ink: 'var(--white)' },
  2: { fill: 'var(--rank-2)', ring: 'rgba(56,189,248,0.22)', ink: 'var(--teal-900)' },
  3: { fill: 'var(--rank-3)', ring: 'rgba(100,116,139,0.20)', ink: 'var(--white)' },
};

const SIZES = {
  sm: { box: 26, font: 14, ring: 2 },
  md: { box: 34, font: 19, ring: 3 },
  lg: { box: 46, font: 26, ring: 4 },
};

/** The numeral 1, 2 or 3 in Cooper BT. Only ever those three ranks. */
export function RankBadge({ rank = 1, size = 'md', variant = 'solid', style }: RankBadgeProps) {
  const s = SIZES[size];
  const t = TONE[rank];
  const solid = variant === 'solid';
  return (
    <span
      aria-label={`Rank ${rank}`}
      style={{
        width: s.box,
        height: s.box,
        flex: '0 0 auto',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-circle)',
        background: solid ? t.fill : 'var(--white)',
        color: solid ? t.ink : t.fill,
        // a soft halo ring instead of a hard border — reads as a medal, not a bullet
        boxShadow: solid
          ? `0 0 0 ${s.ring}px ${t.ring}, var(--shadow-xs)`
          : `inset 0 0 0 1.5px ${t.fill}, 0 0 0 ${s.ring}px ${t.ring}`,
        fontFamily: 'var(--font-display)',
        fontWeight: 'var(--weight-black)',
        fontStyle: 'var(--display-upright)' as CSSProperties['fontStyle'],
        fontSize: s.font,
        lineHeight: 1,
        fontVariantNumeric: 'lining-nums',
        // optical centering: Cooper's numerals sit slightly low and left-heavy
        paddingLeft: 1,
        paddingBottom: 1,
        ...style,
      }}
    >
      {rank}
    </span>
  );
}
