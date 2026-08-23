import {
  useEffect,
  useId,
  useRef,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { IconButton } from '../core/IconButton';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  const panelRef = useRef<HTMLDivElement>(null);
  // onClose is an inline arrow function at nearly every call site, so its
  // identity changes on every parent re-render (e.g. every keystroke in a
  // sibling input). Reading it via a ref, rather than as an effect
  // dependency, keeps the setup effect below from re-running — and
  // re-stealing focus — on every such render. Found as a real regression
  // this introduced in PrivacySettingsScreen's delete-confirmation input
  // (Phase 4 §9): typing was interrupted because the dialog kept
  // re-focusing itself on every keystroke.
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });

  // Real modal focus management (found missing in the Phase 4 §9
  // keyboard-only pass — this component had role="dialog"/aria-modal but no
  // actual focus behavior): move focus into the dialog on open, trap
  // Tab/Shift+Tab within it, close on Escape, and restore focus to whatever
  // triggered it on close. Every screen using Dialog (9 of them) gets this
  // for free. Runs once per open/close transition only (see onCloseRef above
  // for why onClose itself isn't a dependency).
  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const firstFocusable = panel?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstFocusable ?? panel)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab' || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [open]);

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
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
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
