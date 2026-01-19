import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

interface UseSessionTimeoutOptions {
  warningTime?: number; // Time in ms before showing warning (default: 25 minutes)
  logoutTime?: number; // Time in ms before auto-logout (default: 30 minutes)
}

export const useSessionTimeout = (options: UseSessionTimeoutOptions = {}) => {
  const { logout, isAuthenticated } = useAuth();
  const { warningTime = 25 * 60 * 1000, logoutTime = 30 * 60 * 1000 } = options;

  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  const warningTimerRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimerRef = useRef<NodeJS.Timeout | null>(null);
  const countdownTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Clear all timers
  const clearTimers = useCallback(() => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
  }, []);

  // Reset all timers
  const resetTimers = useCallback(() => {
    clearTimers();
    setShowWarning(false);
    lastActivityRef.current = Date.now();

    // Set warning timer
    warningTimerRef.current = setTimeout(() => {
      setShowWarning(true);
      const warningDuration = logoutTime - warningTime;
      setTimeLeft(Math.floor(warningDuration / 1000));

      // Start countdown
      countdownTimerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(countdownTimerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, warningTime);

    // Set logout timer
    logoutTimerRef.current = setTimeout(() => {
      logout();
    }, logoutTime);
  }, [clearTimers, logout, logoutTime, warningTime]);

  // Handle user activity
  const handleActivity = useCallback(() => {
    const now = Date.now();
    const timeSinceLastActivity = now - lastActivityRef.current;

    // Only reset if there was significant time since last activity (debounce)
    if (timeSinceLastActivity > 1000) {
      resetTimers();
    }
  }, [resetTimers]);

  // Extend session (user clicked "Stay Logged In")
  const extendSession = useCallback(() => {
    resetTimers();
  }, [resetTimers]);

  // Initialize session timeout
  useEffect(() => {
    if (!isAuthenticated) {
      clearTimers();
      return;
    }

    resetTimers();

    // Activity event listeners
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Cleanup
    return () => {
      clearTimers();
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [isAuthenticated, handleActivity, resetTimers, clearTimers]);

  return {
    showWarning,
    timeLeft,
    extendSession,
    logout
  };
};
