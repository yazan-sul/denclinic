"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useTheme } from "@/context/ThemeContext";
import DarkModeToggle from "../sidebar/DarkModeToggle";

export default function Navbar() {
  const pathname = usePathname();

  const { theme, toggleTheme } = useTheme();
  const isDarkMode = theme === "dark";

  const handleToggle = () => {
    toggleTheme(isDarkMode ? "light" : "dark");
  };

  const navLinks = [
    { href: "/signup", label: "انشاء حساب" },
    { href: "/login", label: "تسجيل الدخول" },
    { href: "/support", label: "اتصل بنا" },
    { href: "/dashboard", label: "لوحة التحكم" },
  ];

  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors pb-1 ${
                  pathname === link.href
                    ? "text-blue-600 border-b-2 border-blue-600"
                    : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center px-3 py-1 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl">
            <DarkModeToggle
              isDarkMode={isDarkMode}
              toggleDarkMode={handleToggle}
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Image
            src="/next.svg"
            alt="Al-Haris Logo"
            width={50}
            height={50}
            className="object-contain"
          />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            الحارس
          </h1>
        </div>
      </div>
    </nav>
  );
}
