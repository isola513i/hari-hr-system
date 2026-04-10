import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dropdown } from '../components/Dropdown';
import {
  User,
  Bell,
  Lock,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Monitor,
  Save,
  AlertCircle,
  Camera,
  Tag,
  Check,
  X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Toast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { api, API_HOST, BASE_URL, getAuthToken } from '../lib/api';
import { queryKeys } from '../lib/queryKeys';
import { LeaveTypesTab } from '../components/settings/LeaveTypesTab';
import { PHONE_COUNTRY_CODES, parsePhoneNumber } from '../lib/phoneUtils';

export const Settings: React.FC = () => {
  const { t, i18n } = useTranslation('settings');
  const { user, updateUser, isAdminView } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<
    'general' | 'notifications' | 'security' | 'appearance' | 'leaveTypes'
  >('general');

  // Reset to general tab if user switches to employee view while on admin-only tab
  useEffect(() => {
    if (!isAdminView && activeTab === 'leaveTypes') {
      setActiveTab('general');
    }
  }, [isAdminView, activeTab]);
  const [emailNotifications, setEmailNotifications] = useState(
    () => user?.emailNotifications ?? true
  );
  const [isSavingNotif, setIsSavingNotif] = useState(false);

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

  // Profile state
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
  });
  const [countryCode, setCountryCode] = useState('+66'); // Default to Thailand
  const [avatarPreview, setAvatarPreview] = useState('https://picsum.photos/id/338/200/200');
  const [avatarRawPath, setAvatarRawPath] = useState<string | null>(null);

  // Password state
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [passwordErrors, setPasswordErrors] = useState<{ [key: string]: string }>({});
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });

  // Loading and Toast state
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({
    show: false,
    message: '',
    type: 'success',
  });

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'success'
  ) => {
    setToast({ show: true, message, type });
  };

  // Apply theme to document
  const applyTheme = (themeMode: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;

    if (themeMode === 'system') {
      // Detect system preference
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemPrefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    } else if (themeMode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Save to localStorage
    localStorage.setItem('theme', themeMode);
  };

  // Handle theme change
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    applyTheme(newTheme);
  };

  // Handle language change
  const handleLanguageChange = (value: string) => {
    const newLanguage = value as 'en' | 'th';
    i18n.changeLanguage(newLanguage);
    const languageNames = { en: 'English', th: 'ไทย' };
    showToast(t('appearance.languageChanged', { language: languageNames[newLanguage] }), 'success');
  };

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;

    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme('system'); // Default to system
    }
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme]);

  // Load user profile on mount
  useEffect(() => {
    if (user) {
      const names = (user.name || '').split(' ');

      // Parse phone number to extract country code if it exists
      let phoneNumber = '';
      let extractedCountryCode = '+66'; // Default

      // Parse phone number to extract country code
      const parsed = parsePhoneNumber(user.phone || '');
      extractedCountryCode = parsed.code;
      phoneNumber = parsed.number;

      setProfile({
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        email: user.email || '',
        phone: phoneNumber, // Just the number without country code
        bio: user.bio || '', // Load bio from user if exists
      });
      setCountryCode(extractedCountryCode);

      if (user.avatar) {
        // Prepend API URL if avatar is a relative path
        const fullAvatarUrl = user.avatar.startsWith('/')
          ? `${API_HOST}${user.avatar}`
          : user.avatar;
        setAvatarPreview(fullAvatarUrl);
      }
    }
  }, [user]);

  // Sync emailNotifications from user object when user data loads
  useEffect(() => {
    if (user?.emailNotifications !== undefined) {
      setEmailNotifications(user.emailNotifications);
    }
  }, [user?.emailNotifications]);

  const handleEmailNotificationToggle = async () => {
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

  // Handle Save Changes (Profile)
  const handleSaveChanges = async () => {
    if (!user?.employeeId) {
      showToast(t('general.noUser'), 'error');
      return;
    }

    setIsSaving(true);
    try {
      const fullName = `${profile.firstName} ${profile.lastName}`.trim();

      // Combine country code and phone number
      const fullPhoneNumber = profile.phone ? `${countryCode}${profile.phone}` : '';

      // Only include avatar if user uploaded a new one this session
      const patchPayload: Record<string, unknown> = {
        name: fullName,
        email: profile.email,
        phone: fullPhoneNumber,
        bio: profile.bio,
      };

      if (avatarRawPath) {
        patchPayload.avatar = avatarRawPath; // relative path from upload
      }

      await api.patch(`/employees/${user.employeeId}`, patchPayload);

      // Update AuthContext (only include avatar if changed)
      const contextUpdate: Record<string, unknown> = {
        name: fullName,
        email: profile.email,
        phone: fullPhoneNumber,
        bio: profile.bio,
      };
      if (avatarRawPath) {
        contextUpdate.avatar = avatarRawPath;
      }
      updateUser(contextUpdate as any);

      showToast(t('general.profileSaved'), 'success');

      // Invalidate React Query caches so employee lists stay in sync
      qc.invalidateQueries({ queryKey: queryKeys.employees.all });
    } catch (error: any) {
      let errorMessage = t('general.saveFailed');
      if (error.message) {
        errorMessage = error.message;
      }
      showToast(errorMessage, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Avatar Change
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      showToast(t('general.avatarTooLarge'), 'error');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      showToast(t('general.avatarInvalidType'), 'error');
      return;
    }

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    try {
      // Upload the file to the server
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`${BASE_URL}/employees/upload-avatar`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload avatar');
      }

      const data = await response.json();

      // Store the raw relative path for DB save, but display with full URL
      setAvatarRawPath(data.avatarUrl);
      const fullAvatarUrl = data.avatarUrl.startsWith('/')
        ? `${API_HOST}${data.avatarUrl}`
        : data.avatarUrl;
      setAvatarPreview(fullAvatarUrl);

      showToast(t('general.avatarUploaded'), 'success');
    } catch (error) {
      console.error('Avatar upload error:', error);
      showToast(t('general.avatarFailed'), 'error');
      // Revert to original avatar on error
      setAvatarPreview(user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}`);
    }
  };

  // Handle Password Change
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

  const handleChangePassword = async () => {
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
    } catch (error: any) {
      let errorMessage = t('security.changeFailed');
      if (error.message) {
        if (error.message.includes('Incorrect current password')) {
          errorMessage = t('security.incorrectCurrent');
        } else if (error.message.includes('must be different')) {
          errorMessage = t('security.samePassword');
        } else {
          errorMessage = error.message;
        }
      }
      showToast(errorMessage, 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Password strength checker
  const getPasswordStrength = (pwd: string) => {
    if (!pwd) return null;
    const checks = [
      pwd.length >= 8,
      /[A-Z]/.test(pwd),
      /[a-z]/.test(pwd),
      /[0-9]/.test(pwd),
      /[@$!%*?&]/.test(pwd),
    ];
    const score = checks.filter(Boolean).length;
    if (score <= 2) return { score, label: t('security.strength.weak'), color: 'bg-red-500', textColor: 'text-red-500' };
    if (score <= 3) return { score, label: t('security.strength.fair'), color: 'bg-yellow-500', textColor: 'text-yellow-600' };
    if (score === 4) return { score, label: t('security.strength.good'), color: 'bg-blue-500', textColor: 'text-blue-600' };
    return { score, label: t('security.strength.strong'), color: 'bg-green-500', textColor: 'text-green-600' };
  };
  const strength = getPasswordStrength(passwords.new);

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">
            {t('title')}
          </h1>
          <p className="text-sm sm:text-base text-text-muted-light dark:text-text-muted-dark">
            {t('subtitle')}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 mt-6">
        {/* Settings Navigation - horizontal tabs on mobile, vertical sidebar on desktop */}
        <nav className="w-full lg:w-64 flex-shrink-0">
          <div className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 -mx-1 px-1 lg:mx-0 lg:px-0">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 lg:w-full ${
                activeTab === 'general'
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-muted-light dark:text-text-muted-dark hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <User size={18} />
              {t('tabs.general')}
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 lg:w-full ${
                activeTab === 'notifications'
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-muted-light dark:text-text-muted-dark hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Bell size={18} />
              {t('tabs.notifications')}
            </button>
            <button
              onClick={() => setActiveTab('appearance')}
              className={`flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 lg:w-full ${
                activeTab === 'appearance'
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-muted-light dark:text-text-muted-dark hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Eye size={18} />
              {t('tabs.appearance')}
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 lg:w-full ${
                activeTab === 'security'
                  ? 'bg-primary/10 text-primary'
                  : 'text-text-muted-light dark:text-text-muted-dark hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Lock size={18} />
              {t('tabs.security')}
            </button>
            {isAdminView && (
              <button
                onClick={() => setActiveTab('leaveTypes')}
                className={`flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 lg:w-full ${
                  activeTab === 'leaveTypes'
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-muted-light dark:text-text-muted-dark hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <Tag size={18} />
                {t('tabs.leaveTypes')}
              </button>
            )}
          </div>
        </nav>

        {/* Settings Content */}
        <div className="flex-1 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="p-6 space-y-6 animate-fade-in">
              <div className="border-b border-border-light dark:border-border-dark pb-4">
                <h2 className="text-xl font-bold text-text-light dark:text-text-dark">
                  {t('general.title')}
                </h2>
                <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                  {t('general.subtitle')}
                </p>
              </div>

              <div className="flex items-center gap-6">
                <div className="relative group">
                  <img
                    src={avatarPreview}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover ring-4 ring-gray-50 dark:ring-gray-800"
                  />
                  <button
                    onClick={handleAvatarClick}
                    className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Camera size={24} className="text-white" />
                  </button>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                  <button
                    onClick={handleAvatarClick}
                    className="px-4 py-2 bg-white dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    {t('general.changeAvatar')}
                  </button>
                  <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-2">
                    {t('general.avatarHint')}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                    {t('general.firstName')}
                  </label>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    value={profile.firstName}
                    onChange={(e) => setProfile((prev) => ({ ...prev, firstName: e.target.value }))}
                    className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                    {t('general.lastName')}
                  </label>
                  <input
                    id="lastName"
                    name="lastName"
                    type="text"
                    value={profile.lastName}
                    onChange={(e) => setProfile((prev) => ({ ...prev, lastName: e.target.value }))}
                    className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                    {t('general.email')}
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={profile.email}
                    onChange={(e) => setProfile((prev) => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                  />
                </div>
                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                    {t('general.phone')}
                  </label>
                  <div className="flex gap-2">
                    <Dropdown
                      id="countryCode"
                      name="countryCode"
                      value={countryCode}
                      onChange={(value) => setCountryCode(value)}
                      width="w-28"
                      options={PHONE_COUNTRY_CODES}
                    />
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        if (val.length <= 10) setProfile((prev) => ({ ...prev, phone: val }));
                      }}
                      maxLength={10}
                      placeholder="812345678"
                      className="flex-1 px-4 py-2 text-sm bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-text-light dark:text-text-dark"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                  {t('general.bio')}
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={4}
                  value={profile.bio}
                  onChange={(e) => setProfile((prev) => ({ ...prev, bio: e.target.value }))}
                  placeholder={t('general.bioPlaceholder')}
                  className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark resize-none"
                />
              </div>

              {/* Save Changes Button - Only in General Tab */}
              <div className="flex justify-end pt-4 border-t border-border-light dark:border-border-dark">
                <button
                  onClick={handleSaveChanges}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-medium rounded-lg text-sm shadow-sm hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save size={18} />
                  {isSaving ? t('general.saving') : t('general.saveChanges')}
                </button>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="p-6 space-y-6 animate-fade-in">
              <div className="border-b border-border-light dark:border-border-dark pb-4">
                <h2 className="text-xl font-bold text-text-light dark:text-text-dark">
                  {t('notifications.title')}
                </h2>
                <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                  {t('notifications.subtitle')}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark/50 rounded-lg">
                  <div>
                    <h3 className="font-medium text-text-light dark:text-text-dark">
                      {t('notifications.emailNotifications')}
                    </h3>
                    <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                      {t('notifications.emailDesc')}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailNotifications}
                      onChange={handleEmailNotificationToggle}
                      disabled={isSavingNotif}
                      className="absolute w-0 h-0 opacity-0 peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary peer-disabled:opacity-50"></div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Appearance Tab */}
          {activeTab === 'appearance' && (
            <div className="p-6 space-y-6 animate-fade-in">
              <div className="border-b border-border-light dark:border-border-dark pb-4">
                <h2 className="text-xl font-bold text-text-light dark:text-text-dark">
                  {t('appearance.title')}
                </h2>
                <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                  {t('appearance.subtitle')}
                </p>
              </div>

              <div>
                <h3 className="font-medium text-text-light dark:text-text-dark mb-4">
                  {t('appearance.themePreference')}
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`p-4 border rounded-xl flex flex-col items-center gap-3 transition-all ${theme === 'light' ? 'border-primary bg-primary/5 text-primary' : 'border-border-light dark:border-border-dark hover:border-primary/50'}`}
                  >
                    <Sun size={24} />
                    <span className="text-sm font-medium">{t('appearance.light')}</span>
                  </button>
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`p-4 border rounded-xl flex flex-col items-center gap-3 transition-all ${theme === 'dark' ? 'border-primary bg-primary/5 text-primary' : 'border-border-light dark:border-border-dark hover:border-primary/50'}`}
                  >
                    <Moon size={24} />
                    <span className="text-sm font-medium">{t('appearance.dark')}</span>
                  </button>
                  <button
                    onClick={() => handleThemeChange('system')}
                    className={`p-4 border rounded-xl flex flex-col items-center gap-3 transition-all ${theme === 'system' ? 'border-primary bg-primary/5 text-primary' : 'border-border-light dark:border-border-dark hover:border-primary/50'}`}
                  >
                    <Monitor size={24} />
                    <span className="text-sm font-medium">{t('appearance.system')}</span>
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="language" className="font-medium text-text-light dark:text-text-dark mb-4 block">{t('appearance.language')}</label>
                <Dropdown
                  id="language"
                  name="language"
                  value={i18n.language}
                  onChange={handleLanguageChange}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'th', label: 'ไทย (Thai)' },
                  ]}
                />
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="p-6 space-y-6 animate-fade-in">
              <div className="border-b border-border-light dark:border-border-dark pb-4">
                <h2 className="text-xl font-bold text-text-light dark:text-text-dark">{t('security.title')}</h2>
                <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                  {t('security.subtitle')}
                </p>
              </div>

              {/* Hidden honeypot inputs — prevent browser from autofilling search bar */}
              <input type="text" name="fake_user" style={{ display: 'none' }} autoComplete="username" readOnly tabIndex={-1} />
              <input type="password" name="fake_pass" style={{ display: 'none' }} autoComplete="new-password" readOnly tabIndex={-1} />

              <form
                onSubmit={(e) => { e.preventDefault(); handleChangePassword(); }}
                autoComplete="off"
                className="space-y-5"
              >
                <h3 className="font-semibold text-text-light dark:text-text-dark">{t('security.changePassword')}</h3>

                {/* Current Password */}
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                    {t('security.currentPassword')}
                  </label>
                  <div className="relative">
                    <input
                      id="currentPassword"
                      name="currentPassword"
                      type={showPasswords.current ? 'text' : 'password'}
                      placeholder={t('security.currentPlaceholder')}
                      value={passwords.current}
                      onChange={(e) => {
                        setPasswords((prev) => ({ ...prev, current: e.target.value }));
                        if (passwordErrors.current) setPasswordErrors((prev) => ({ ...prev, current: '' }));
                      }}
                      autoComplete="new-password"
                      className={`w-full px-4 py-2.5 pr-10 bg-background-light dark:bg-background-dark border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark text-sm ${
                        passwordErrors.current ? 'border-red-500' : 'border-border-light dark:border-border-dark'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted-light hover:text-text-light dark:hover:text-text-dark transition-colors"
                      tabIndex={-1}
                    >
                      {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordErrors.current && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle size={12} /> {passwordErrors.current}
                    </p>
                  )}
                </div>

                {/* New Password */}
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                    {t('security.newPassword')}
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      name="newPassword"
                      type={showPasswords.new ? 'text' : 'password'}
                      placeholder={t('security.newPlaceholder')}
                      value={passwords.new}
                      onChange={(e) => {
                        setPasswords((prev) => ({ ...prev, new: e.target.value }));
                        if (passwordErrors.new) setPasswordErrors((prev) => ({ ...prev, new: '' }));
                      }}
                      autoComplete="new-password"
                      className={`w-full px-4 py-2.5 pr-10 bg-background-light dark:bg-background-dark border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark text-sm ${
                        passwordErrors.new ? 'border-red-500' : 'border-border-light dark:border-border-dark'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted-light hover:text-text-light dark:hover:text-text-dark transition-colors"
                      tabIndex={-1}
                    >
                      {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordErrors.new && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle size={12} /> {passwordErrors.new}
                    </p>
                  )}
                  {/* Password strength */}
                  {passwords.new && strength && (
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 flex gap-1">
                          {[1,2,3,4,5].map(i => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= strength.score ? strength.color : 'bg-gray-200 dark:bg-gray-700'}`} />
                          ))}
                        </div>
                        <span className={`text-xs font-medium ${strength.textColor}`}>{strength.label}</span>
                      </div>
                      <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                        {[
                          { label: t('security.rules.chars8'), ok: passwords.new.length >= 8 },
                          { label: t('security.rules.uppercase'), ok: /[A-Z]/.test(passwords.new) },
                          { label: t('security.rules.lowercase'), ok: /[a-z]/.test(passwords.new) },
                          { label: t('security.rules.number'), ok: /[0-9]/.test(passwords.new) },
                          { label: t('security.rules.special'), ok: /[@$!%*?&]/.test(passwords.new) },
                        ].map(({ label, ok }) => (
                          <li key={label} className={`flex items-center gap-1 text-xs ${ok ? 'text-green-600 dark:text-green-400' : 'text-text-muted-light dark:text-text-muted-dark'}`}>
                            {ok ? <Check size={11} /> : <X size={11} />} {label}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">
                    {t('security.confirmPassword')}
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showPasswords.confirm ? 'text' : 'password'}
                      placeholder={t('security.confirmPlaceholder')}
                      value={passwords.confirm}
                      onChange={(e) => {
                        setPasswords((prev) => ({ ...prev, confirm: e.target.value }));
                        if (passwordErrors.confirm) setPasswordErrors((prev) => ({ ...prev, confirm: '' }));
                      }}
                      autoComplete="new-password"
                      className={`w-full px-4 py-2.5 pr-10 bg-background-light dark:bg-background-dark border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark text-sm ${
                        passwordErrors.confirm ? 'border-red-500' : passwords.confirm && passwords.confirm === passwords.new ? 'border-green-500' : 'border-border-light dark:border-border-dark'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted-light hover:text-text-light dark:hover:text-text-dark transition-colors"
                      tabIndex={-1}
                    >
                      {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {passwordErrors.confirm && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle size={12} /> {passwordErrors.confirm}
                    </p>
                  )}
                  {passwords.confirm && passwords.confirm === passwords.new && !passwordErrors.confirm && (
                    <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                      <Check size={12} /> {t('security.passwordsMatch')}
                    </p>
                  )}
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isChangingPassword}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-medium rounded-lg text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Lock size={16} />
                    {isChangingPassword ? t('security.updating') : t('security.updatePassword')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Leave Types Tab (Admin only) */}
          {activeTab === 'leaveTypes' && isAdminView && <LeaveTypesTab showToast={showToast} />}
        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast((prev) => ({ ...prev, show: false }))}
        />
      )}
    </div>
  );
};
