import { useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { Icon } from './Icon';

export type IconButtonSize = 'sm' | 'md' | 'lg';
export type IconButtonVariant = 'ghost' | 'outline' | 'solid' | 'onImage';

export interface IconButtonProps {
  /** Lucide slug or a rendered node */
  icon: string | ReactNode;
  /** Required accessible label */
  label: string;
  size?: IconButtonSize;
  variant?: IconButtonVariant;
  disabled?: boolean;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
  style?: CSSProperties;
}

const SIZES: Record<IconButtonSize, number> = { sm: 32, md: 40, lg: 44 };

const SKINS: Record<
  IconButtonVariant,
  { background: string; color: string; border: string; hover: string }
> = {
  ghost: {
    background: 'transparent',
    color: 'var(--text-body)',
    border: '1px solid transparent',
    hover: 'var(--action-ghost-hover)',
  },
  outline: {
    background: 'var(--surface-card)',
    color: 'var(--text-heading)',
    border: '1px solid var(--border-strong)',
    hover: 'var(--slate-50)',
  },
  solid: {
    background: 'var(--action-primary)',
    color: 'var(--text-on-dark)',
    border: '1px solid transparent',
    hover: 'var(--action-primary-hover)',
  },
  onImage: {
    background: 'rgba(255,255,255,0.9)',
    color: 'var(--teal-800)',
    border: '1px solid transparent',
    hover: 'var(--white)',
  },
};

/** Square icon-only control, minimum 32px, 44px in touch contexts. */
export function IconButton({
  icon,
  label,
  size = 'md',
  variant = 'ghost',
  disabled = false,
  onClick,
  style,
}: IconButtonProps) {
  const [hover, setHover] = useState(false);
  const box = SIZES[size];
  const sk = SKINS[variant];
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={disabled ? undefined : 'madli-press'}
      style={{
        width: box,
        height: box,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-md)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'var(--transition-color)',
        background: sk.background,
        color: sk.color,
        border: sk.border,
        ...(hover && !disabled ? { background: sk.hover } : {}),
        ...(disabled ? { color: 'var(--action-disabled-text)' } : {}),
        ...style,
      }}
    >
      {typeof icon === 'string' ? <Icon name={icon} size={size === 'sm' ? 16 : 20} /> : icon}
    </button>
  );
}
