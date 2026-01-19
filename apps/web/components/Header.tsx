import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, Moon, Sun, ChevronDown, LogOut, User as UserIcon, Shield, Lock, Users, FileText, X, Menu } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChangePasswordModal } from './ChangePasswordModal';
import { api } from '../lib/api';

interface SearchResult {
  id: string;
  type: 'employee' | 'document';
  title: string;
  subtitle: string;
  avatar?: string;
}

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const { user, logout } = useAuth();
  const notificationRef = useRef<HTMLDivElement>(null);

  // Sample notifications (can be fetched from API later)
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Leave Request Approved', message: 'Your vacation request has been approved', time: '5 min ago', read: false },
    { id: 2, title: 'New Employee Joined', message: 'Sarah Connor joined the Engineering team', time: '1 hour ago', read: false },
    { id: 3, title: 'Document Shared', message: 'HR Policy 2024 was shared with you', time: '2 hours ago', read: true },
    { id: 4, title: 'Meeting Reminder', message: 'Team standup in 30 minutes', time: '3 hours ago', read: true },
  ]);

  // Mark all notifications as read
  const handleMarkAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // View all notifications (navigate to notifications page or show toast)
  const handleViewAllNotifications = () => {
    setIsNotificationOpen(false);
    // TODO: Replace with navigate('/notifications') when page exists
    alert('Notifications page coming soon!');
  };
  const navigate = useNavigate();

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  // Dark mode effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Close search results and notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search debounce effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Fetch employees
        const employees = await api.get<any[]>('/employees');

        // Filter by search query
        const query = searchQuery.toLowerCase();
        const employeeResults: SearchResult[] = employees
          .filter(e =>
            e.name?.toLowerCase().includes(query) ||
            e.role?.toLowerCase().includes(query) ||
            e.department?.toLowerCase().includes(query) ||
            e.email?.toLowerCase().includes(query)
          )
          .slice(0, 5)
          .map(e => ({
            id: e.id,
            type: 'employee' as const,
            title: e.name,
            subtitle: `${e.role} • ${e.department}`,
            avatar: e.avatar
          }));

        setSearchResults(employeeResults);
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleResultClick = (result: SearchResult) => {
    if (result.type === 'employee') {
      navigate(`/employees/${result.id}`);
    }
    setSearchQuery('');
    setShowResults(false);
  };

  return (
    <>
      <ChangePasswordModal isOpen={isChangePasswordOpen} onClose={() => setIsChangePasswordOpen(false)} />
      <header className="h-16 bg-card-light dark:bg-card-dark border-b border-border-light dark:border-border-dark flex items-center justify-between px-4 md:px-8 sticky top-0 z-20 shadow-sm">

        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark text-text-light dark:text-text-dark transition-colors"
        >
          <Menu size={24} />
        </button>

        {/* Search */}
        <div className="md:w-96 hidden md:block" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark group-focus-within:text-primary transition-colors" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery && setShowResults(true)}
              placeholder="Search employees, documents, policies..."
              className="w-full pl-10 pr-10 py-2 bg-background-light dark:bg-background-dark border border-transparent focus:border-primary/30 rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(''); setShowResults(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted-light hover:text-text-light transition-colors"
              >
                <X size={16} />
              </button>
            )}

            {/* Search Results Dropdown */}
            {showResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-lg overflow-hidden z-50">
                {isSearching ? (
                  <div className="p-4 text-center text-text-muted-light text-sm">Searching...</div>
                ) : searchResults.length > 0 ? (
                  <ul>
                    {searchResults.map(result => (
                      <li key={`${result.type}-${result.id}`}>
                        <button
                          onClick={() => handleResultClick(result)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-background-light dark:hover:bg-background-dark transition-colors text-left"
                        >
                          {result.avatar ? (
                            <img src={result.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              {result.type === 'employee' ? <Users size={16} className="text-primary" /> : <FileText size={16} className="text-primary" />}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-text-light dark:text-text-dark">{result.title}</p>
                            <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{result.subtitle}</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-4 text-center text-text-muted-light text-sm">No results found</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full hover:bg-background-light dark:hover:bg-background-dark text-text-muted-light dark:text-text-muted-dark transition-colors"
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative p-2 rounded-full hover:bg-background-light dark:hover:bg-background-dark text-text-muted-light dark:text-text-muted-dark transition-colors"
            >
              <Bell size={20} />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-red rounded-full ring-2 ring-card-light dark:ring-card-dark"></span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotificationOpen && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-4 py-3 border-b border-border-light dark:border-border-dark flex justify-between items-center">
                  <h3 className="font-semibold text-text-light dark:text-text-dark">Notifications</h3>
                  <button onClick={handleMarkAllRead} className="text-xs text-primary font-medium cursor-pointer hover:underline">Mark all read</button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ? notifications.map(notif => (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 hover:bg-background-light dark:hover:bg-background-dark cursor-pointer border-b border-border-light dark:border-border-dark last:border-0 ${!notif.read ? 'bg-primary/5' : ''}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!notif.read ? 'bg-primary' : 'bg-transparent'}`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-light dark:text-text-dark">{notif.title}</p>
                          <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5 truncate">{notif.message}</p>
                          <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">{notif.time}</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="px-4 py-8 text-center text-text-muted-light text-sm">No notifications</div>
                  )}
                </div>
                <div className="px-4 py-2 border-t border-border-light dark:border-border-dark text-center">
                  <button onClick={handleViewAllNotifications} className="text-sm text-primary hover:underline">View All Notifications</button>
                </div>
              </div>
            )}
          </div>

          <div className="h-8 w-px bg-border-light dark:bg-border-dark mx-2"></div>

          <div className="relative">
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 hover:bg-background-light dark:hover:bg-background-dark p-1.5 rounded-lg transition-colors"
            >
              <img
                src={user?.avatar || 'https://ui-avatars.com/api/?name=User'}
                alt="User"
                className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20"
              />
              <div className="text-left hidden sm:block">
                <p className="text-sm font-semibold text-text-light dark:text-text-dark leading-none">{user?.name}</p>
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1 flex items-center gap-1">
                  {user?.role === 'HR_ADMIN' && <Shield size={10} className="text-primary" />}
                  {user?.jobTitle}
                </p>
              </div>
              <ChevronDown size={14} className="text-text-muted-light" />
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-200">
                <button
                  onClick={() => {
                    navigate(`/employees/${user?.id}`);
                    setIsProfileOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark flex items-center gap-2"
                >
                  <UserIcon size={16} /> Profile
                </button>
                <button
                  onClick={() => {
                    setIsChangePasswordOpen(true);
                    setIsProfileOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark flex items-center gap-2"
                >
                  <Lock size={16} /> Change Password
                </button>
                <div className="h-px bg-border-light dark:bg-border-dark my-1"></div>
                <button
                  onClick={() => {
                    logout();
                    setIsProfileOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-background-light dark:hover:bg-background-dark flex items-center gap-2"
                >
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};