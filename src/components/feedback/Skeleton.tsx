import type { CSSProperties } from 'react';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string;
  circle?: boolean;
  style?: CSSProperties;
}

/**
 * Loading placeholder: the quiet opacity breath plus a travelling shimmer
 * sweep layered on top (P13 §9) — both run at once (two entries in one
 * `animation` list), each targeting a different property, so neither
 * overrides the other the way stacking two separate `animation` values
 * normally would.
 */
export function Skeleton({
  width = '100%',
  height = 12,
  radius = 'var(--radius-sm)',
  circle = false,
  style,
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: 'block',
        width,
        height: circle ? width : height,
        borderRadius: circle ? 'var(--radius-circle)' : radius,
        backgroundColor: 'var(--surface-skeleton)',
        backgroundImage:
          'linear-gradient(100deg, transparent 30%, color-mix(in oklch, var(--white) 55%, transparent) 50%, transparent 70%)',
        backgroundSize: '320px 100%',
        backgroundRepeat: 'no-repeat',
        animation:
          'madli-skeleton var(--skeleton-dur) var(--ease-standard) infinite, madli-shimmer-sweep var(--shimmer-dur) ease-in-out infinite',
        ...style,
      }}
    />
  );
}

export interface PickSkeletonProps {
  layout?: 'vertical' | 'horizontal';
  style?: CSSProperties;
}

/** Skeleton in the exact geometry of a PickCard so nothing shifts on load. */
export function PickSkeleton({ layout = 'vertical', style }: PickSkeletonProps) {
  const horizontal = layout === 'horizontal';
  return (
    <div
      aria-hidden="true"
      style={{
        display: 'flex',
        flexDirection: horizontal ? 'row' : 'column',
        gap: horizontal ? 'var(--space-5)' : 0,
        background: 'var(--surface-card)',
        border: '1px solid var(--border-hairline)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
    >
      <Skeleton
        width={horizontal ? '190px' : '100%'}
        height={horizontal ? 'auto' : 150}
        radius="0"
        style={{ flex: horizontal ? '0 0 190px' : undefined, alignSelf: 'stretch' }}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: horizontal ? 'var(--space-5) var(--space-5) var(--space-5) 0' : 'var(--space-5)',
          flex: 1,
        }}
      >
        <Skeleton width="58%" height={20} />
        <Skeleton width="38%" height={11} />
        <Skeleton width="90%" height={11} />
        <Skeleton width="72%" height={11} />
        <Skeleton width="46%" height={9} />
      </div>
    </div>
  );
}
