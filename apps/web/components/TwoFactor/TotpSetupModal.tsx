/**
 * TotpSetupModal — Multi-step 2FA setup wizard
 *
 * Step 1: Show QR code + manual key
 * Step 2: Enter 6-digit code to verify
 * Step 3: Display backup codes (copy / download)
 */
import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, ShieldCheck, Copy, Download, Check, KeyRound, ChevronRight } from 'lucide-react';
import { useTwoFactor } from '../../hooks/useTwoFactor';

interface TotpSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after 2FA is fully enabled so the parent can refresh status */
  onEnabled: () => void;
}

type Step = 'qr' | 'verify' | 'backup';

export const TotpSetupModal: React.FC<TotpSetupModalProps> = ({ isOpen, onClose, onEnabled }) => {
  const { t } = useTranslation(['auth', 'common']);
  const [step, setStep] = useState<Step>('qr');
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);
  const tokenRef = useRef<HTMLInputElement>(null);

  const {
    setup, setupLoading, fetchSetup,
    enableLoading, backupCodes, enableTotp,
    error, clearError,
  } = useTwoFactor();

  // Fetch QR code when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('qr');
      setToken('');
      clearError();
      fetchSetup();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-focus token input on verify step
  useEffect(() => {
    if (step === 'verify') {
      setTimeout(() => tokenRef.current?.focus(), 100);
    }
  }, [step]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setup || token.length !== 6) return;
    const ok = await enableTotp(setup.secret, token);
    if (ok) {
      setStep('backup');
      onEnabled();
    }
  };

  const handleCopyAll = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob(
      [`${t('auth:totp.setup.backupFileHeader')}\n\n${backupCodes.join('\n')}\n\n${t('auth:totp.setup.backupFileFooter')}`],
      { type: 'text/plain' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hari-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-2xl border border-border-light dark:border-border-dark w-full max-w-md animate-fade-in-up">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 bg-primary/10 rounded-xl">
              <ShieldCheck size={20} className="text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-text-light dark:text-text-dark">{t('auth:totp.setup.title')}</h2>
              <p className="text-xs text-text-muted-light dark:text-text-muted-dark">
                {step === 'qr' && t('auth:totp.setup.stepQr')}
                {step === 'verify' && t('auth:totp.setup.stepVerify')}
                {step === 'backup' && t('auth:totp.setup.stepBackup')}
              </p>
            </div>
          </div>
          <button onClick={onClose} aria-label={t('auth:totp.setup.closeAriaLabel')} className="text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex px-6 pt-4 gap-2">
          {(['qr', 'verify', 'backup'] as Step[]).map((s, i) => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${step === s ? 'bg-primary' : i < ['qr', 'verify', 'backup'].indexOf(step) ? 'bg-primary/40' : 'bg-border-light dark:bg-border-dark'}`} />
          ))}
        </div>

        <div className="p-6 space-y-5">

          {error && (
            <div className="bg-accent-red/10 text-accent-red p-3 rounded-xl text-sm border border-accent-red/20">
              {error}
            </div>
          )}

          {/* ── Step 1: QR Code ── */}
          {step === 'qr' && (
            <div className="space-y-4">
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                {t('auth:totp.setup.qrInstructions')}
              </p>

              {setupLoading ? (
                <div className="flex items-center justify-center h-48">
                  <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : setup ? (
                <>
                  <div className="flex justify-center">
                    <img
                      src={setup.qrCodeDataUrl}
                      alt={t('auth:totp.setup.qrAlt')}
                      className="rounded-xl border-4 border-white shadow-md"
                      style={{ width: 180, height: 180 }}
                    />
                  </div>
                  <div className="bg-background-light dark:bg-background-dark rounded-xl p-3 border border-border-light dark:border-border-dark">
                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-1">{t('auth:totp.setup.manualKeyLabel')}</p>
                    <div className="flex items-center gap-2">
                      <code className="text-sm font-mono text-text-light dark:text-text-dark flex-1 break-all">{setup.manualKey}</code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(setup.manualKey); }}
                        className="text-text-muted-light dark:text-text-muted-dark hover:text-primary transition-colors flex-shrink-0"
                        title={t('auth:totp.setup.copyKeyAriaLabel')}
                        aria-label={t('auth:totp.setup.copyKeyAriaLabel')}
                      >
                        <Copy size={16} />
                      </button>
                    </div>
                  </div>
                </>
              ) : null}

              <button
                onClick={() => setStep('verify')}
                disabled={!setup}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {t('auth:totp.setup.scanned')} <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* ── Step 2: Verify ── */}
          {step === 'verify' && (
            <form onSubmit={handleVerify} className="space-y-4">
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                {t('auth:totp.setup.verifyInstructions')}
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
                  className="w-full pl-12 pr-4 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-text-light dark:text-text-dark tracking-[0.5em] text-xl font-mono text-center"
                  placeholder="000000"
                  autoComplete="one-time-code"
                />
              </div>
              <button
                type="submit"
                disabled={enableLoading || token.length !== 6}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl font-semibold hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {enableLoading ? (
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <>{t('auth:totp.setup.enable')} <ChevronRight size={18} /></>
                )}
              </button>
              <button type="button" onClick={() => setStep('qr')} className="w-full text-sm text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors">
                {t('auth:totp.setup.back')}
              </button>
            </form>
          )}

          {/* ── Step 3: Backup Codes ── */}
          {step === 'backup' && (
            <div className="space-y-4">
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm text-amber-800 dark:text-amber-300">
                {t('auth:totp.setup.backupWarning')}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {backupCodes.map((code) => (
                  <code key={code} className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg px-3 py-2 text-sm font-mono text-center text-text-light dark:text-text-dark">
                    {code}
                  </code>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={handleCopyAll} className="flex-1 flex items-center justify-center gap-2 border border-border-light dark:border-border-dark rounded-xl py-2.5 text-sm text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition-colors">
                  {copied ? <Check size={16} className="text-accent-green" /> : <Copy size={16} />}
                  {copied ? t('auth:totp.setup.copied') : t('auth:totp.setup.copyAll')}
                </button>
                <button onClick={handleDownload} className="flex-1 flex items-center justify-center gap-2 border border-border-light dark:border-border-dark rounded-xl py-2.5 text-sm text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition-colors">
                  <Download size={16} />
                  {t('auth:totp.setup.download')}
                </button>
              </div>
              <button onClick={onClose} className="w-full bg-accent-green text-white py-3 rounded-xl font-semibold hover:bg-accent-green/90 transition-colors flex items-center justify-center gap-2">
                <Check size={18} /> {t('auth:totp.setup.done')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TotpSetupModal;
