
import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Breadcrumbs } from './Breadcrumbs';
import { Outlet } from 'react-router-dom';
import { SessionTimeoutWarning } from './SessionTimeoutWarning';
import { useSessionTimeout } from '../hooks/useSessionTimeout';

export const Layout: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Session timeout management (30 min timeout, warning at 25 min)
  const { showWarning, timeLeft, extendSession, logout } = useSessionTimeout({
    warningTime: 25 * 60 * 1000, // 25 minutes
    logoutTime: 30 * 60 * 1000, // 30 minutes
  });

  return (
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
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>

      {/* Session Timeout Warning Modal */}
      <SessionTimeoutWarning
        isOpen={showWarning}
        timeLeft={timeLeft}
        onExtendSession={extendSession}
        onLogout={logout}
      />
    </div>
  );
};
