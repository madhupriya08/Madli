import type { CSSProperties } from 'react';

export type TabItem = string | { value: string; label: string };

export interface TabsProps {
  items?: TabItem[];
  value?: string;
  onChange?: (value: string) => void;
  size?: 'sm' | 'md';
  style?: CSSProperties;
}

/** Segmented scope switch (Eat / Do / Stay). */
export function Tabs({ items = [], value, onChange, size = 'md', style }: TabsProps) {
  const h = size === 'sm' ? 34 : 40;
  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex',
        gap: 2,
        padding: 3,
        height: h + 6,
        background: 'var(--surface-sunken)',
        borderRadius: 'var(--radius-md)',
        ...style,
      }}
    >
      {items.map((it) => {
        const v = typeof it === 'string' ? it : it.value;
        const label = typeof it === 'string' ? it : it.label;
        const active = v === value;
        return (
          <button
            key={v}
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(v)}
            className="madli-tab-active"
            style={{
              height: h,
              padding: '0 16px',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 'var(--radius-sm)',
              font: 'var(--type-label)',
              background: active ? 'var(--surface-card)' : 'transparent',
              color: active ? 'var(--text-heading)' : 'var(--text-muted)',
              boxShadow: active ? 'var(--shadow-xs)' : 'none',
              transform: active ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
