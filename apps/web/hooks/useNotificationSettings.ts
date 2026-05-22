import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

export function useNotificationSettings() {
  const { t } = useTranslation('settings');
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [emailNotifications, setEmailNotifications] = useState(
    () => user?.emailNotifications ?? true
  );
  const [isSavingNotif, setIsSavingNotif] = useState(false);

  // Sync emailNotifications from user object when user data loads
  useEffect(() => {
    if (user?.emailNotifications !== undefined) {
      setEmailNotifications(user.emailNotifications);
    }
  }, [user?.emailNotifications]);

  const handleSaveNotifications = async () => {
    const newValue = !emailNotifications;
    setEmailNotifications(newValue);
    setIsSavingNotif(true);
    try {
      await api.patch('/auth/notification-preferences', { emailNotifications: newValue });
      updateUser({ emailNotifications: newValue });
    } catch {
      setEmailNotifications(!newValue); // revert on error
      showToast(t('notifications.saveFailed'), 'error');
    } finally {
      setIsSavingNotif(false);
    }
  };

  return {
    emailNotifications,
    setEmailNotifications,
    isSavingNotif,
    handleSaveNotifications,
  };
}
