import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Toast, type ToastTone } from './Toast';

interface ToastItem {
  id: number;
  message: string;
  tone: ToastTone;
  actionLabel?: string;
  action?: () => void;
}

interface ToastContextValue {
  show: (
    message: string,
    opts?: { tone?: ToastTone; actionLabel?: string; action?: () => void },
  ) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

/** App-level notification/toast system (§9 "App-level" completeness requirement). */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback<ToastContextValue['show']>((message, opts) => {
    const id = nextId++;
    setItems((prev) => [
      ...prev,
      {
        id,
        message,
        tone: opts?.tone ?? 'neutral',
        actionLabel: opts?.actionLabel,
        action: opts?.action,
      },
    ]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          left: '50%',
          transform: 'translateX(-50%)',
          bottom: 'calc(var(--space-9) + env(safe-area-inset-bottom, 0px))',
          zIndex: 80,
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-2)',
          width: 'min(92vw, 420px)',
        }}
      >
        {items.map((t) => (
          <Toast
            key={t.id}
            tone={t.tone}
            actionLabel={t.actionLabel}
            action={t.action}
            onDismiss={() => setItems((prev) => prev.filter((i) => i.id !== t.id))}
          >
            {t.message}
          </Toast>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
