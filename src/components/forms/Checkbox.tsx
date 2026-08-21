import type { CSSProperties } from 'react';
import { Icon } from '../core/Icon';

export interface CheckboxProps {
  label?: string;
  description?: string;
  checked?: boolean;
  onChange?: (next: boolean) => void;
  disabled?: boolean;
  style?: CSSProperties;
}

/** Square checkbox, 20px, optional description line. */
export function Checkbox({
  label,
  description,
  checked = false,
  onChange,
  disabled = false,
  style,
}: CheckboxProps) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: description ? 'flex-start' : 'center',
        gap: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
        ...style,
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        style={{ position: 'absolute', opacity: 0, width: 20, height: 20, margin: 0 }}
      />
      <span
        aria-hidden
        style={{
          width: 20,
          height: 20,
          flex: '0 0 auto',
          marginTop: description ? 2 : 0,
          borderRadius: 'var(--radius-xs)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: checked ? 'var(--action-primary)' : 'var(--surface-card)',
          border: `1px solid ${checked ? 'var(--action-primary)' : 'var(--border-strong)'}`,
          transition: 'var(--transition-color)',
        }}
      >
        {checked ? <Icon name="check" size={14} color="var(--white)" /> : null}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ font: 'var(--type-body)', color: 'var(--text-heading)' }}>{label}</span>
        {description ? (
          <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
            {description}
          </span>
        ) : null}
      </span>
    </label>
  );
}
