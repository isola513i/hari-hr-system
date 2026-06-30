import React from 'react';
import { useTranslation } from 'react-i18next';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Loading spinner component
 * Shows animated spinner with optional message
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  size = 'md',
  className = '',
}) => {
  const { t } = useTranslation('common');
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  return (
    <div className={`flex flex-col items-center justify-center p-8 ${className}`}>
      <div
        className={`animate-spin rounded-full border-b-2 border-primary ${sizeClasses[size]}`}
        role="status"
        aria-label={t('aria.loading')}
      />
      {message && (
        <p className="mt-4 text-text-muted-light dark:text-text-muted-dark text-sm">
          {message}
        </p>
      )}
    </div>
  );
};

/**
 * Inline loading spinner (smaller, for buttons or inline use)
 */
export const InlineSpinner: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useTranslation('common');
  return (
    <div
      className={`inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-current ${className}`}
      role="status"
      aria-label={t('aria.loading')}
    />
  );
};

/**
 * Full page loading overlay
 */
export const LoadingOverlay: React.FC<{ message?: string }> = ({
  message = 'Loading...',
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card-light dark:bg-card-dark rounded-xl p-8 shadow-2xl">
        <LoadingSpinner message={message} size="lg" />
      </div>
    </div>
  );
};
