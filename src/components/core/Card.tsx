import { useState, type CSSProperties, type ElementType, type ReactNode } from 'react';

export interface CardProps {
  children?: ReactNode;
  padding?: string | number;
  interactive?: boolean;
  elevation?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
  radius?: string;
  as?: ElementType;
  style?: CSSProperties;
  className?: string;
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
  className,
  onClick,
}: CardProps) {
  const [hover, setHover] = useState(false);
  return (
    <El
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      // Real lift-on-hover for anything tappable, on top of the existing
      // shadow/border-colour swap below — a flat colour change alone reads
      // as "the mouse moved over some text," not "this is a card."
      className={interactive ? `madli-hover-lift ${className ?? ''}`.trim() : className}
      style={{
        background: 'var(--surface-card)',
        // Split rather than the `border` shorthand: React warns (and can
        // misbehave) when a later render mixes a shorthand property with a
        // longhand override of just one of its parts — exactly what
        // conditionally setting `borderColor` alongside a static `border`
        // used to do here.
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor: interactive && hover ? 'var(--border-strong)' : 'var(--border-hairline)',
        borderRadius: radius,
        padding,
        boxShadow: SHADOWS[elevation],
        transition: 'var(--transition-shadow), var(--transition-color)',
        cursor: interactive ? 'pointer' : undefined,
        ...style,
      }}
    >
      {children}
    </El>
  );
}
