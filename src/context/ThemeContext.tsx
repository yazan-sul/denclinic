'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getSavedTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark';

  const savedTheme = window.localStorage.getItem('theme');
  return savedTheme === 'light' || savedTheme === 'dark' || savedTheme === 'system'
    ? savedTheme
    : 'dark';
};

const shouldUseDarkTheme = (theme: Theme) => {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;

  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const syncDocumentTheme = (newTheme: Theme) => {
  const shouldBeDark = shouldUseDarkTheme(newTheme);

  if (shouldBeDark) {
    document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = 'dark';
  } else {
    document.documentElement.classList.remove('dark');
    document.documentElement.style.colorScheme = 'light';
  }
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(getSavedTheme);
  const [isDark, setIsDark] = useState(() => shouldUseDarkTheme(getSavedTheme()));

  const applyTheme = (newTheme: Theme) => {
    const shouldBeDark = shouldUseDarkTheme(newTheme);
    setIsDark(shouldBeDark);
    syncDocumentTheme(newTheme);
  };

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  useEffect(() => {
    syncDocumentTheme(theme);
  }, [theme]);

  // Listen to system theme changes
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

      const handleChange = (e: MediaQueryListEvent) => {
        setIsDark(e.matches);
        if (e.matches) {
          document.documentElement.classList.add('dark');
          document.documentElement.style.colorScheme = 'dark';
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.style.colorScheme = 'light';
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    // Silent fallback for SSR/hydration mismatch - return default theme
    return {
      theme: 'dark' as Theme,
      setTheme: () => {},
      isDark: true,
    };
  }
  return context;
};
