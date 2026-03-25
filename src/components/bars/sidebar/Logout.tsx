"use client";

import React from "react";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

const Logout: React.FC = () => {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    router.push("/login");
    router.refresh();
  };

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center justify-center gap-2 px-3 py-3 border-t border-gray-200 dark:border-gray-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 cursor-pointer font-medium"
    >
      <LogOut className="w-5 h-5" />
      <span>تسجيل الخروج</span>
    </button>
  );
};

export default Logout;
