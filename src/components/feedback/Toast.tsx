import type { CSSProperties, ReactNode } from 'react';
import { Icon } from '../core/Icon';

export type ToastTone = 'neutral' | 'success' | 'warn' | 'error';

export interface ToastProps {
  children?: ReactNode;
  tone?: ToastTone;
  action?: () => void;
  actionLabel?: string;
  onDismiss?: () => void;
  style?: CSSProperties;
}

const TONES: Record<ToastTone, { bg: string; fg: string; icon: string | null }> = {
  neutral: { bg: 'var(--teal-800)', fg: 'var(--white)', icon: null },
  success: { bg: 'var(--teal-800)', fg: 'var(--white)', icon: 'check' },
  warn: { bg: 'var(--amber-600)', fg: 'var(--white)', icon: 'alert-triangle' },
  error: { bg: 'var(--red-600)', fg: 'var(--white)', icon: 'alert-circle' },
};

/** Dark single-line confirmation, sits above the tab bar. */
export function Toast({
  children,
  tone = 'neutral',
  action,
  actionLabel,
  onDismiss,
  style,
}: ToastProps) {
  const t = TONES[tone];
  return (
    <div
      role="status"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--space-3)',
        padding: '12px 14px',
        borderRadius: 'var(--radius-md)',
        background: t.bg,
        color: t.fg,
        boxShadow: 'var(--shadow-lg)',
        font: 'var(--type-body-sm)',
        animation: 'madli-fade-up var(--dur-base) var(--ease-out)',
        ...style,
      }}
    >
      {t.icon ? <Icon name={t.icon} size={17} color="currentColor" /> : null}
      <span style={{ flex: 1 }}>{children}</span>
      {actionLabel ? (
        <button
          onClick={action}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'inherit',
            font: 'var(--type-label)',
            cursor: 'pointer',
            textDecoration: 'underline',
            textUnderlineOffset: 3,
            padding: 0,
          }}
        >
          {actionLabel}
        </button>
      ) : null}
      {onDismiss ? (
        <button
          onClick={onDismiss}
          aria-label="Dismiss"
          style={{
            cursor: 'pointer',
            opacity: 0.7,
            display: 'inline-flex',
            background: 'none',
            border: 'none',
            padding: 0,
          }}
        >
          <Icon name="x" size={15} color="currentColor" />
        </button>
      ) : null}
    </div>
  );
}
