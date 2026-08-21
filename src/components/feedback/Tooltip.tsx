import { useId, useState, type CSSProperties, type ReactNode } from 'react';

export interface TooltipProps {
  label?: string;
  children?: ReactNode;
  placement?: 'top' | 'bottom';
  style?: CSSProperties;
}

/** Explains a trust term on hover or focus. */
export function Tooltip({ label, children, placement = 'top', style }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const pos: CSSProperties =
    placement === 'bottom' ? { top: 'calc(100% + 6px)' } : { bottom: 'calc(100% + 6px)' };
  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open && label ? id : undefined}
    >
      {children}
      {open && label ? (
        <span
          id={id}
          role="tooltip"
          style={{
            position: 'absolute',
            left: '50%',
            transform: 'translateX(-50%)',
            ...pos,
            background: 'var(--teal-800)',
            color: 'var(--white)',
            font: 'var(--type-caption)',
            padding: '7px 10px',
            borderRadius: 'var(--radius-sm)',
            width: 'max-content',
            maxWidth: 220,
            boxShadow: 'var(--shadow-md)',
            zIndex: 40,
            animation: 'madli-fade-up var(--dur-fast) var(--ease-out)',
            ...style,
          }}
        >
          {label}
        </span>
      ) : null}
    </span>
  );
}
