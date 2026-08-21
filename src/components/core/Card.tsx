import { useState, type CSSProperties, type ElementType, type ReactNode } from 'react';

export interface CardProps {
  children?: ReactNode;
  padding?: string | number;
  interactive?: boolean;
  elevation?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  radius?: string;
  as?: ElementType;
  style?: CSSProperties;
  onClick?: () => void;
}

const SHADOWS: Record<NonNullable<CardProps['elevation']>, string> = {
  none: 'none',
  xs: 'var(--shadow-xs)',
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
};

/** Neutral white container: hairline border, low cool shadow, 14px radius. */
export function Card({
  children,
  padding = 'var(--space-5)',
  interactive = false,
  elevation = 'sm',
  radius = 'var(--radius-lg)',
  as: El = 'div',
  style,
  onClick,
}: CardProps) {
  const [hover, setHover] = useState(false);
  return (
    <El
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-hairline)',
        borderRadius: radius,
        padding,
        boxShadow: SHADOWS[elevation],
        transition: 'var(--transition-shadow), var(--transition-color)',
        cursor: interactive ? 'pointer' : undefined,
        ...(interactive && hover
          ? { boxShadow: 'var(--shadow-md)', borderColor: 'var(--border-strong)' }
          : {}),
        ...style,
      }}
    >
      {children}
    </El>
  );
}
