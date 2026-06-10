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
  MapPin,
  ShieldCheck,
  ShieldOff,
  KeyRound,
} from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../contexts/AuthContext';
import { LeaveTypesTab } from '../components/settings/LeaveTypesTab';
import { PHONE_COUNTRY_CODES } from '../lib/phoneUtils';
import { useAttendanceGPSConfig, useUpdateGPSConfig } from '../hooks/queries';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useProfileSettings } from '../hooks/useProfileSettings';
import { usePasswordChange } from '../hooks/usePasswordChange';
import { useAppearanceSettings } from '../hooks/useAppearanceSettings';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { useTwoFactor } from '../hooks/useTwoFactor';
import { TotpSetupModal } from '../components/TwoFactor/TotpSetupModal';
import { TotpDisableModal } from '../components/TwoFactor/TotpDisableModal';
import { BackupCodesModal } from '../components/TwoFactor/BackupCodesModal';

export const Settings: React.FC = () => {
  const { t, i18n } = useTranslation('settings');
  const { isAdminView } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<
    'general' | 'notifications' | 'security' | 'appearance' | 'leaveTypes' | 'attendance'
  >('general');

  // Reset to general tab if user switches to employee view while on admin-only tab
  useEffect(() => {
    if (!isAdminView && (activeTab === 'leaveTypes' || activeTab === 'attendance')) {
      setActiveTab('general');
    }
  }, [isAdminView, activeTab]);

  const { state: pushState, subscribe: pushSubscribe, unsubscribe: pushUnsubscribe } = usePushNotifications();

  // Profile hook
  const {
    profile,
    setProfile,
    countryCode,
    setCountryCode,
    avatarPreview,
    isSaving,
    handleAvatarChange,
    handleSaveProfile,
  } = useProfileSettings();

  // Password hook
  const {
    passwords,
    setPasswords,
    passwordErrors,
    setPasswordErrors,
    showPasswords,
    setShowPasswords,
    isChangingPassword,
    handlePasswordChange,
  } = usePasswordChange();

  // Appearance hook
  const { theme, setTheme, applyTheme } = useAppearanceSettings();

  // 2FA hook + modal state
  const { status: totpStatus, statusLoading: totpStatusLoading, fetchStatus: fetchTotpStatus } = useTwoFactor();
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [showBackupCodesModal, setShowBackupCodesModal] = useState(false);

  // Fetch 2FA status when security tab is opened
  useEffect(() => {
    if (activeTab === 'security' && totpStatus === null && !totpStatusLoading) {
      fetchTotpStatus();
    }
  }, [activeTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notification hook
  const {
    emailNotifications,
    isSavingNotif,
    handleSaveNotifications: handleEmailNotificationToggle,
  } = useNotificationSettings();

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

  // Handle Avatar Click
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
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
            {isAdminView && (
              <button
                onClick={() => setActiveTab('attendance')}
                className={`flex items-center gap-2 lg:gap-3 px-3 lg:px-4 py-2 lg:py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 lg:w-full ${
                  activeTab === 'attendance'
                    ? 'bg-primary/10 text-primary'
                    : 'text-text-muted-light dark:text-text-muted-dark hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                <MapPin size={18} />
                GPS & Attendance
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
                    aria-label={t('general.changeAvatar')}
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
                  onClick={handleSaveProfile}
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

                {pushState !== 'unsupported' && (
                  <div className="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark/50 rounded-lg">
                    <div>
                      <h3 className="font-medium text-text-light dark:text-text-dark">
                        {t('notifications.pushNotifications', { defaultValue: 'Push Notifications' })}
                      </h3>
                      <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                        {pushState === 'denied'
                          ? t('notifications.pushDenied', { defaultValue: 'Blocked by browser — allow in browser settings' })
                          : t('notifications.pushDesc', { defaultValue: 'Receive notifications on this device even when the app is closed' })}
                      </p>
                    </div>
                    <label className={`relative inline-flex items-center ${pushState === 'denied' || pushState === 'loading' ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                      <input
                        type="checkbox"
                        checked={pushState === 'subscribed'}
                        onChange={() => pushState === 'subscribed' ? pushUnsubscribe() : pushSubscribe()}
                        disabled={pushState === 'denied' || pushState === 'loading'}
                        className="absolute w-0 h-0 opacity-0 peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary peer-disabled:opacity-50"></div>
                    </label>
                  </div>
                )}
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
                <div className="grid grid-cols-3 gap-2 sm:gap-4">
                  <button
                    onClick={() => handleThemeChange('light')}
                    className={`p-3 sm:p-4 border rounded-xl flex flex-col items-center gap-2 sm:gap-3 transition-all ${theme === 'light' ? 'border-primary bg-primary/5 text-primary' : 'border-border-light dark:border-border-dark hover:border-primary/50'}`}
                  >
                    <Sun size={20} />
                    <span className="text-xs sm:text-sm font-medium">{t('appearance.light')}</span>
                  </button>
                  <button
                    onClick={() => handleThemeChange('dark')}
                    className={`p-3 sm:p-4 border rounded-xl flex flex-col items-center gap-2 sm:gap-3 transition-all ${theme === 'dark' ? 'border-primary bg-primary/5 text-primary' : 'border-border-light dark:border-border-dark hover:border-primary/50'}`}
                  >
                    <Moon size={20} />
                    <span className="text-xs sm:text-sm font-medium">{t('appearance.dark')}</span>
                  </button>
                  <button
                    onClick={() => handleThemeChange('system')}
                    className={`p-3 sm:p-4 border rounded-xl flex flex-col items-center gap-2 sm:gap-3 transition-all ${theme === 'system' ? 'border-primary bg-primary/5 text-primary' : 'border-border-light dark:border-border-dark hover:border-primary/50'}`}
                  >
                    <Monitor size={20} />
                    <span className="text-xs sm:text-sm font-medium">{t('appearance.system')}</span>
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
                onSubmit={(e) => { e.preventDefault(); handlePasswordChange(); }}
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
                      aria-label={showPasswords.current ? t('security.hidePassword') : t('security.showPassword')}
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
                      aria-label={showPasswords.new ? t('security.hidePassword') : t('security.showPassword')}
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
                      aria-label={showPasswords.confirm ? t('security.hidePassword') : t('security.showPassword')}
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

              {/* ── Two-Factor Authentication ───────────────────────────── */}
              <div className="border-t border-border-light dark:border-border-dark pt-6 space-y-4">
                <div>
                  <h3 className="font-semibold text-text-light dark:text-text-dark">Two-Factor Authentication</h3>
                  <p className="text-sm text-text-muted-light dark:text-text-muted-dark mt-0.5">
                    Add an extra layer of security to your account using an authenticator app.
                  </p>
                </div>

                <div className="bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {totpStatusLoading ? (
                      <div className="h-10 w-10 rounded-xl bg-border-light dark:bg-border-dark animate-pulse" />
                    ) : totpStatus?.enabled ? (
                      <div className="flex items-center justify-center h-10 w-10 bg-accent-green/10 rounded-xl">
                        <ShieldCheck size={20} className="text-accent-green" />
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-10 w-10 bg-text-muted-light/10 dark:bg-text-muted-dark/10 rounded-xl">
                        <ShieldOff size={20} className="text-text-muted-light dark:text-text-muted-dark" />
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-text-light dark:text-text-dark">
                        {totpStatus?.enabled ? '2FA Enabled' : '2FA Disabled'}
                      </p>
                      {totpStatus?.enabled && (
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark">
                          {totpStatus.backupCodesRemaining} backup code{totpStatus.backupCodesRemaining !== 1 ? 's' : ''} remaining
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {totpStatus?.enabled ? (
                      <>
                        <button
                          onClick={() => setShowBackupCodesModal(true)}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg text-text-light dark:text-text-dark hover:bg-card-light dark:hover:bg-card-dark transition-colors"
                        >
                          <KeyRound size={14} />
                          Backup Codes
                        </button>
                        <button
                          onClick={() => setShowDisableModal(true)}
                          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-accent-red/30 rounded-lg text-accent-red hover:bg-accent-red/10 transition-colors"
                        >
                          <ShieldOff size={14} />
                          Disable
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setShowSetupModal(true)}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary-hover transition-colors"
                      >
                        <ShieldCheck size={14} />
                        Enable 2FA
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2FA Modals */}
          <TotpSetupModal
            isOpen={showSetupModal}
            onClose={() => setShowSetupModal(false)}
            onEnabled={() => { fetchTotpStatus(); setShowSetupModal(false); showToast('Two-factor authentication enabled!', 'success'); }}
          />
          <TotpDisableModal
            isOpen={showDisableModal}
            onClose={() => setShowDisableModal(false)}
            onDisabled={() => { fetchTotpStatus(); showToast('Two-factor authentication disabled', 'info'); }}
          />
          {totpStatus && (
            <BackupCodesModal
              isOpen={showBackupCodesModal}
              onClose={() => setShowBackupCodesModal(false)}
              backupCodesRemaining={totpStatus.backupCodesRemaining}
            />
          )}

          {/* Leave Types Tab (Admin only) */}
          {activeTab === 'leaveTypes' && isAdminView && <LeaveTypesTab />}

          {/* GPS & Attendance Tab (Admin only) */}
          {activeTab === 'attendance' && isAdminView && <GPSSettingsTab />}
        </div>
      </div>

    </div>
  );
};

// ---------------------------------------------------------------------------
// GPS Settings Tab
// ---------------------------------------------------------------------------

function GPSSettingsTab() {
  const { showToast } = useToast();
  const { data: cfg } = useAttendanceGPSConfig();
  const updateMutation = useUpdateGPSConfig();

  const [officeLat, setOfficeLat] = useState('');
  const [officeLng, setOfficeLng] = useState('');
  const [geofenceRadius, setGeofenceRadius] = useState('200');
  const [gpsRequired, setGpsRequired] = useState(false);
  const [officeIp, setOfficeIp] = useState('');

  useEffect(() => {
    if (cfg) {
      setOfficeLat(cfg.officeLat);
      setOfficeLng(cfg.officeLng);
      setGeofenceRadius(cfg.geofenceRadius);
      setGpsRequired(cfg.gpsRequired === 'true');
      setOfficeIp(cfg.officeIp);
    }
  }, [cfg]);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        officeLat,
        officeLng,
        geofenceRadius,
        gpsRequired: String(gpsRequired),
        officeIp,
      });
      showToast('GPS settings saved', 'success');
    } catch {
      showToast('Failed to save GPS settings', 'error');
    }
  };

  const inputCls = "w-full px-3 py-2 text-sm border border-border-light dark:border-border-dark rounded-lg bg-background-light dark:bg-background-dark text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/30";
  const labelCls = "block text-xs font-medium text-text-muted-light dark:text-text-muted-dark mb-1";

  return (
    <div className="p-6 space-y-5 animate-fade-in">
      {/* Header */}
      <div className="border-b border-border-light dark:border-border-dark pb-4">
        <h2 className="text-lg font-semibold text-text-light dark:text-text-dark">GPS & Attendance</h2>
        <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">
          Configure office location and geofence for employee check-in
        </p>
      </div>

      {/* GPS Required Toggle */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-text-light dark:text-text-dark">Require GPS for Check-in</p>
          <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">
            Employees must be within the geofence to clock in (except Remote/WFH)
          </p>
        </div>
        <button
          onClick={() => setGpsRequired((v) => !v)}
          className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${gpsRequired ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
        >
          <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${gpsRequired ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      {/* Office Location */}
      <div className="space-y-3 pt-1 border-t border-border-light dark:border-border-dark">
        <div className="flex items-center justify-between pt-1">
          <h3 className="text-sm font-medium text-text-light dark:text-text-dark flex items-center gap-1.5">
            <MapPin size={14} className="text-text-muted-light dark:text-text-muted-dark" /> Office Location
          </h3>
          <a
            href="https://maps.google.com/?q=Vanit+Place+Aree+Bangkok"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline"
          >
            View on map
          </a>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Latitude</label>
            <input
              type="number"
              step="0.000001"
              value={officeLat}
              onChange={(e) => setOfficeLat(e.target.value)}
              placeholder="13.78"
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>Longitude</label>
            <input
              type="number"
              step="0.000001"
              value={officeLng}
              onChange={(e) => setOfficeLng(e.target.value)}
              placeholder="100.5427"
              className={inputCls}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Geofence Radius (meters)</label>
            <input
              type="number"
              min="50"
              max="5000"
              value={geofenceRadius}
              onChange={(e) => setGeofenceRadius(e.target.value)}
              className={inputCls}
            />
          </div>
          <div />
        </div>
      </div>

      {/* Office IP Allowlist */}
      <div className="space-y-3 pt-1 border-t border-border-light dark:border-border-dark">
        <div className="pt-1">
          <h3 className="text-sm font-medium text-text-light dark:text-text-dark">Office IP Allowlist</h3>
          <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5">
            Desktop users on this network can clock in without GPS
          </p>
        </div>
        <div>
          <label className={labelCls}>Office Public IP(s) — separate with commas</label>
          <input
            type="text"
            value={officeIp}
            onChange={(e) => setOfficeIp(e.target.value)}
            placeholder="e.g. 203.0.113.10, 203.0.113.11"
            className={inputCls}
          />
          <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">
            Leave blank to disable IP-based check-in
          </p>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
        >
          <Save size={14} />
          {updateMutation.isPending ? 'Saving…' : 'Save GPS Settings'}
        </button>
      </div>
    </div>
  );
}
