import { useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'quiet' | 'inverse';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps {
  children?: ReactNode;
  /** primary = Deep Teal; accent = Coral, reserved for one CTA per view */
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  disabled?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  type?: 'button' | 'submit' | 'reset';
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  style?: CSSProperties;
}

const SIZES: Record<
  ButtonSize,
  { height: number; padding: string; font: string; radius: string; gap: number }
> = {
  sm: {
    height: 36,
    padding: '0 14px',
    font: 'var(--type-body-sm)',
    radius: 'var(--radius-sm)',
    gap: 6,
  },
  md: {
    height: 44,
    padding: '0 20px',
    font: 'var(--type-label)',
    radius: 'var(--radius-md)',
    gap: 8,
  },
  lg: {
    height: 52,
    padding: '0 26px',
    font: 'var(--type-body-lg)',
    radius: 'var(--radius-md)',
    gap: 10,
  },
};

const VARIANTS: Record<ButtonVariant, CSSProperties> = {
  primary: {
    background: 'var(--action-primary)',
    color: 'var(--text-on-dark)',
    border: '1px solid transparent',
    boxShadow: 'var(--shadow-xs)',
  },
  accent: {
    background: 'var(--action-accent)',
    color: 'var(--text-on-dark)',
    border: '1px solid transparent',
    boxShadow: 'var(--shadow-xs)',
  },
  secondary: {
    background: 'var(--surface-card)',
    color: 'var(--text-heading)',
    border: '1px solid var(--border-strong)',
    boxShadow: 'var(--shadow-xs)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--text-body)',
    border: '1px solid transparent',
    boxShadow: 'none',
  },
  quiet: {
    background: 'var(--surface-sunken)',
    color: 'var(--text-heading)',
    border: '1px solid transparent',
    boxShadow: 'none',
  },
  inverse: {
    background: 'var(--white)',
    color: 'var(--teal-800)',
    border: '1px solid transparent',
    boxShadow: 'none',
  },
};

const HOVER: Record<ButtonVariant, string> = {
  primary: 'var(--action-primary-hover)',
  accent: 'var(--action-accent-hover)',
  secondary: 'var(--slate-50)',
  ghost: 'var(--action-ghost-hover)',
  quiet: 'var(--slate-200)',
  inverse: 'var(--slate-100)',
};

/** Primary action control. */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  block = false,
  disabled = false,
  iconLeft,
  iconRight,
  type = 'button',
  onClick,
  style,
}: ButtonProps) {
  const [hover, setHover] = useState(false);
  const [press, setPress] = useState(false);
  const s = SIZES[size];
  const v = VARIANTS[variant];
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => {
        setHover(false);
        setPress(false);
      }}
      onMouseDown={() => setPress(true)}
      onMouseUp={() => setPress(false)}
      style={{
        display: block ? 'flex' : 'inline-flex',
        width: block ? '100%' : undefined,
        alignItems: 'center',
        justifyContent: 'center',
        gap: s.gap,
        height: s.height,
        padding: s.padding,
        font: s.font,
        letterSpacing: '0.01em',
        borderRadius: s.radius,
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition:
          'var(--transition-color), var(--transition-shadow), var(--transition-transform)',
        whiteSpace: 'nowrap',
        textAlign: 'center',
        ...v,
        ...(disabled
          ? {
              background: 'var(--action-disabled-bg)',
              color: 'var(--action-disabled-text)',
              border: '1px solid transparent',
              boxShadow: 'none',
            }
          : {}),
        ...(!disabled &&
        hover &&
        !press &&
        (variant === 'primary' || variant === 'accent' || variant === 'secondary')
          ? { transform: 'translateY(-1px)', boxShadow: 'var(--shadow-md)' }
          : {}),
        ...(!disabled && hover ? { background: HOVER[variant] } : {}),
        ...(!disabled && press ? { transform: 'var(--press-translate)', boxShadow: 'none' } : {}),
        ...style,
      }}
    >
      {iconLeft}
      {children}
      {iconRight}
    </button>
  );
}
