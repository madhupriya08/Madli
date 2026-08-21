import type { CSSProperties } from 'react';

export type GapTone = 'clear' | 'close' | 'thin';

export interface RankGapProps {
  /** clear = comfortable margin; close = near-tie, say so; thin = not enough data */
  tone?: GapTone;
  points?: number;
  comparedTo?: string;
  /** overrides the generated sentence */
  note?: string;
  showBar?: boolean;
  style?: CSSProperties;
}

const TONES: Record<GapTone, { color: string; label: string }> = {
  clear: { color: 'var(--gap-clear)', label: 'Clear gap' },
  close: { color: 'var(--gap-close)', label: 'Close call' },
  thin: { color: 'var(--gap-thin)', label: 'Thin data' },
};

/** States the distance to the next pick — openly, including near-ties. */
export function RankGap({
  tone = 'clear',
  points,
  comparedTo = '#2',
  note,
  showBar = true,
  style,
}: RankGapProps) {
  const t = TONES[tone];
  const pct = tone === 'clear' ? 82 : tone === 'close' ? 34 : 14;
  const text =
    note || (points != null ? `${points > 0 ? '+' : ''}${points} pts over ${comparedTo}` : t.label);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <span
          aria-hidden
          style={{
            width: 6,
            height: 6,
            borderRadius: 'var(--radius-circle)',
            background: t.color,
            flex: '0 0 auto',
          }}
        />
        <span style={{ font: 'var(--type-body-sm)', color: 'var(--text-body)' }}>{text}</span>
      </div>
      {showBar ? (
        <div
          role="img"
          aria-label={text}
          style={{
            height: 3,
            borderRadius: 'var(--radius-pill)',
            background: 'var(--surface-sunken)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${pct}%`,
              height: '100%',
              background: t.color,
              borderRadius: 'var(--radius-pill)',
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
