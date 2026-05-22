import { useState, useEffect } from 'react';

export function useAppearanceSettings() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');

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

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system' | null;

    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } else {
      applyTheme('system'); // Default to system
    }
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    mediaQuery.addEventListener('change', handleSystemThemeChange);
    return () => mediaQuery.removeEventListener('change', handleSystemThemeChange);
  }, [theme]);

  return {
    theme,
    setTheme,
    applyTheme,
  };
}
