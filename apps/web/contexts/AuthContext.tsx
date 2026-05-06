import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole } from '../types';
import { api, API_HOST, BASE_URL } from '../lib/api';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<boolean>;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
  isAuthenticated: boolean;
  loading: boolean;
  viewMode: 'admin' | 'employee';
  isAdminView: boolean;
  toggleViewMode: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'admin' | 'employee'>(
    () => (sessionStorage.getItem('viewMode') as 'admin' | 'employee') || 'admin'
  );

  const isAdminView = ['HR_ADMIN', 'MANAGER', 'FINANCE'].includes(user?.role || '') && viewMode === 'admin';

  const toggleViewMode = () => {
    setViewMode(prev => {
      const next = prev === 'admin' ? 'employee' : 'admin';
      sessionStorage.setItem('viewMode', next);
      return next;
    });
  };

  // Initialize from localStorage or sessionStorage
  React.useEffect(() => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    const storedUser = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (token && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        // Ensure id is set (may be missing if stored from a token refresh)
        if (!parsedUser.id) {
          parsedUser.id = parsedUser.employeeId || parsedUser.userId;
        }
        // Transform relative avatar URL to absolute URL if needed
        if (parsedUser.avatar && parsedUser.avatar.startsWith('/')) {
          parsedUser.avatar = `${API_HOST}${parsedUser.avatar}`;
        }
        setUser(parsedUser);
      } catch (e) {
        console.error("Failed to parse user from storage", e);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        sessionStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('refreshToken');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string, rememberMe?: boolean): Promise<boolean> => {
    try {
      const data = await api.auth.login({ email, password, rememberMe });

      // Backend returns: { token, user: BackendUser }
      // Map BackendUser to frontend User type
      // Transform relative avatar URL to absolute URL
      const avatarUrl = data.user.avatar
        ? (data.user.avatar.startsWith('/') ? `${API_HOST}${data.user.avatar}` : data.user.avatar)
        : 'https://ui-avatars.com/api/?name=User';

      const userObj: User = {
        id: data.user.employeeId || data.user.userId,
        userId: data.user.userId,
        employeeId: data.user.employeeId,
        email: data.user.email,
        name: data.user.name || 'User',
        role: data.user.role as UserRole,
        avatar: avatarUrl,
        jobTitle: data.user.jobTitle || 'Employee',
        bio: data.user.bio,
        phone: data.user.phone
      };

      // Clear both storages first to prevent stale tokens
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('refreshToken');
      sessionStorage.removeItem('user');

      // Store in localStorage (persists) or sessionStorage (clears on browser close)
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('token', data.accessToken || data.token);
      storage.setItem('refreshToken', data.refreshToken);
      storage.setItem('user', JSON.stringify(userObj));
      setUser(userObj);
      return true;
    } catch (err) {
      console.error(err);
      return false;
    }
  };

  const logout = () => {
    // Fire-and-forget: revoke refresh token on the server
    const rt = localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
    if (rt) {
      fetch(`${BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: rt }),
      }).catch(() => { /* best-effort */ });
    }

    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('refreshToken');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('viewMode');
    setUser(null);
    setViewMode('admin');
    // Force redirect to login if needed, or let the ProtectedRoute handle it
    window.location.href = '/#/login';
  };

  const updateUser = (updates: Partial<User>) => {
    if (!user) return;

    // Resolve relative avatar path to absolute URL (consistent with login/init)
    if (updates.avatar && updates.avatar.startsWith('/')) {
      updates = { ...updates, avatar: `${API_HOST}${updates.avatar}` };
    }

    const updatedUser = { ...user, ...updates };
    setUser(updatedUser);
    // Update whichever storage holds the current session
    const storage = localStorage.getItem('token') ? localStorage : sessionStorage;
    storage.setItem('user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser, isAuthenticated: !!user, loading, viewMode, isAdminView, toggleViewMode }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};