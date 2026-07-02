import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { MapPin, Shield, X, Settings, AlertTriangle, CheckCircle } from 'lucide-react';
import { useModalA11y } from '../hooks/useModalA11y';

interface Props {
  mode: 'request' | 'denied';
  onAllow: () => void;
  onDismiss: () => void;
}

export function LocationPermissionModal({ mode, onAllow, onDismiss }: Props) {
  const { t } = useTranslation(['attendance', 'common']);
  const dialogRef = useModalA11y(true, onDismiss);
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) {onDismiss();} }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'request' ? t('locationPermission.requestTitle') : t('locationPermission.deniedTitle')}
        className="bg-card-light dark:bg-card-dark w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl border border-border-light dark:border-border-dark animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-300 overflow-hidden">

        {/* Drag handle for mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-gray-300 dark:bg-gray-600" />
        </div>

        {/* Close button */}
        <div className="flex justify-end px-4 pt-2 sm:pt-4">
          <button
            onClick={onDismiss}
            aria-label={t('common:buttons.close')}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-1"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 pb-8">
          {mode === 'request' ? (
            <RequestContent onAllow={onAllow} onDismiss={onDismiss} />
          ) : (
            <DeniedContent onDismiss={onDismiss} />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function RequestContent({ onAllow, onDismiss }: { onAllow: () => void; onDismiss: () => void }) {
  const { t } = useTranslation('attendance');
  return (
    <>
      {/* Icon */}
      <div className="flex justify-center mb-5">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
            <MapPin size={36} className="text-blue-500 dark:text-blue-400" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center border-2 border-white dark:border-card-dark">
            <Shield size={14} className="text-green-500 dark:text-green-400" />
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-center text-text-light dark:text-text-dark mb-2">
        {t('locationPermission.requestTitle')}
      </h2>
      <p className="text-sm text-center text-text-muted-light dark:text-text-muted-dark mb-5 leading-relaxed">
        {t('locationPermission.requestDesc')}
      </p>

      {/* Permission features */}
      <div className="space-y-2.5 mb-6">
        {[
          t('locationPermission.feature1'),
          t('locationPermission.feature2'),
          t('locationPermission.feature3'),
        ].map((text) => (
          <div key={text} className="flex items-start gap-2.5">
            <CheckCircle size={16} className="text-green-500 mt-0.5 shrink-0" />
            <span className="text-xs text-text-muted-light dark:text-text-muted-dark">{text}</span>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <button
        onClick={onAllow}
        className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm transition-colors mb-3"
      >
        {t('locationPermission.allowBtn')}
      </button>
      <button
        onClick={onDismiss}
        className="w-full py-3 rounded-xl text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark text-sm font-medium transition-colors"
      >
        {t('locationPermission.notNow')}
      </button>
    </>
  );
}

function DeniedContent({ onDismiss }: { onDismiss: () => void }) {
  const { t } = useTranslation('attendance');
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  const steps = isIOS
    ? [
        t('locationPermission.iosStep1'),
        t('locationPermission.iosStep2'),
        t('locationPermission.iosStep3'),
        t('locationPermission.iosStep4'),
      ]
    : isAndroid
    ? [
        t('locationPermission.androidStep1'),
        t('locationPermission.androidStep2'),
        t('locationPermission.androidStep3'),
      ]
    : [
        t('locationPermission.desktopStep1'),
        t('locationPermission.desktopStep2'),
        t('locationPermission.desktopStep3'),
      ];

  return (
    <>
      {/* Icon */}
      <div className="flex justify-center mb-5">
        <div className="w-20 h-20 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
          <AlertTriangle size={36} className="text-orange-500 dark:text-orange-400" />
        </div>
      </div>

      <h2 className="text-xl font-bold text-center text-text-light dark:text-text-dark mb-2">
        {t('locationPermission.deniedTitle')}
      </h2>
      <p className="text-sm text-center text-text-muted-light dark:text-text-muted-dark mb-5 leading-relaxed">
        {t('locationPermission.deniedDesc')}
      </p>

      {/* Steps */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Settings size={14} className="text-text-muted-light dark:text-text-muted-dark" />
          <span className="text-xs font-semibold text-text-muted-light dark:text-text-muted-dark uppercase tracking-wide">
            {t('locationPermission.howToEnable')}
          </span>
        </div>
        <ol className="space-y-2">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                {i + 1}
              </span>
              <span className="text-xs text-text-light dark:text-text-dark leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      </div>

      <button
        onClick={onDismiss}
        className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold text-sm transition-colors"
      >
        {t('locationPermission.okBtn')}
      </button>
    </>
  );
}
