import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

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

const ANIMATION_MS = 300;

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  duration = 3000,
  onClose,
}) => {
  const { t } = useTranslation('common');
  const [isExiting, setIsExiting] = useState(false);

  const triggerExit = useCallback(() => {
    if (isExiting) return;
    setIsExiting(true);
    setTimeout(onClose, ANIMATION_MS);
  }, [onClose, isExiting]);

  useEffect(() => {
    if (duration <= 0) return;
    const timer = setTimeout(triggerExit, duration);
    return () => clearTimeout(timer);
  }, [duration, triggerExit]);

  const config = TOAST_CONFIG[type];
  const { Icon } = config;

  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`
        fixed z-[9999]
        top-4 inset-x-4
        md:top-auto md:bottom-4 md:right-4 md:left-auto md:w-96
        overflow-hidden
        flex items-start gap-3
        bg-white dark:bg-gray-800
        border-l-4 ${config.borderColor}
        rounded-lg
        ring-1 ring-black/5 dark:ring-white/10
        shadow-lg
        p-4
        ${isExiting ? 'animate-toast-exit' : 'animate-toast-enter'}
      `}
    >
      {/* Icon with colored circle */}
      <div className={`flex-shrink-0 rounded-full p-1.5 ${config.iconBg}`}>
        <Icon className="w-4 h-4 text-white" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{config.title}</p>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">{message}</p>
      </div>

      {/* Close button */}
      <button
        onClick={triggerExit}
        className="flex-shrink-0 p-0.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label={t('aria.dismissNotification')}
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress bar */}
      {duration > 0 && !isExiting && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-100 dark:bg-gray-700">
          <div
            className={`h-full ${config.progressColor} opacity-60 rounded-br`}
            style={{ animation: `toast-progress ${duration}ms linear forwards` }}
          />
        </div>
      )}
    </div>
  );
};
