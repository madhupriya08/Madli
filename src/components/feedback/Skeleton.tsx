import type { CSSProperties } from 'react';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  radius?: string;
  circle?: boolean;
  style?: CSSProperties;
}

/** Quiet loading placeholder — a slow opacity breath, no travelling sheen. */
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
        background: 'var(--surface-skeleton)',
        animation: 'madli-skeleton var(--skeleton-dur) var(--ease-standard) infinite',
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
