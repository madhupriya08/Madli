import type { CSSProperties } from 'react';

export interface SwitchProps {
  label?: string;
  description?: string;
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  style?: CSSProperties;
}

/** Settings toggle, 44x26, label on the left. */
export function Switch({
  label,
  description,
  checked = false,
  onChange,
  disabled = false,
  style,
}: SwitchProps) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        ...style,
      }}
    >
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {label ? (
          <span style={{ font: 'var(--type-body)', color: 'var(--text-heading)' }}>{label}</span>
        ) : null}
        {description ? (
          <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
            {description}
          </span>
        ) : null}
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        style={{ position: 'absolute', opacity: 0, width: 44, height: 26, margin: 0 }}
      />
      <span
        aria-hidden
        style={{
          width: 44,
          height: 26,
          flex: '0 0 auto',
          borderRadius: 'var(--radius-pill)',
          padding: 3,
          display: 'inline-flex',
          alignItems: 'center',
          background: checked ? 'var(--action-primary)' : 'var(--slate-300)',
          transition: 'background-color var(--dur-fast) var(--ease-standard)',
        }}
      >
        <span
          style={{
            width: 20,
            height: 20,
            borderRadius: 'var(--radius-circle)',
            background: 'var(--white)',
            boxShadow: 'var(--shadow-xs)',
            transform: checked ? 'translateX(18px)' : 'translateX(0)',
            transition: 'transform var(--dur-fast) var(--ease-standard)',
          }}
        />
      </span>
    </label>
  );
}
