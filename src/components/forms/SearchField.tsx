import { useState, type ChangeEvent, type CSSProperties } from 'react';
import { Icon } from '../core/Icon';

export interface SearchFieldProps {
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  onSubmit?: (value?: string) => void;
  onClear?: () => void;
  size?: 'md' | 'lg';
  style?: CSSProperties;
}

/** Pill search input — the app's main entry point. */
export function SearchField({
  value,
  onChange,
  placeholder = 'Search a city or a craving',
  onSubmit,
  size = 'md',
  onClear,
  style,
}: SearchFieldProps) {
  const [focus, setFocus] = useState(false);
  const h = size === 'lg' ? 52 : 44;
  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.(value);
      }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: h,
        padding: '0 14px',
        borderRadius: 'var(--radius-pill)',
        background: 'var(--surface-card)',
        border: `1px solid ${focus ? 'var(--border-focus)' : 'var(--border-hairline)'}`,
        boxShadow: focus ? 'var(--shadow-focus)' : 'var(--shadow-sm)',
        transition: 'var(--transition-color), var(--transition-shadow)',
        ...style,
      }}
    >
      <Icon name="search" size={18} color="var(--text-faint)" />
      <input
        aria-label={placeholder}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          flex: 1,
          minWidth: 0,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          font: size === 'lg' ? 'var(--type-body-lg)' : 'var(--type-body)',
          color: 'var(--text-heading)',
        }}
      />
      {value && onClear ? (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          style={{
            cursor: 'pointer',
            display: 'inline-flex',
            background: 'none',
            border: 'none',
            padding: 0,
          }}
        >
          <Icon name="x" size={16} color="var(--text-faint)" />
        </button>
      ) : null}
    </form>
  );
}
