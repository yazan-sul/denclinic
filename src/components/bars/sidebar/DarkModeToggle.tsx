"use client";

import React, { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";

interface DarkModeToggleProps {
  isDarkMode: boolean;
  toggleDarkMode: () => void;
}

const DarkModeToggle: React.FC<DarkModeToggleProps> = ({
  isDarkMode,
  toggleDarkMode,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <button
      onClick={toggleDarkMode}
      className="flex items-center gap-3 w-full py-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors duration-200"
      aria-label="Toggle dark mode"
    >
      {/* ✅ SAME element, only content changes */}
      {!mounted ? (
        <div className="w-5 h-5" />
      ) : isDarkMode ? (
        <Sun className="w-5 h-5 flex-shrink-0" />
      ) : (
        <Moon className="w-5 h-5 flex-shrink-0" />
      )}
    </button>
  );
};

export default DarkModeToggle;
