import { useId, type CSSProperties, type MouseEvent, type ReactNode } from 'react';
import { IconButton } from '../core/IconButton';

export interface DialogProps {
  open?: boolean;
  variant?: 'modal' | 'sheet';
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  footer?: ReactNode;
  children?: ReactNode;
  width?: number;
  style?: CSSProperties;
}

/** Centred modal on desktop, bottom sheet on the phone. */
export function Dialog({
  open = true,
  variant = 'modal',
  title,
  subtitle,
  onClose,
  footer,
  children,
  width = 460,
  style,
}: DialogProps) {
  const titleId = useId();
  if (!open) return null;
  const sheet = variant === 'sheet';

  const handleScrimClick = (e: MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
        display: 'flex',
        alignItems: sheet ? 'flex-end' : 'center',
        justifyContent: 'center',
        background: 'var(--scrim-flat)',
        padding: sheet ? 0 : 'var(--space-6)',
        animation: 'madli-fade-up var(--dur-base) var(--ease-out)',
      }}
      onClick={handleScrimClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        style={{
          width: sheet ? '100%' : `min(100%, ${width}px)`,
          background: 'var(--surface-card)',
          borderRadius: sheet ? 'var(--radius-2xl) var(--radius-2xl) 0 0' : 'var(--radius-xl)',
          boxShadow: sheet ? 'var(--shadow-sheet)' : 'var(--shadow-lg)',
          padding: 'var(--space-6)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
          maxHeight: '90vh',
          overflowY: 'auto',
          ...style,
        }}
      >
        {sheet ? (
          <span
            aria-hidden
            style={{
              width: 36,
              height: 4,
              borderRadius: 'var(--radius-pill)',
              background: 'var(--border-strong)',
              alignSelf: 'center',
              marginTop: -8,
            }}
          />
        ) : null}
        {title ? (
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <h3 id={titleId} style={{ font: 'var(--type-h3)' }}>
                {title}
              </h3>
              {subtitle ? (
                <p style={{ font: 'var(--type-body-sm)', color: 'var(--text-muted)' }}>
                  {subtitle}
                </p>
              ) : null}
            </div>
            {onClose && !sheet ? (
              <IconButton
                icon="x"
                label="Close"
                size="sm"
                onClick={onClose}
                style={{ marginRight: -6, marginTop: -4 }}
              />
            ) : null}
          </div>
        ) : null}
        {children}
        {footer ? (
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)' }}>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
