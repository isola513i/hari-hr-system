import React, { useState } from 'react';
import { User, Bell, Lock, Eye, Moon, Sun, Monitor, Globe, Check, Save } from 'lucide-react';

export const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'security' | 'appearance'>('general');
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    slack: false,
    news: true
  });
  
  const [theme, setTheme] = useState('system');

  const handleNotificationChange = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h1 className="text-3xl font-bold text-text-light dark:text-text-dark tracking-tight">Settings</h1>
           <p className="text-text-muted-light dark:text-text-muted-dark">Manage your account preferences and application settings.</p>
        </div>
        <button className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-medium rounded-lg text-sm shadow-sm hover:bg-primary-hover transition-colors">
            <Save size={18} />
            Save Changes
        </button>
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
                    <img 
                        src="https://picsum.photos/id/338/200/200" 
                        alt="Profile" 
                        className="w-20 h-20 rounded-full object-cover ring-4 ring-gray-50 dark:ring-gray-800"
                    />
                    <div>
                        <button className="px-4 py-2 bg-white dark:bg-card-dark border border-border-light dark:border-border-dark rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                            Change Avatar
                        </button>
                        <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-2">JPG, GIF or PNG. Max size 800K</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">First Name</label>
                        <input 
                            type="text" 
                            defaultValue="Olivia"
                            className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Last Name</label>
                        <input 
                            type="text" 
                            defaultValue="Roe"
                            className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Email Address</label>
                        <input 
                            type="email" 
                            defaultValue="olivia.r@nexus.hr"
                            className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Phone Number</label>
                        <input 
                            type="text" 
                            defaultValue="+1 (555) 000-1234"
                            className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-text-light dark:text-text-dark mb-1">Bio</label>
                    <textarea 
                        rows={4}
                        defaultValue="HR professional with over 10 years of experience in talent acquisition and employee relations."
                        className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark resize-none"
                    />
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
                                onClick={() => setTheme('light')}
                                className={`p-4 border rounded-xl flex flex-col items-center gap-3 transition-all ${theme === 'light' ? 'border-primary bg-primary/5 text-primary' : 'border-border-light dark:border-border-dark hover:border-primary/50'}`}
                            >
                                <Sun size={24} />
                                <span className="text-sm font-medium">Light</span>
                            </button>
                             <button 
                                onClick={() => setTheme('dark')}
                                className={`p-4 border rounded-xl flex flex-col items-center gap-3 transition-all ${theme === 'dark' ? 'border-primary bg-primary/5 text-primary' : 'border-border-light dark:border-border-dark hover:border-primary/50'}`}
                            >
                                <Moon size={24} />
                                <span className="text-sm font-medium">Dark</span>
                            </button>
                             <button 
                                onClick={() => setTheme('system')}
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
                            <select className="w-full pl-10 pr-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg appearance-none focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark cursor-pointer">
                                <option>English (United States)</option>
                                <option>Spanish</option>
                                <option>French</option>
                                <option>German</option>
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
                                <input 
                                    type="password" 
                                    placeholder="Current Password"
                                    className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                />
                                <input 
                                    type="password" 
                                    placeholder="New Password"
                                    className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                />
                                <input 
                                    type="password" 
                                    placeholder="Confirm New Password"
                                    className="w-full px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text-light dark:text-text-dark"
                                />
                             </div>
                             <button className="mt-3 px-4 py-2 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark text-text-light dark:text-text-dark font-medium rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                                Update Password
                            </button>
                        </div>

                         <div className="pt-4 border-t border-border-light dark:border-border-dark">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="font-medium text-text-light dark:text-text-dark">Two-Factor Authentication</h3>
                                    <p className="text-sm text-text-muted-light dark:text-text-muted-dark">Add an extra layer of security to your account.</p>
                                </div>
                                <button className="px-4 py-2 bg-primary/10 text-primary font-medium rounded-lg text-sm hover:bg-primary/20 transition-colors">
                                    Enable 2FA
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};
