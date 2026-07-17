import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';
interface ToastItem {
  id: number;
  type: ToastType;
  title?: string;
  message: string;
}

interface ToastApi {
  toast: (opts: { type?: ToastType; title?: string; message: string }) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const ICONS: Record<ToastType, string> = {
  success: 'bi-check-circle-fill',
  error: 'bi-exclamation-octagon-fill',
  info: 'bi-info-circle-fill',
  warning: 'bi-exclamation-triangle-fill',
};
const COLORS: Record<ToastType, string> = {
  success: 'text-success',
  error: 'text-danger',
  info: 'text-info',
  warning: 'text-warning',
};

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastApi['toast']>(
    ({ type = 'info', title, message }) => {
      const id = ++counter;
      setItems((prev) => [...prev, { id, type, title, message }]);
      window.setTimeout(() => remove(id), 5000);
    },
    [remove],
  );

  const api: ToastApi = {
    toast,
    success: (message, title) => toast({ type: 'success', message, title }),
    error: (message, title) => toast({ type: 'error', message, title }),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="toast-container position-fixed top-0 end-0 p-3"
        style={{ zIndex: 1080 }}
        aria-live="polite"
        aria-atomic="true"
      >
        {items.map((t) => (
          <div key={t.id} className="toast show align-items-center border-0 shadow-sm mb-2" role="alert">
            <div className="d-flex">
              <div className="toast-body d-flex align-items-start gap-2">
                <i className={`bi ${ICONS[t.type]} ${COLORS[t.type]} mt-1`} aria-hidden="true" />
                <div>
                  {t.title && <div className="fw-semibold">{t.title}</div>}
                  <div className="text-body-secondary">{t.message}</div>
                </div>
              </div>
              <button
                type="button"
                className="btn-close me-2 m-auto"
                aria-label="Dismiss notification"
                onClick={() => remove(t.id)}
              />
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
