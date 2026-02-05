import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Bell,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Shield,
  Lock,
  Users,
  FileText,
  X,
  Menu,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { api, API_HOST } from "../lib/api";

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
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const { user, logout } = useAuth();
  const notificationRef = useRef<HTMLDivElement>(null);

  // Real notifications from API
  interface NotificationItem {
    id: string;
    title: string;
    message: string;
    type: string;
    read: boolean;
    link?: string;
    time: string;
  }

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  // Fetch notifications from API
  useEffect(() => {
    const fetchNotifications = async () => {
      setIsLoadingNotifications(true);
      try {
        const data = await api.get<NotificationItem[]>("/notifications");
        setNotifications(data);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setIsLoadingNotifications(false);
      }
    };

    fetchNotifications();
    // Refresh notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    try {
      await api.put("/notifications/mark-all-read", {});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (error) {
      console.error("Failed to mark notifications as read:", error);
    }
  };

  // View all notifications (navigate to notifications page or show toast)
  const handleViewAllNotifications = () => {
    setIsNotificationOpen(false);
    // TODO: Replace with navigate('/notifications') when page exists
    alert("Notifications page coming soon!");
  };
  const navigate = useNavigate();

  // Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

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
  };

  // Load theme from localStorage on mount and listen for system changes
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;

    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme('system'); // Default to system
    }

    // Listen for system theme changes
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

  // Close search results and notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
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
        // Fetch employees
        const employees = await api.get<any[]>("/employees");

        // Filter by search query
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
            // Transform relative avatar URL to absolute URL
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

  const handleResultClick = (result: SearchResult) => {
    if (result.type === "employee") {
      navigate(`/employees/${result.id}`);
    }
    setSearchQuery("");
    setShowResults(false);
  };

  return (
    <>
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
      <header className="h-16 bg-card-light dark:bg-card-dark border-b border-border-light dark:border-border-dark flex items-center justify-between px-4 md:px-8 sticky top-0 z-20 shadow-sm">
        {/* Mobile Menu Button */}
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark text-text-light dark:text-text-dark transition-colors"
        >
          <Menu size={24} />
        </button>

        {/* Desktop Search */}
        <div className="md:w-96 hidden md:block" ref={searchRef}>
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted-light dark:text-text-muted-dark group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery && setShowResults(true)}
              placeholder="Search employees, documents, policies..."
              autoComplete="off"
              className="w-full pl-10 pr-10 py-2 bg-background-light dark:bg-background-dark border border-transparent focus:border-primary/30 rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery("");
                  setShowResults(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted-light hover:text-text-light transition-colors"
              >
                <X size={16} />
              </button>
            )}

            {/* Search Results Dropdown */}
            {showResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-lg overflow-hidden z-50">
                {isSearching ? (
                  <div className="p-4 text-center text-text-muted-light text-sm">
                    Searching...
                  </div>
                ) : searchResults.length > 0 ? (
                  <ul>
                    {searchResults.map((result) => (
                      <li key={`${result.type}-${result.id}`}>
                        <button
                          onClick={() => handleResultClick(result)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-background-light dark:hover:bg-background-dark transition-colors text-left"
                        >
                          {result.avatar ? (
                            <img
                              src={result.avatar}
                              alt=""
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              {result.type === "employee" ? (
                                <Users size={16} className="text-primary" />
                              ) : (
                                <FileText size={16} className="text-primary" />
                              )}
                            </div>
                          )}
                          <div>
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
                ) : (
                  <div className="p-4 text-center text-text-muted-light text-sm">
                    No results found
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Mobile Search Toggle */}
          <button
            onClick={() => setIsMobileSearchOpen(!isMobileSearchOpen)}
            className="md:hidden p-2 rounded-full hover:bg-background-light dark:hover:bg-background-dark text-text-muted-light dark:text-text-muted-dark transition-colors"
          >
            <Search size={20} />
          </button>
          <div className="relative" ref={notificationRef}>
            <button
              onClick={() => setIsNotificationOpen(!isNotificationOpen)}
              className="relative p-2 rounded-full hover:bg-background-light dark:hover:bg-background-dark text-text-muted-light dark:text-text-muted-dark transition-colors"
            >
              <Bell size={20} />
              {notifications.filter((n) => !n.read).length > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent-red rounded-full ring-2 ring-card-light dark:ring-card-dark"></span>
              )}
            </button>

            {/* Notification Dropdown */}
            {isNotificationOpen && (
              <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                <div className="px-4 py-3 border-b border-border-light dark:border-border-dark flex justify-between items-center">
                  <h3 className="font-semibold text-text-light dark:text-text-dark">
                    Notifications
                  </h3>
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-primary font-medium cursor-pointer hover:underline"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`px-4 py-3 hover:bg-background-light dark:hover:bg-background-dark cursor-pointer border-b border-border-light dark:border-border-dark last:border-0 ${!notif.read ? "bg-primary/5" : ""}`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${!notif.read ? "bg-primary" : "bg-transparent"}`}
                          ></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-light dark:text-text-dark">
                              {notif.title}
                            </p>
                            <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-0.5 truncate">
                              {notif.message}
                            </p>
                            <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">
                              {notif.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-8 text-center text-text-muted-light text-sm">
                      No notifications
                    </div>
                  )}
                </div>
                <div className="px-4 py-2 border-t border-border-light dark:border-border-dark text-center">
                  <button
                    onClick={handleViewAllNotifications}
                    className="text-sm text-primary hover:underline"
                  >
                    View All Notifications
                  </button>
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
                src={user?.avatar || "https://ui-avatars.com/api/?name=User"}
                alt="User"
                className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/20"
              />
              <div className="text-left hidden sm:block">
                <p className="text-sm font-semibold text-text-light dark:text-text-dark leading-none">
                  {user?.name}
                </p>
                <p className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1 flex items-center gap-1">
                  {user?.role === "HR_ADMIN" && (
                    <Shield size={10} className="text-primary" />
                  )}
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

      {/* Mobile Search Bar - slides down below header */}
      {isMobileSearchOpen && (
        <div className="md:hidden bg-card-light dark:bg-card-dark border-b border-border-light dark:border-border-dark px-4 py-3 shadow-sm z-10" ref={searchRef}>
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
              placeholder="Search employees..."
              autoFocus
              autoComplete="off"
              className="w-full pl-10 pr-10 py-2.5 bg-background-light dark:bg-background-dark border border-border-light dark:border-border-dark rounded-lg text-sm text-text-light dark:text-text-dark focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
            <button
              onClick={() => {
                setSearchQuery("");
                setShowResults(false);
                setIsMobileSearchOpen(false);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted-light hover:text-text-light transition-colors"
            >
              <X size={16} />
            </button>

            {/* Mobile Search Results */}
            {showResults && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark rounded-xl shadow-lg overflow-hidden z-50">
                {isSearching ? (
                  <div className="p-4 text-center text-text-muted-light text-sm">Searching...</div>
                ) : searchResults.length > 0 ? (
                  <ul>
                    {searchResults.map((result) => (
                      <li key={`mobile-${result.type}-${result.id}`}>
                        <button
                          onClick={() => { handleResultClick(result); setIsMobileSearchOpen(false); }}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-background-light dark:hover:bg-background-dark transition-colors text-left"
                        >
                          {result.avatar ? (
                            <img src={result.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users size={16} className="text-primary" />
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
      )}
    </>
  );
};
