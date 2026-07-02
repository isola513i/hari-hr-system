/**
 * BackupCodesModal — View backup code count and regenerate them.
 * Regeneration requires an active 6-digit TOTP code.
 */
import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, KeyRound, Copy, Download, Check, RotateCcw } from 'lucide-react';
import { useTwoFactor } from '../../hooks/useTwoFactor';
import { useModalA11y } from '../../hooks/useModalA11y';

interface BackupCodesModalProps {
  isOpen: boolean;
  onClose: () => void;
  backupCodesRemaining: number;
  isLoading?: boolean;
}

export const BackupCodesModal: React.FC<BackupCodesModalProps> = ({ isOpen, onClose, backupCodesRemaining, isLoading = false }) => {
  const { t } = useTranslation(['auth', 'common']);
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [showCodes, setShowCodes] = useState(false);
  const tokenRef = useRef<HTMLInputElement>(null);
  const dialogRef = useModalA11y(isOpen, onClose);

  const { backupCodesLoading, regeneratedCodes, regenerateBackupCodes, error, clearError } = useTwoFactor();

  useEffect(() => {
    if (isOpen) {
      setToken('');
      setShowCodes(false);
      setCopied(false);
      clearError();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRegenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await regenerateBackupCodes(token);
    if (ok) {
      setShowCodes(true);
      setToken('');
    }
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(regeneratedCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob(
      [`HARI HR - Two-Factor Authentication Backup Codes\n\n${regeneratedCodes.join('\n')}\n\nEach code can only be used once.`],
      { type: 'text/plain' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hari-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) {return null;}

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) {onClose();} }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="backup-codes-title"
        className="bg-card-light dark:bg-card-dark rounded-2xl shadow-2xl border border-border-light dark:border-border-dark w-full max-w-sm animate-fade-in-up"
      >

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 bg-primary/10 rounded-xl">
              <KeyRound size={20} className="text-primary" />
            </div>
            <h2 id="backup-codes-title" className="font-semibold text-text-light dark:text-text-dark">{t('backupCodes.title')}</h2>
          </div>
          <button onClick={onClose} aria-label={t('common:buttons.close')} className="text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-5">

          {/* Status */}
          <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4 flex items-center justify-between">
            <span className="text-sm text-text-muted-light dark:text-text-muted-dark">{t('backupCodes.remaining')}</span>
            {isLoading ? (
              <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : (
              <span className={`text-2xl font-bold ${backupCodesRemaining <= 2 ? 'text-accent-red' : 'text-text-light dark:text-text-dark'}`}>
                {backupCodesRemaining}
              </span>
            )}
          </div>

          {backupCodesRemaining <= 2 && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm text-amber-800 dark:text-amber-300">
              {t('backupCodes.lowWarning')}
            </div>
          )}

          {error && (
            <div className="bg-accent-red/10 text-accent-red p-3 rounded-xl text-sm border border-accent-red/20">
              {error}
            </div>
          )}

          {/* Show newly regenerated codes */}
          {showCodes && regeneratedCodes.length > 0 && (
            <div className="space-y-3">
              <div className="bg-accent-green/10 text-accent-green p-3 rounded-xl text-sm border border-accent-green/20">
                {t('backupCodes.generatedSuccess')}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {regeneratedCodes.map((code) => (
                  <code key={code} className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-sm font-mono text-center text-text-light dark:text-text-dark">
                    {code}
                  </code>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={handleCopyAll} className="flex-1 flex items-center justify-center gap-2 border border-border-light dark:border-border-dark rounded-xl py-2 text-sm text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition-colors">
                  {copied ? <Check size={14} className="text-accent-green" /> : <Copy size={14} />}
                  {copied ? t('backupCodes.copied') : t('backupCodes.copy')}
                </button>
                <button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-2 border border-border-light dark:border-border-dark rounded-xl py-2 text-sm text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition-colors">
                  <Download size={14} />
                  {t('common:buttons.download')}
                </button>
              </div>
            </div>
          )}

          {/* Regenerate form */}
          {!showCodes && (
            <form onSubmit={handleRegenerate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
                  {t('backupCodes.confirmTotp')}
                </label>
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-3">
                  {t('backupCodes.regenerateWarning')}
                </p>
                <div className="relative group">
                  <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark group-focus-within:text-primary transition-colors" size={20} />
                  <input
                    ref={tokenRef}
                    type="tel"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={token}
                    onChange={(e) => { clearError(); setToken(e.target.value.replace(/\D/g, '')); }}
                    className="w-full pl-12 pr-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-text-light dark:text-text-dark tracking-[0.5em] text-lg font-mono text-center"
                    placeholder="000000"
                    autoComplete="one-time-code"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={backupCodesLoading || token.length !== 6}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {backupCodesLoading ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <><RotateCcw size={16} /> {t('backupCodes.regenerate')}</>
                )}
              </button>
            </form>
          )}

          <button onClick={onClose} className="w-full border border-border-light dark:border-border-dark rounded-xl py-2.5 text-sm text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition-colors">
            {t('common:buttons.close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BackupCodesModal;
