import { useId, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';
import { Icon } from '../core/Icon';

export interface InputProps {
  label?: string;
  hint?: string;
  error?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  /** Lucide slug rendered inside the field */
  iconLeft?: string;
  suffix?: ReactNode;
  disabled?: boolean;
  id?: string;
  name?: string;
  autoComplete?: string;
  maxLength?: number;
  style?: CSSProperties;
}

export function Input({
  label,
  hint,
  error,
  value,
  onChange,
  placeholder,
  type = 'text',
  iconLeft,
  suffix,
  disabled = false,
  id,
  name,
  autoComplete,
  maxLength,
  style,
}: InputProps) {
  const [focus, setFocus] = useState(false);
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = !error && hint ? `${inputId}-hint` : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>
      {label ? (
        <label
          htmlFor={inputId}
          style={{ font: 'var(--type-label)', color: 'var(--text-heading)' }}
        >
          {label}
        </label>
      ) : null}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          height: 44,
          padding: '0 12px',
          borderRadius: 'var(--radius-md)',
          background: disabled ? 'var(--surface-sunken)' : 'var(--surface-card)',
          border: `1px solid ${error ? 'var(--red-500)' : focus ? 'var(--border-focus)' : 'var(--border-strong)'}`,
          boxShadow: focus && !error ? 'var(--shadow-focus)' : 'none',
          transition: 'var(--transition-color), var(--transition-shadow)',
        }}
      >
        {iconLeft ? <Icon name={iconLeft} size={17} color="var(--text-faint)" /> : null}
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          maxLength={maxLength}
          aria-invalid={!!error}
          aria-describedby={errorId ?? hintId}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          style={{
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            font: 'var(--type-body)',
            color: 'var(--text-heading)',
          }}
        />
        {suffix ? (
          <span style={{ font: 'var(--type-caption)', color: 'var(--text-faint)' }}>{suffix}</span>
        ) : null}
      </div>
      {error ? (
        <span
          id={errorId}
          role="alert"
          style={{ font: 'var(--type-caption)', color: 'var(--status-error-fg)' }}
        >
          {error}
        </span>
      ) : hint ? (
        <span id={hintId} style={{ font: 'var(--type-caption)', color: 'var(--text-muted)' }}>
          {hint}
        </span>
      ) : null}
    </div>
  );
}
