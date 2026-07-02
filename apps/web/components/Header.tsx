import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from 'react-i18next';
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Shield,
  FileText,
  X,
  Menu,
  ArrowLeft,
  Info,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Users,
  Settings,
} from "lucide-react";
import { NotificationType } from "../types";
import { useAuth } from "../contexts/AuthContext";
import { useNotifications } from "../contexts/NotificationContext";
import { useNavigate } from "react-router-dom";
import { api, API_HOST } from "../lib/api";
import { Avatar } from "./Avatar";
import { StatusIndicator } from "./StatusIndicator";
import { StatusPicker } from "./StatusPicker";
import { useUserStatus } from "../contexts/UserStatusContext";
import { translateNotifTitle, translateNotifMessage, formatNotifTimeAgo } from "../utils/notificationTranslation";

const notifTypeConfig: Record<NotificationType, { icon: React.ElementType; bg: string; text: string }> = {
  info: { icon: Info, bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-500 dark:text-blue-400' },
  success: { icon: CheckCircle2, bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-500 dark:text-green-400' },
  warning: { icon: AlertTriangle, bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-500 dark:text-orange-400' },
  leave: { icon: Calendar, bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-500 dark:text-purple-400' },
  employee: { icon: Users, bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-500 dark:text-teal-400' },
  document: { icon: FileText, bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-500 dark:text-indigo-400' },
  system: { icon: Settings, bg: 'bg-gray-100 dark:bg-gray-700/30', text: 'text-gray-500 dark:text-gray-400' },
};

interface SearchResult {
  id: string;
  type: "employee" | "document";
  title: string;
  subtitle: string;
  avatar?: string;
}

interface HeaderProps {
  onMenuClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { t } = useTranslation('common');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const { user, logout, isAdminView, toggleViewMode } = useAuth();
  const { getStatus, getStatusMessage } = useUserStatus();
  const { notifications, unreadCount, markAllAsRead, markAsRead } = useNotifications();
  const myStatus = user?.id ? getStatus(user.id) : 'offline';
  const myStatusMessage = user?.id ? getStatusMessage(user.id) : '';
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const handleMarkAllRead = async () => {
    await markAllAsRead();
  };

  const handleViewAllNotifications = () => {
    setIsNotificationOpen(false);
    navigate('/notifications');
  };

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement>(null);

  // Apply theme to document
  const applyTheme = (themeMode: 'light' | 'dark' | 'system') => {
    const root = document.documentElement;

    if (themeMode === 'system') {
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
  };

  // Load theme from localStorage on mount and listen for system changes
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;

    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme('system');
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      const currentTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;
      if (currentTheme === 'system' || !currentTheme) {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, []);

  // Close dropdowns when clicking outside (desktop only — mobile uses backdrop overlays)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Skip on mobile: portals are rendered outside refs, so mousedown
      // would close the bottom sheet before the click event reaches buttons.
      const isMobile = window.innerWidth < 640;
      if (isMobile) return;

      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setIsNotificationOpen(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
        const employees = await api.get<any[]>("/employees");

        const query = searchQuery.toLowerCase();
        const employeeResults: SearchResult[] = employees
          .filter(
            (e) =>
              e.name?.toLowerCase().includes(query) ||
              e.role?.toLowerCase().includes(query) ||
              e.department?.toLowerCase().includes(query) ||
              e.email?.toLowerCase().includes(query),
          )
          .slice(0, 5)
          .map((e) => ({
            id: e.id,
            type: "employee" as const,
            title: e.name,
            subtitle: `${e.role} • ${e.department}`,
            avatar: e.avatar && e.avatar.startsWith('/')
              ? `${API_HOST}${e.avatar}`
              : e.avatar,
          }));

        setSearchResults(employeeResults);
        setShowResults(true);
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Focus mobile search input when overlay opens
  useEffect(() => {
    if (isMobileSearchOpen) {
      setTimeout(() => mobileSearchInputRef.current?.focus(), 100);
    }
  }, [isMobileSearchOpen]);

  // Close mobile overlays on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isMobileSearchOpen) { closeMobileSearch(); return; }
        if (isNotificationOpen) { setIsNotificationOpen(false); return; }
        if (isProfileOpen) { setIsProfileOpen(false); return; }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isMobileSearchOpen, isNotificationOpen, isProfileOpen]);

  const handleResultClick = (result: SearchResult) => {
    if (result.type === "employee") {
      navigate(`/employees/${result.id}`);
    }
    setSearchQuery("");
    setShowResults(false);
    setIsMobileSearchOpen(false);
  };

  const closeMobileSearch = () => {
    setSearchQuery("");
    setShowResults(false);
    setIsMobileSearchOpen(false);
  };

  // Shared search results renderer
  const renderSearchResults = () => (
    <>
      {isSearching ? (
        <div className="p-4 text-center text-text-muted-light text-sm">
          {t('header.searching')}
        </div>
      ) : searchResults.length > 0 ? (
        <ul>
          {searchResults.map((result) => (
            <li key={`${result.type}-${result.id}`}>
              <button
                onClick={() => handleResultClick(result)}
                className="w-full flex items-center gap-3 px-4 py-3 min-h-[44px] hover:bg-background-light dark:hover:bg-background-dark transition-colors text-left active:bg-background-light dark:active:bg-background-dark"
              >
                {result.type === "employee" ? (
                  <Avatar
                    src={result.avatar}
                    name={result.title}
                    size="md"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <FileText size={16} className="text-primary" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-light dark:text-text-dark">
                    {result.title}
                  </p>
                  <p className="text-xs text-text-muted-light dark:text-text-muted-dark">
                    {result.subtitle}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : searchQuery.trim() ? (
        <div className="p-4 text-center text-text-muted-light text-sm">
          {t('header.noResults')}
        </div>
      ) : null}
    </>
  );

  return (
    <>
      <header className="bg-card-light dark:bg-card-dark border-b border-border-light dark:border-border-dark sticky top-0 z-20 shadow-sm" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="h-16 flex items-center justify-between px-4 md:px-8">
        {/* Mobile Menu Button — 44px touch target */}
        <button
          onClick={onMenuClick}
          aria-label={t('aria.openMenu')}
          className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-background-light dark:hover:bg-background-dark text-text-light dark:text-text-dark transition-colors active:bg-background-light"
        >
          <Menu size={24} />
        </button>

        {/* Desktop Search */}
        <div className="md:w-96 hidden md:block" ref={searchRef}>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark"
              size={18}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery && setShowResults(true)}
              placeholder={t('header.searchPlaceholder')}
              autoComplete="off"
              className="w-full pl-10 pr-10 py-2 bg-background-light dark:bg-background-dark border border-transparent focus:border-primary/30 rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setShowResults(false);
                }}
                aria-label={t('aria.clearSearch')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted-light hover:text-text-light transition-colors"
              >
                <X size={16} />
              </button>
            )}

            {/* Desktop Search Results */}
            {showResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-lg overflow-hidden z-50">
                {renderSearchResults()}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-4">
          {/* Mobile Search Toggle — 44px touch target */}
          <button
            onClick={() => setIsMobileSearchOpen(true)}
            aria-label={t('aria.search')}
            className="md:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-background-light dark:hover:bg-background-dark text-text-muted-light dark:text-text-muted-dark transition-colors active:bg-background-light"
          >
            <Search size={20} />
          </button>

          {/* Notification Button — 44px touch target */}
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              aria-label={t('aria.notifications')}
              className="relative min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full hover:bg-background-light dark:hover:bg-background-dark text-text-muted-light dark:text-text-muted-dark transition-colors active:bg-background-light"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-accent-red rounded-full ring-2 ring-card-light dark:ring-card-dark"></span>
              )}
            </button>

            {/* Desktop Notification Dropdown */}
            {isNotificationOpen && (
              <div className="hidden sm:block absolute right-0 top-full mt-2 w-80 max-w-sm bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-lg overflow-hidden z-50 animate-fade-in">
                {renderNotificationContent()}
              </div>
            )}
          </div>

          {/* Admin/Employee Toggle — for HR_ADMIN, MANAGER, FINANCE */}
          {['HR_ADMIN', 'MANAGER', 'FINANCE'].includes(user?.role || '') && (
            <button
              onClick={() => {
                toggleViewMode();
                navigate("/");
              }}
              className="hidden sm:flex items-center gap-1.5 group min-h-[44px]"
              title={isAdminView ? t('header.switchToEmployee') : t('header.switchToAdmin')}
            >
              <span className="text-[11px] font-medium text-text-muted-light dark:text-text-muted-dark">
                {isAdminView ? t('header.admin') : t('header.employee')}
              </span>
              <div className={`relative w-8 h-[18px] rounded-full transition-colors duration-200 ${isAdminView ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
                <div className={`absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm transition-transform duration-200 ${isAdminView ? 'translate-x-[15px]' : 'translate-x-[2px]'}`} />
              </div>
            </button>
          )}

          <div className="h-8 w-px bg-border-light dark:bg-border-dark mx-1 sm:mx-2"></div>

          {/* Profile Button — 44px touch target */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 hover:bg-background-light dark:hover:bg-background-dark p-1.5 rounded-lg transition-colors min-h-[44px] active:bg-background-light"
            >
              <div className="relative">
                <Avatar
                  src={user?.avatar}
                  name={user?.name}
                  size="md"
                  className="ring-2 ring-primary/20"
                />
                <StatusIndicator
                  status={myStatus}
                  statusMessage={myStatusMessage}
                  showTooltip
                  size="sm"
                  className="absolute -bottom-0.5 -right-0.5"
                />
              </div>
              <div className="text-left hidden sm:block min-w-0 max-w-[160px]">
                <p className="text-sm font-semibold text-text-light dark:text-text-dark leading-none truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1 flex items-center gap-1 min-w-0">
                  {isAdminView && (
                    <Shield size={10} className="text-primary shrink-0" />
                  )}
                  <span className="truncate">{user?.jobTitle}</span>
                </p>
              </div>
              <ChevronDown size={14} className="text-text-muted-light hidden sm:block" />
            </button>

            {/* Desktop Profile Dropdown */}
            {isProfileOpen && (
              <div className="hidden sm:block absolute right-0 top-full mt-2 w-56 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-lg py-1 z-30 animate-fade-in">
                {renderProfileContent()}
              </div>
            )}
          </div>
        </div>
      </div>
      </header>

      {/* ============================================================ */}
      {/* MOBILE PORTALS — rendered at document.body for proper z-index */}
      {/* ============================================================ */}

      {/* 1. Full-screen Mobile Search Overlay */}
      {isMobileSearchOpen && createPortal(
        <div className="fixed inset-0 z-[60] bg-card-light dark:bg-card-dark flex flex-col sm:hidden animate-fade-in">
          {/* Search Header */}
          <div className="flex items-center gap-2 px-3 h-14 border-b border-border-light dark:border-border-dark flex-shrink-0">
            <button
              onClick={closeMobileSearch}
              aria-label={t('aria.closeSearch')}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg text-text-muted-light dark:text-text-muted-dark active:bg-background-light dark:active:bg-background-dark"
            >
              <ArrowLeft size={22} />
            </button>
            <div className="flex-1 relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark" />
              <input
                ref={mobileSearchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('header.searchPlaceholderMobile')}
                autoComplete="off"
                className="w-full pl-9 pr-9 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  aria-label={t('aria.clearSearch')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted-light"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Search Results — fills remaining space */}
          <div className="flex-1 overflow-y-auto flex flex-col">
            {searchQuery.trim() ? (
              renderSearchResults()
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-text-muted-light dark:text-text-muted-dark">
                <div className="w-16 h-16 rounded-2xl bg-background-light dark:bg-background-dark flex items-center justify-center">
                  <Search size={26} className="opacity-30" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">{t('header.searchPlaceholderMobile')}</p>
                  <p className="text-xs mt-1 opacity-60">{t('header.searchHint', { defaultValue: 'ชื่อ · ตำแหน่ง · แผนก' })}</p>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* 2. Mobile Notification Bottom Sheet */}
      {isNotificationOpen && createPortal(
        <div className="sm:hidden fixed inset-0 z-[60]" onClick={() => setIsNotificationOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />
          {/* Bottom Sheet */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-card-light dark:bg-card-dark rounded-t-2xl shadow-xl animate-in slide-in-from-bottom duration-300 max-h-[80dvh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
              <div className="w-10 h-1 bg-border-light dark:bg-border-dark rounded-full" />
            </div>
            {renderNotificationContent()}
            <div className="pb-[env(safe-area-inset-bottom)]" />
          </div>
        </div>,
        document.body
      )}

      {/* 3. Mobile Profile Bottom Sheet */}
      {isProfileOpen && createPortal(
        <div className="sm:hidden fixed inset-0 z-[60]" onClick={() => setIsProfileOpen(false)}>
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" />
          {/* Bottom Sheet */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-card-light dark:bg-card-dark rounded-t-2xl shadow-xl animate-in slide-in-from-bottom duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-border-light dark:bg-border-dark rounded-full" />
            </div>
            {/* Profile Header */}
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border-light dark:border-border-dark">
              <div className="relative">
                <Avatar
                  src={user?.avatar}
                  name={user?.name}
                  size="lg"
                  className="ring-2 ring-primary/20"
                />
                <StatusIndicator
                  status={myStatus}
                  size="md"
                  className="absolute -bottom-0.5 -right-0.5"
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-light dark:text-text-dark">{user?.name}</p>
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark flex items-center gap-1">
                  {isAdminView && <Shield size={10} className="text-primary" />}
                  {user?.jobTitle}
                </p>
              </div>
            </div>
            {renderProfileContent()}
            {/* Admin toggle for mobile */}
            {['HR_ADMIN', 'MANAGER', 'FINANCE'].includes(user?.role || '') && (
              <div className="px-5 py-3 border-t border-border-light dark:border-border-dark">
                <button
                  onClick={() => {
                    toggleViewMode();
                    setIsProfileOpen(false);
                    navigate("/");
                  }}
                  className="w-full flex items-center justify-between min-h-[44px] text-sm text-text-light dark:text-text-dark"
                >
                  <span>{isAdminView ? t('header.switchToEmployee') : t('header.switchToAdmin')}</span>
                  <div className={`relative w-10 h-[22px] rounded-full transition-colors duration-200 ${isAdminView ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <div className={`absolute top-[3px] w-[16px] h-[16px] rounded-full bg-white shadow-sm transition-transform duration-200 ${isAdminView ? 'translate-x-[21px]' : 'translate-x-[3px]'}`} />
                  </div>
                </button>
              </div>
            )}
            <div className="pb-[env(safe-area-inset-bottom)]" />
          </div>
        </div>,
        document.body
      )}
    </>
  );

  // ---- Shared renderers for desktop dropdown + mobile bottom sheet ----

  function renderNotificationContent() {
    return (
      <>
        <div className="px-4 py-3 border-b border-border-light dark:border-border-dark flex justify-between items-center flex-shrink-0">
          <h3 className="font-semibold text-text-light dark:text-text-dark">
            {t('header.notifications')}
          </h3>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-primary font-medium cursor-pointer hover:underline min-h-[44px] flex items-center"
            >
              {t('header.markAllRead')}
            </button>
          )}
        </div>
        <div className="max-h-80 sm:max-h-80 overflow-y-auto flex-1">
          {notifications.length > 0 ? (
            notifications.map((notif) => {
              const config = notifTypeConfig[notif.type] || notifTypeConfig.info;
              const Icon = config.icon;

              return (
                <div
                  key={notif.id}
                  onClick={async () => {
                    if (!notif.read) await markAsRead(notif.id);
                    setIsNotificationOpen(false);
                    if (notif.link) navigate(notif.link);
                  }}
                  className={`px-4 py-3 min-h-[44px] hover:bg-background-light dark:hover:bg-background-dark active:bg-background-light dark:active:bg-background-dark cursor-pointer border-b border-border-light dark:border-border-dark last:border-0 transition-colors ${
                    !notif.read
                      ? 'bg-primary/5 dark:bg-primary/10'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Type Icon */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${config.bg}`}>
                      <Icon size={14} className={config.text} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm text-text-light dark:text-text-dark ${!notif.read ? 'font-semibold' : 'font-normal text-text-muted-light dark:text-text-muted-dark'}`}>
                        {translateNotifTitle(t, notif.title)}
                      </p>
                      <p className={`text-xs mt-0.5 truncate ${!notif.read ? 'text-text-light/70 dark:text-text-dark/70' : 'text-text-muted-light dark:text-text-muted-dark'}`}>
                        {translateNotifMessage(t, notif.message)}
                      </p>
                      <p className="text-[11px] text-text-muted-light dark:text-text-muted-dark mt-1">
                        {formatNotifTimeAgo(notif.created_at, t)}
                      </p>
                    </div>

                    {/* Unread Indicator */}
                    {!notif.read && (
                      <div className="w-2.5 h-2.5 rounded-full bg-primary flex-shrink-0 mt-1.5"></div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-4 py-8 text-center text-text-muted-light text-sm">
              {t('header.noNotifications')}
            </div>
          )}
        </div>
        <div className="px-4 py-2 border-t border-border-light dark:border-border-dark text-center flex-shrink-0">
          <button
            onClick={handleViewAllNotifications}
            className="text-sm text-primary hover:underline min-h-[44px] flex items-center justify-center w-full"
          >
            {t('header.viewAllNotifications')}
          </button>
        </div>
      </>
    );
  }

  function renderProfileContent() {
    return (
      <div className="py-1">
        <button
          onClick={() => {
            navigate(`/employees/${user?.id}`);
            setIsProfileOpen(false);
          }}
          className="w-full text-left px-5 sm:px-4 py-2 text-sm text-text-light dark:text-text-dark hover:bg-background-light dark:hover:bg-background-dark active:bg-background-light flex items-center gap-2 min-h-[44px]"
        >
          <UserIcon size={16} /> {t('header.profile')}
        </button>
        <div className="h-px bg-border-light dark:bg-border-dark my-1"></div>
        <StatusPicker onClose={() => setIsProfileOpen(false)} />
        <div className="h-px bg-border-light dark:bg-border-dark my-1"></div>
        <button
          onClick={() => {
            logout();
            setIsProfileOpen(false);
          }}
          className="w-full text-left px-5 sm:px-4 py-2 text-sm text-red-600 hover:bg-background-light dark:hover:bg-background-dark active:bg-background-light flex items-center gap-2 min-h-[44px]"
        >
          <LogOut size={16} /> {t('header.signOut')}
        </button>
      </div>
    );
  }
};
