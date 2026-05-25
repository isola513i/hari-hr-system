/**
 * TotpDisableModal — Confirm disable 2FA with current password.
 */
import React, { useState, useRef, useEffect } from 'react';
import { X, Lock, ShieldOff, Eye, EyeOff } from 'lucide-react';
import { useTwoFactor } from '../../hooks/useTwoFactor';

interface TotpDisableModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDisabled: () => void;
}

export const TotpDisableModal: React.FC<TotpDisableModalProps> = ({ isOpen, onClose, onDisabled }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { disableLoading, disableTotp, error, clearError } = useTwoFactor();

  useEffect(() => {
    if (isOpen) {
      setPassword('');
      setShowPassword(false);
      clearError();
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await disableTotp(password);
    if (ok) {
      onDisabled();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-card-light dark:bg-card-dark rounded-2xl shadow-2xl border border-border-light dark:border-border-dark w-full max-w-sm animate-fade-in-up">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-light dark:border-border-dark">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 bg-accent-red/10 rounded-xl">
              <ShieldOff size={20} className="text-accent-red" />
            </div>
            <h2 className="font-semibold text-text-light dark:text-text-dark">Disable Two-Factor Auth</h2>
          </div>
          <button onClick={onClose} className="text-text-muted-light dark:text-text-muted-dark hover:text-text-light dark:hover:text-text-dark transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
            Disabling 2FA will make your account less secure. You'll need to enter your current password to confirm.
          </p>

          {error && (
            <div className="bg-accent-red/10 text-accent-red p-3 rounded-xl text-sm border border-accent-red/20">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-2">
              Current Password
            </label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark group-focus-within:text-primary transition-colors" size={20} />
              <input
                ref={inputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { clearError(); setPassword(e.target.value); }}
                className="w-full pl-12 pr-12 py-3 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none text-text-light dark:text-text-dark"
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark hover:text-primary transition-colors">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 border border-border-light dark:border-border-dark rounded-xl py-3 text-sm text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={disableLoading || !password}
              className="flex-1 bg-accent-red text-white py-3 rounded-xl font-semibold hover:bg-accent-red/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {disableLoading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : 'Disable 2FA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TotpDisableModal;
