import React from 'react';
import { AlertTriangle, LogOut, RefreshCw } from 'lucide-react';

interface SessionTimeoutWarningProps {
  isOpen: boolean;
  timeLeft: number;
  onExtendSession: () => void;
  onLogout: () => void;
}

export const SessionTimeoutWarning: React.FC<SessionTimeoutWarningProps> = ({
  isOpen,
  timeLeft,
  onExtendSession,
  onLogout
}) => {
  if (!isOpen) return null;

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-card-dark rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 border-2 border-yellow-500">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="text-yellow-600 dark:text-yellow-400" size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-text-light dark:text-text-dark">
                Session Timeout Warning
              </h3>
              <p className="text-sm text-text-muted-light dark:text-text-muted-dark">
                Your session is about to expire
              </p>
            </div>
          </div>

          <div className="mb-6">
            <p className="text-text-light dark:text-text-dark mb-3">
              Due to inactivity, you will be automatically logged out in:
            </p>
            <div className="flex justify-center">
              <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-center min-w-[120px]">
                <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 font-mono">
                  {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </div>
                <div className="text-xs text-text-muted-light dark:text-text-muted-dark mt-1">
                  minutes remaining
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onLogout}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 dark:bg-gray-800 text-text-light dark:text-text-dark rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            >
              <LogOut size={16} />
              Logout Now
            </button>
            <button
              onClick={onExtendSession}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
            >
              <RefreshCw size={16} />
              Stay Logged In
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
