import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { api } from '../lib/api';
import { getErrorMessage } from '../lib/errorHandler';

export function usePasswordChange() {
  const { t } = useTranslation('settings');
  const { showToast } = useToast();

  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<{ [key: string]: string }>({});
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const validatePasswords = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!passwords.current) {
      errors.current = t('security.currentRequired');
    }
    if (!passwords.new) {
      errors.new = t('security.newRequired');
    } else if (passwords.new.length < 6) {
      errors.new = t('security.minLength');
    }
    if (!passwords.confirm) {
      errors.confirm = t('security.confirmRequired');
    } else if (passwords.new !== passwords.confirm) {
      errors.confirm = t('security.mismatch');
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePasswordChange = async () => {
    if (!validatePasswords()) {
      showToast(t('security.fixErrors'), 'warning');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwords.current,
        newPassword: passwords.new,
      });
      showToast(t('security.passwordChanged'), 'success');
      setPasswords({ current: '', new: '', confirm: '' });
      setPasswordErrors({});
      setShowPasswords({ current: false, new: false, confirm: false });
    } catch (error) {
      let errorMessage = t('security.changeFailed');
      const msg = getErrorMessage(error, '');
      if (msg) {
        if (msg.includes('Incorrect current password')) {
          errorMessage = t('security.incorrectCurrent');
        } else if (msg.includes('must be different')) {
          errorMessage = t('security.samePassword');
        } else {
          errorMessage = msg;
        }
      }
      showToast(errorMessage, 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  return {
    passwords,
    setPasswords,
    passwordErrors,
    setPasswordErrors,
    showPasswords,
    setShowPasswords,
    isChangingPassword,
    handlePasswordChange,
  };
}
