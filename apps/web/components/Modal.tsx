import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  maxWidth = 'md'
}) => {
  const { t } = useTranslation('common');
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape; move focus into the dialog on open and restore it on close.
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    dialogRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      previouslyFocused?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const widthClass = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  }[maxWidth];

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 md:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="presentation"
      aria-label={t('common:modal.backdropDismiss', { defaultValue: 'Press Escape or click outside to close' })}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`bg-card-light dark:bg-card-dark rounded-xl shadow-xl border border-border-light dark:border-border-dark w-full max-w-full ${widthClass} overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] focus:outline-none`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
      >
        {title && (
          <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-border-light dark:border-border-dark flex justify-between items-center bg-gray-50 dark:bg-gray-800/50 shrink-0">
            <h3 id="modal-title" className="font-bold text-lg text-text-light dark:text-text-dark">
              {title}
            </h3>
            <button
              onClick={onClose}
              aria-label={t('common:buttons.close', { defaultValue: 'Close' })}
              className="p-2 -m-2 rounded-lg text-text-muted-light hover:text-text-light dark:hover:text-text-dark transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
