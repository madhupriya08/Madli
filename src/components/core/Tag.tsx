import { useState, type CSSProperties, type ReactNode } from 'react';
import { Icon } from './Icon';

export interface TagProps {
  children?: ReactNode;
  icon?: string;
  selected?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  /** Screen-reader label for the remove control. Defaults to "Remove". */
  removeLabel?: string;
  style?: CSSProperties;
}

/** Filter chip. Selectable, optionally removable. 6px radius — never reads as a badge. */
export function Tag({
  children,
  icon,
  selected = false,
  onClick,
  onRemove,
  removeLabel = 'Remove',
  style,
}: TagProps) {
  const [hover, setHover] = useState(false);
  const interactive = !!onClick;
  return (
    <span
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        font: 'var(--type-body-sm)',
        padding: onRemove ? '6px 8px 6px 11px' : '6px 11px',
        borderRadius: 'var(--radius-sm)',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'var(--transition-color)',
        background: selected ? 'var(--teal-500)' : 'var(--surface-sunken)',
        color: selected ? 'var(--text-on-dark)' : 'var(--text-body)',
        border: `1px solid ${selected ? 'var(--teal-500)' : 'var(--border-hairline)'}`,
        ...(interactive && hover && !selected ? { background: 'var(--slate-200)' } : {}),
        ...style,
      }}
    >
      {icon ? <Icon name={icon} size={14} /> : null}
      {children}
      {onRemove ? (
        <span
          role="button"
          aria-label={removeLabel}
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }
          }}
          style={{ display: 'inline-flex', cursor: 'pointer', opacity: 0.6 }}
        >
          <Icon name="x" size={13} />
        </span>
      ) : null}
    </span>
  );
}
