import { useEffect, useRef } from 'react';

/**
 * Accessibility helper for hand-rolled modals (those not built on the shared <Modal>).
 * Adds Escape-to-close, moves focus into the dialog on open, and restores focus to the
 * previously-focused element on close — without changing any visual styling.
 *
 * Usage (call unconditionally, pass the modal's open flag + close handler):
 *   const dialogRef = useModalA11y(isOpen, onClose);
 *   ...
 *   <div className="fixed inset-0 ..." role="presentation"
 *        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
 *     <div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="x-title" ...>
 *
 * Attach the returned ref to the inner panel element.
 */
export function useModalA11y(isOpen: boolean, onClose: () => void) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) {return;}
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') {onClose();} };
    document.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  return dialogRef;
}
