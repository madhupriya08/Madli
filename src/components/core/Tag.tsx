import { useState, type CSSProperties, type ReactNode } from 'react';
import { Icon } from './Icon';

export interface TagProps {
  children?: ReactNode;
  icon?: string;
  selected?: boolean;
  /**
   * 'solid' (default) is a real choice made — teal fill, white text.
   * 'outline' is a soft, low-emphasis highlight: a tinted border and text,
   * no fill. For the one chip in a single-select group that represents "no
   * preference set" (e.g. Filters' "Any distance") — it needs to read as
   * the group's current, clickable, active state without looking like a
   * requirement the way a real 'solid' selection does. Ignored when
   * `selected` is false.
   */
  tone?: 'solid' | 'outline';
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
  tone = 'solid',
  onClick,
  onRemove,
  removeLabel = 'Remove',
  style,
}: TagProps) {
  const [hover, setHover] = useState(false);
  const interactive = !!onClick;
  const outline = selected && tone === 'outline';
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
      className={interactive ? 'madli-press' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        font: 'var(--type-body-sm)',
        padding: onRemove ? '6px 8px 6px 11px' : '6px 11px',
        borderRadius: 'var(--radius-sm)',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'var(--transition-color), var(--transition-transform)',
        background: selected
          ? outline
            ? 'var(--teal-50)'
            : 'var(--teal-500)'
          : 'var(--surface-sunken)',
        color: selected
          ? outline
            ? 'var(--teal-700)'
            : 'var(--text-on-dark)'
          : 'var(--text-body)',
        // Longhand, not the `border` shorthand — a static shorthand mixed
        // with a conditional `borderColor` override across renders is what
        // triggers React's "don't mix shorthand and non-shorthand" warning.
        borderWidth: 1,
        borderStyle: 'solid',
        borderColor:
          interactive && hover
            ? 'var(--teal-400)'
            : selected
              ? 'var(--teal-500)'
              : 'var(--border-hairline)',
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
