"use client";

import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: (mode: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved =
        typeof window !== "undefined" && localStorage.getItem("theme");
      if (saved === "light" || saved === "dark" || saved === "system")
        return saved;
    } catch {}
    return "system";
  });

  // Apply theme to document element whenever it changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    const apply = (mode: Theme) => {
      if (mode === "dark") {
        document.documentElement.classList.add("dark");
      } else if (mode === "light") {
        document.documentElement.classList.remove("dark");
      } else {
        const prefersDark = window.matchMedia(
          "(prefers-color-scheme: dark)"
        ).matches;
        if (prefersDark) document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
      }
    };

    apply(theme);

    try {
      localStorage.setItem("theme", theme);
    } catch {}
  }, [theme]);

  // Listen for system preference changes when in 'system' mode
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (theme === "system") {
        if (mq.matches) document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme]);

  const toggleTheme = (mode: Theme) => {
    setTheme(mode);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
