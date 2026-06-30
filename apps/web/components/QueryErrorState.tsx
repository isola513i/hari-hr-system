import React from 'react';
import { useTranslation } from 'react-i18next';
import { ExclamationTriangleIcon, WifiIcon } from '@heroicons/react/24/outline';

interface QueryErrorStateProps {
  error: Error | null;
  onRetry?: () => void;
  message?: string;
}

function isNetworkError(error: Error | null): boolean {
  if (!error) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('network') ||
    msg.includes('failed to fetch') ||
    msg.includes('net::') ||
    msg.includes('networkerror')
  );
}

const QueryErrorState: React.FC<QueryErrorStateProps> = ({ error, onRetry, message }) => {
  const { t } = useTranslation('common');
  const networkError = isNetworkError(error);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
        networkError
          ? 'bg-orange-100 dark:bg-orange-900/20'
          : 'bg-red-100 dark:bg-red-900/20'
      }`}>
        {networkError ? (
          <WifiIcon className="w-7 h-7 text-orange-500" />
        ) : (
          <ExclamationTriangleIcon className="w-7 h-7 text-red-500" />
        )}
      </div>

      <h3 className="text-lg font-semibold text-text-light dark:text-text-dark mb-1">
        {networkError ? t('queryError.noInternet') : t('queryError.couldNotLoad')}
      </h3>
      <p className="text-sm text-text-muted-light dark:text-text-muted-dark max-w-sm mb-6">
        {message ??
          (networkError
            ? t('queryError.checkConnection')
            : t('queryError.genericMessage'))}
      </p>

      {onRetry && (
        <button
          onClick={onRetry}
          className="px-5 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary-hover transition-colors text-sm"
        >
          {t('errors.tryAgain')}
        </button>
      )}
    </div>
  );
};

export default QueryErrorState;
