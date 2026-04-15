'use client';

import { useState } from 'react';
import { useTheme } from '@/context/ThemeContext';

import {
  MoonIcon,
  SunIcon,
  SystemIcon
} from '@/components/Icons';
interface TopBarProps {
  userName?: string;
}

const TopBar = ({ userName = 'الدكتور' }: TopBarProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setIsDropdownOpen(false);
  };

  const getThemeIcon = () => {
    switch (theme) {
      case 'dark':
        return <MoonIcon />;
      case 'light':
        return <SunIcon />;
      default:
        return <SystemIcon />;
    }
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-40">
      <div className="flex items-center justify-between px-8 py-4">
        <div></div> {/* Empty div for layout balance */}

        {/* Theme Toggle */}
        <div className="relative">
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-foreground hover:bg-secondary transition-colors border border-border cursor-pointer"
            title="اختر الوضع"
          >
            {getThemeIcon()}
            <span className="text-sm font-medium hidden sm:inline">
              {theme === 'dark' ? 'داكن' : theme === 'light' ? 'فاتح' : 'النظام'}
            </span>
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute left-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg z-50">
              <button
                onClick={() => handleThemeChange('light')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-colors ${
                  theme === 'light'
                    ? 'bg-secondary text-primary border-r-4 border-primary'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                <SunIcon />
                <span className="text-sm font-medium">الوضع الفاتح Light</span>
              </button>

              <button
                onClick={() => handleThemeChange('dark')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-colors border-t border-border ${
                  theme === 'dark'
                    ? 'bg-secondary text-primary border-r-4 border-primary'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                <MoonIcon />
                <span className="text-sm font-medium">الوضع الداكن Dark</span>
              </button>

              <button
                onClick={() => handleThemeChange('system')}
                className={`w-full flex items-center gap-3 px-4 py-3 text-right transition-colors border-t border-border ${
                  theme === 'system'
                    ? 'bg-secondary text-primary border-r-4 border-primary'
                    : 'text-foreground hover:bg-secondary'
                }`}
              >
                <SystemIcon />
                <span className="text-sm font-medium">إعدادات النظام System</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopBar;
