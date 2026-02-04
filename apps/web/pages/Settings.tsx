import React, { useState, useRef, useEffect } from 'react';
import { User, Bell, Lock, Eye, Moon, Sun, Monitor, Globe, Save, AlertCircle, Camera } from 'lucide-react';
import { Toast } from '../components/Toast';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

export const Settings: React.FC = () => {
  const { user, updateUser } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'security' | 'appearance'>('general');
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    slack: false,
    news: true
  });

  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [language, setLanguage] = useState<'en' | 'th'>('en');

  // Profile state
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: ''
  });
  const [countryCode, setCountryCode] = useState('+66'); // Default to Thailand
  const [avatarPreview, setAvatarPreview] = useState('https://picsum.photos/id/338/200/200');

  // Password state
  const [passwords, setPasswords] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [passwordErrors, setPasswordErrors] = useState<{ [key: string]: string }>({});

  // Loading and Toast state
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({
    show: false, message: '', type: 'success'
  });

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
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
  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value as 'en' | 'th';
    setLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
    const languageNames = { en: 'English', th: 'ไทย' };
    showToast(`Language changed to ${languageNames[newLanguage]}`, 'success');
  };

  // Load theme and language from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
    const savedLanguage = localStorage.getItem('language') as 'en' | 'th' | null;

    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme('system'); // Default to system
    }

    if (savedLanguage) {
      setLanguage(savedLanguage);
    }

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  // Load user profile on mount
  useEffect(() => {
    if (user) {
      const names = (user.name || '').split(' ');

      // Parse phone number to extract country code if it exists
      let phoneNumber = '';
      let extractedCountryCode = '+66'; // Default

      // If user has a phone number, try to extract country code
      // Assuming phone is stored as "+66812345678"
      if (user.phone && user.phone.startsWith('+')) {
        const match = user.phone.match(/^(\+\d{1,4})(.*)/);
        if (match) {
          extractedCountryCode = match[1];
          phoneNumber = match[2].trim();
        }
      } else {
        phoneNumber = user.phone || '';
      }

      setProfile({
        firstName: names[0] || '',
        lastName: names.slice(1).join(' ') || '',
        email: user.email || '',
        phone: phoneNumber, // Just the number without country code
        bio: user.bio || '' // Load bio from user if exists
      });
      setCountryCode(extractedCountryCode);

      if (user.avatar) {
        setAvatarPreview(user.avatar);
      }
    }
  }, [user]);

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Handle Save Changes (Profile)
  const handleSaveChanges = async () => {
    if (!user?.employeeId) {
      showToast('Unable to save: User profile not found.', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const fullName = `${profile.firstName} ${profile.lastName}`.trim();

      // Combine country code and phone number
      const fullPhoneNumber = profile.phone ? `${countryCode}${profile.phone}` : '';

      const updatedEmployee = await api.patch(`/employees/${user.employeeId}`, {
        name: fullName,
        email: profile.email,
        phone: fullPhoneNumber,
        bio: profile.bio,
        avatar: avatarPreview
      });

      // Update AuthContext with new user data
      updateUser({
        name: fullName,
        email: profile.email,
        phone: fullPhoneNumber,
        bio: profile.bio,
        avatar: avatarPreview
      });

      showToast('Profile saved successfully!', 'success');
    } catch (error: any) {
      let errorMessage = 'Failed to save profile. Please try again.';
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
      showToast('Image size must be less than 5MB.', 'error');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Please upload a JPG, PNG, or GIF image.', 'error');
      return;
    }

    // Show preview immediately
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);

    try {
      // Upload the file to the server
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch('http://localhost:3001/api/employees/upload-avatar', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to upload avatar');
      }

      const data = await response.json();

      // Update preview with the server URL
      setAvatarPreview(data.avatarUrl);

      // Also update the form data
      setFormData(prev => ({ ...prev, avatar: data.avatarUrl }));

      showToast('Avatar uploaded! Click "Save Changes" to apply.', 'success');
    } catch (error) {
      console.error('Avatar upload error:', error);
      showToast('Failed to upload avatar. Please try again.', 'error');
      // Revert to original avatar on error
      setAvatarPreview(user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}`);
    }
  };

  // Handle Password Change
  const validatePasswords = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!passwords.current) {
      errors.current = 'Current password is required';
    }
    if (!passwords.new) {
      errors.new = 'New password is required';
    } else if (passwords.new.length < 6) {
      errors.new = 'Password must be at least 6 characters';
    }
    if (!passwords.confirm) {
      errors.confirm = 'Please confirm your new password';
    } else if (passwords.new !== passwords.confirm) {
      errors.confirm = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePasswords()) {
      showToast('Please fix the errors in the form.', 'warning');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: passwords.current,
        newPassword: passwords.new
      });
      showToast('Password changed successfully!', 'success');
      setPasswords({ current: '', new: '', confirm: '' });
      setPasswordErrors({});
    } catch (error: any) {
      let errorMessage = 'Failed to change password. Please try again.';
      if (error.message) {
        if (error.message.includes('Incorrect current password')) {
          errorMessage = 'The current password you entered is incorrect.';
        } else {
          errorMessage = error.message;
        }
      }
      showToast(errorMessage, 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Handle 2FA Enable
  const handleEnable2FA = () => {
    showToast('Two-Factor Authentication setup is coming soon!', 'info');
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">Settings</h1>
           <p className="text-text-muted-light dark:text-text-muted-dark">Manage your account preferences and application settings.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 mt-6">
        {/* Settings Navigation */}
        <nav className="w-full lg:w-64 flex-shrink-0 space-y-1">
          <button
            onClick={() => setActiveTab('general')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'general'
                ? 'bg-primary/10 text-primary'
                : 'text-text-muted-light dark:text-text-muted-dark hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <User size={18} />
            General
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'notifications'
                ? 'bg-primary/10 text-primary'
                : 'text-text-muted-light dark:text-text-muted-dark hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Bell size={18} />
            Notifications
          </button>
          <button
            onClick={() => setActiveTab('appearance')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'appearance'
                ? 'bg-primary/10 text-primary'
                : 'text-text-muted-light dark:text-text-muted-dark hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Eye size={18} />
            Appearance
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'security'
                ? 'bg-primary/10 text-primary'
                : 'text-text-muted-light dark:text-text-muted-dark hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            <Lock size={18} />
            Security
          </button>
        </nav>

        {/* Settings Content */}
        <div className="flex-1 bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark shadow-sm overflow-hidden">
            
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="p-6 space-y-6 animate-fade-in">
                <div className="border-b border-border-light dark:border-border-dark pb-4">
                    <h2 className="text-xl font-bold text-text-light dark:text-text-dark">Profile Information</h2>
                    <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Update your public profile details.</p>
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
                            Change Avatar
                        </button>
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-2">JPG, GIF or PNG. Max size 5MB</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">First Name</label>
                        <input
                            type="text"
                            value={profile.firstName}
                            onChange={(e) => setProfile(prev => ({ ...prev, firstName: e.target.value }))}
                            className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Last Name</label>
                        <input
                            type="text"
                            value={profile.lastName}
                            onChange={(e) => setProfile(prev => ({ ...prev, lastName: e.target.value }))}
                            className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Email Address</label>
                        <input
                            type="email"
                            value={profile.email}
                            onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                            className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Phone Number</label>
                        <div className="flex gap-2">
                            <select
                                value={countryCode}
                                onChange={(e) => setCountryCode(e.target.value)}
                                className="w-32 px-3 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark cursor-pointer"
                            >
                                <option value="+66">🇹🇭 +66</option>
                                <option value="+1">🇺🇸 +1</option>
                                <option value="+44">🇬🇧 +44</option>
                                <option value="+65">🇸🇬 +65</option>
                                <option value="+81">🇯🇵 +81</option>
                                <option value="+86">🇨🇳 +86</option>
                                <option value="+91">🇮🇳 +91</option>
                                <option value="+61">🇦🇺 +61</option>
                                <option value="+82">🇰🇷 +82</option>
                                <option value="+33">🇫🇷 +33</option>
                                <option value="+49">🇩🇪 +49</option>
                            </select>
                            <input
                                type="tel"
                                value={profile.phone}
                                onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value.replace(/\D/g, '') }))}
                                placeholder="812345678"
                                className="flex-1 px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                            />
                        </div>
                        <p className="mt-1 text-xs text-text-muted-light dark:text-text-muted-dark">
                            Enter phone number without country code or special characters
                        </p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Bio</label>
                    <textarea
                        rows={4}
                        value={profile.bio}
                        onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell us about yourself, your role, and experience..."
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
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
                <div className="p-6 space-y-6 animate-fade-in">
                     <div className="border-b border-border-light dark:border-border-dark pb-4">
                        <h2 className="text-xl font-bold text-text-light dark:text-text-dark">Notifications</h2>
                        <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Choose how you want to be notified.</p>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark/50 rounded-lg">
                            <div>
                                <h3 className="font-medium text-text-light dark:text-text-dark">Email Notifications</h3>
                                <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Receive daily summaries and critical alerts via email.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={notifications.email} onChange={() => handleNotificationChange('email')} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                            </label>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark/50 rounded-lg">
                            <div>
                                <h3 className="font-medium text-text-light dark:text-text-dark">Push Notifications</h3>
                                <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Receive real-time alerts on your desktop.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={notifications.push} onChange={() => handleNotificationChange('push')} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                            </label>
                        </div>

                         <div className="flex items-center justify-between p-4 bg-background-light dark:bg-background-dark/50 rounded-lg">
                            <div>
                                <h3 className="font-medium text-text-light dark:text-text-dark">Slack Integration</h3>
                                <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Forward important updates to your Slack workspace.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked={notifications.slack} onChange={() => handleNotificationChange('slack')} className="sr-only peer" />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 dark:peer-focus:ring-primary/40 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-primary"></div>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {/* Appearance Tab */}
             {activeTab === 'appearance' && (
                <div className="p-6 space-y-6 animate-fade-in">
                     <div className="border-b border-border-light dark:border-border-dark pb-4">
                        <h2 className="text-xl font-bold text-text-light dark:text-text-dark">Appearance</h2>
                        <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Customize the look and feel of the application.</p>
                    </div>

                    <div>
                        <h3 className="font-medium text-text-light dark:text-text-dark mb-4">Theme Preference</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <button
                                onClick={() => handleThemeChange('light')}
                                className={`p-4 border rounded-xl flex flex-col items-center gap-3 transition-all ${theme === 'light' ? 'border-primary bg-primary/5 text-primary' : 'border-border-light dark:border-border-dark hover:border-primary/50'}`}
                            >
                                <Sun size={24} />
                                <span className="text-sm font-medium">Light</span>
                            </button>
                             <button
                                onClick={() => handleThemeChange('dark')}
                                className={`p-4 border rounded-xl flex flex-col items-center gap-3 transition-all ${theme === 'dark' ? 'border-primary bg-primary/5 text-primary' : 'border-border-light dark:border-border-dark hover:border-primary/50'}`}
                            >
                                <Moon size={24} />
                                <span className="text-sm font-medium">Dark</span>
                            </button>
                             <button
                                onClick={() => handleThemeChange('system')}
                                className={`p-4 border rounded-xl flex flex-col items-center gap-3 transition-all ${theme === 'system' ? 'border-primary bg-primary/5 text-primary' : 'border-border-light dark:border-border-dark hover:border-primary/50'}`}
                            >
                                <Monitor size={24} />
                                <span className="text-sm font-medium">System</span>
                            </button>
                        </div>
                    </div>

                    <div>
                         <h3 className="font-medium text-text-light dark:text-text-dark mb-4">Language</h3>
                         <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light" size={18} />
                            <select
                              value={language}
                              onChange={handleLanguageChange}
                              className="w-full pl-10 pr-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark cursor-pointer"
                            >
                                <option value="en">English</option>
                                <option value="th">ไทย (Thai)</option>
                            </select>
                         </div>
                    </div>
                </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
                <div className="p-6 space-y-6 animate-fade-in">
                     <div className="border-b border-border-light dark:border-border-dark pb-4">
                        <h2 className="text-xl font-bold text-text-light dark:text-text-dark">Security</h2>
                        <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Protect your account and data.</p>
                    </div>

                    <div className="space-y-4">
                        <div>
                             <h3 className="font-medium text-text-light dark:text-text-dark mb-4">Change Password</h3>
                             <div className="space-y-3">
                                <div>
                                  <input
                                      type="password"
                                      placeholder="Current Password"
                                      value={passwords.current}
                                      onChange={(e) => {
                                        setPasswords(prev => ({ ...prev, current: e.target.value }));
                                        if (passwordErrors.current) setPasswordErrors(prev => ({ ...prev, current: '' }));
                                      }}
                                      className={`w-full px-4 py-2 bg-background-light dark:bg-background-dark border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark ${
                                        passwordErrors.current ? 'border-red-500' : 'border-border-light dark:border-border-dark'
                                      }`}
                                  />
                                  {passwordErrors.current && (
                                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                      <AlertCircle size={12} /> {passwordErrors.current}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <input
                                      type="password"
                                      placeholder="New Password"
                                      value={passwords.new}
                                      onChange={(e) => {
                                        setPasswords(prev => ({ ...prev, new: e.target.value }));
                                        if (passwordErrors.new) setPasswordErrors(prev => ({ ...prev, new: '' }));
                                      }}
                                      className={`w-full px-4 py-2 bg-background-light dark:bg-background-dark border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark ${
                                        passwordErrors.new ? 'border-red-500' : 'border-border-light dark:border-border-dark'
                                      }`}
                                  />
                                  {passwordErrors.new && (
                                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                      <AlertCircle size={12} /> {passwordErrors.new}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <input
                                      type="password"
                                      placeholder="Confirm New Password"
                                      value={passwords.confirm}
                                      onChange={(e) => {
                                        setPasswords(prev => ({ ...prev, confirm: e.target.value }));
                                        if (passwordErrors.confirm) setPasswordErrors(prev => ({ ...prev, confirm: '' }));
                                      }}
                                      className={`w-full px-4 py-2 bg-background-light dark:bg-background-dark border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark ${
                                        passwordErrors.confirm ? 'border-red-500' : 'border-border-light dark:border-border-dark'
                                      }`}
                                  />
                                  {passwordErrors.confirm && (
                                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                      <AlertCircle size={12} /> {passwordErrors.confirm}
                                    </p>
                                  )}
                                </div>
                             </div>
                             <button
                               onClick={handleChangePassword}
                               disabled={isChangingPassword}
                               className="mt-3 px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark font-medium rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                             >
                                {isChangingPassword ? 'Updating...' : 'Update Password'}
                            </button>
                        </div>

                         <div className="pt-4 border-t border-border-light dark:border-border-dark">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-text-light dark:text-text-dark">Two-Factor Authentication</h3>
                                    <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Add an extra layer of security to your account.</p>
                                </div>
                                <button
                                  onClick={handleEnable2FA}
                                  className="px-4 py-2 bg-primary/10 text-primary font-medium rounded-lg text-sm hover:bg-primary/20 transition-colors"
                                >
                                    Enable 2FA
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
      </div>

      {/* Toast Notification */}
      {toast.show && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(prev => ({ ...prev, show: false }))}
        />
      )}
    </div>
  );
};
