import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'lg' | 'xl';
}

/** Accessible modal dialog: Escape to close, backdrop click to close, focus on open. */
export function Modal({ open, onClose, title, children, footer, size }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Keep the latest onClose in a ref so the focus/keydown effect below can depend
  // only on `open`. Otherwise a fresh inline `onClose` on every parent render would
  // re-run the effect and steal focus from inputs while the user is typing.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusable = () =>
      Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      // Trap Tab focus within the dialog.
      if (e.key === 'Tab') {
        const items = focusable();
        if (items.length === 0) return;
        const first = items[0]!;
        const last = items[items.length - 1]!;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    // On open, focus the first form field if there is one, else the first
    // interactive element, falling back to the dialog container.
    const firstField = dialogRef.current?.querySelector<HTMLElement>('input, textarea, select');
    (firstField ?? focusable()[0] ?? dialogRef.current)?.focus();

    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div className="modal fade show d-block" role="dialog" aria-modal="true" aria-label={title}>
        <div className={`modal-dialog modal-dialog-centered ${size ? `modal-${size}` : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className="modal-content" ref={dialogRef} tabIndex={-1}>
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="btn-close" aria-label="Close" onClick={onClose} />
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
    </>
  );
}
