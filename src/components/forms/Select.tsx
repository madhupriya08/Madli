import { useId, type ChangeEvent, type CSSProperties } from 'react';
import { Icon } from '../core/Icon';

export type SelectOption = string | { value: string; label: string };

export interface SelectProps {
  label?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLSelectElement>) => void;
  options?: SelectOption[];
  hint?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  style?: CSSProperties;
}

export function Select({
  label,
  value,
  onChange,
  options = [],
  hint,
  disabled = false,
  id,
  name,
  style,
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label ? (
        <label
          htmlFor={selectId}
          style={{ font: 'var(--type-label)', color: 'var(--text-heading)' }}
        >
          {label}
        </label>
      ) : null}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <select
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          style={{
            appearance: 'none',
            width: '100%',
            height: 44,
            padding: '0 38px 0 12px',
            borderRadius: 'var(--radius-md)',
            background: disabled ? 'var(--surface-sunken)' : 'var(--surface-card)',
            border: '1px solid var(--border-strong)',
            font: 'var(--type-body)',
            color: 'var(--text-heading)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            outline: 'none',
          }}
        >
          {options.map((o) => {
            const val = typeof o === 'string' ? o : o.value;
            const lbl = typeof o === 'string' ? o : o.label;
            return (
              <option key={val} value={val}>
                {lbl}
              </option>
            );
          })}
        </select>
        <Icon
          name="chevron-down"
          size={17}
          color="var(--text-muted)"
          style={{ position: 'absolute', right: 12, pointerEvents: 'none' }}
        />
      </div>
      {hint ? (
        <span style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>{hint}</span>
      ) : null}
    </div>
  );
}
