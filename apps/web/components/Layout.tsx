
import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Breadcrumbs } from './Breadcrumbs';
import { BottomNav } from './BottomNav';
import { Outlet, useLocation } from 'react-router-dom';
import { SessionTimeoutWarning } from './SessionTimeoutWarning';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import { useSocketQuerySync } from '../hooks/useSocketQuerySync';
import { UserStatusProvider } from '../contexts/UserStatusContext';

export const Layout: React.FC = () => {
  useSocketQuerySync();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  // Auto-close mobile drawer and scroll to top on every navigation.
  // Two-pass reset: immediate (before paint) + rAF (after iOS Safari restores overflow scroll).
  useLayoutEffect(() => {
    setIsMobileMenuOpen(false);
    if (mainRef.current) mainRef.current.scrollTop = 0;
    const raf = requestAnimationFrame(() => {
      if (mainRef.current) mainRef.current.scrollTop = 0;
    });
    return () => cancelAnimationFrame(raf);
  }, [location.pathname]);

  // Session timeout management (30 min timeout, warning at 25 min)
  const { showWarning, timeLeft, extendSession, logout } = useSessionTimeout({
    warningTime: 25 * 60 * 1000, // 25 minutes
    logoutTime: 30 * 60 * 1000, // 30 minutes
  });

  return (
    <UserStatusProvider>
      <div className="flex h-screen bg-background-light dark:bg-background-dark overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex">
          <Sidebar />
        </div>

        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar Drawer */}
        <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <Sidebar />
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          <Header onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} />
          {/* pb-20 on mobile to account for BottomNav (h-14 + safe area) */}
          <main ref={mainRef} className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6 lg:p-8 lg:pb-8">
            <Breadcrumbs />
            <Outlet />
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <BottomNav />

        {/* Session Timeout Warning Modal */}
        <SessionTimeoutWarning
          isOpen={showWarning}
          timeLeft={timeLeft}
          onExtendSession={extendSession}
          onLogout={logout}
        />
      </div>
    </UserStatusProvider>
  );
};
