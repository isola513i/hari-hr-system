import React from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToast, Toast as ToastData, ToastType } from '../contexts/ToastContext';

// ── Type-based style maps ──────────────────────────────────────────────────

const TOAST_CONFIG: Record<
  ToastType,
  { title: string; borderColor: string; iconBg: string; progressColor: string; Icon: React.ElementType }
> = {
  success: {
    title: 'Success',
    borderColor: 'border-l-green-500',
    iconBg: 'bg-green-500',
    progressColor: 'bg-green-500',
    Icon: CheckCircle2,
  },
  error: {
    title: 'Error',
    borderColor: 'border-l-red-500',
    iconBg: 'bg-red-500',
    progressColor: 'bg-red-500',
    Icon: XCircle,
  },
  warning: {
    title: 'Warning',
    borderColor: 'border-l-amber-500',
    iconBg: 'bg-amber-500',
    progressColor: 'bg-amber-500',
    Icon: AlertTriangle,
  },
  info: {
    title: 'Information',
    borderColor: 'border-l-blue-500',
    iconBg: 'bg-blue-500',
    progressColor: 'bg-blue-500',
    Icon: Info,
  },
};

// ── Single toast item ──────────────────────────────────────────────────────

const ToastItem: React.FC<{ toast: ToastData; onClose: () => void }> = ({ toast, onClose }) => {
  const { t } = useTranslation('common');
  const config = TOAST_CONFIG[toast.type];
  const { Icon } = config;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        relative overflow-hidden
        flex items-start gap-3
        w-full
        bg-white dark:bg-gray-800
        border-l-4 ${config.borderColor}
        rounded-lg
        ring-1 ring-black/5 dark:ring-white/10
        shadow-lg
        p-4
        ${toast.isExiting ? 'animate-toast-exit' : 'animate-toast-enter'}
      `}
    >
      {/* Icon with colored circle */}
      <div className={`flex-shrink-0 rounded-full p-1.5 ${config.iconBg}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {toast.title || config.title}
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">
          {toast.message}
        </p>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="flex-shrink-0 p-0.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label={t('aria.dismissNotification')}
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress bar */}
      {toast.duration > 0 && !toast.isExiting && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100 dark:bg-gray-700">
          <div
            className={`h-full ${config.progressColor} opacity-60 rounded-br`}
            style={{
              animation: `toast-progress ${toast.duration}ms linear forwards`,
            }}
          />
        </div>
      )}
    </div>
  );
};

// ── Container ──────────────────────────────────────────────────────────────

export const ToastContainer: React.FC = () => {
  const { t } = useTranslation('common');
  const { toasts, hideToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <>
      {/* Mobile: top-center */}
      <div
        className="md:hidden fixed top-4 inset-x-4 z-[9999] flex flex-col gap-3"
        aria-label={t('aria.notifications')}
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
        ))}
      </div>

      {/* Desktop: bottom-right */}
      <div
        className="hidden md:flex fixed bottom-4 right-4 z-[9999] flex-col gap-3 w-96"
        aria-label={t('aria.notifications')}
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => hideToast(toast.id)} />
        ))}
      </div>
    </>
  );
};
