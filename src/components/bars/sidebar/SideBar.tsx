"use client";

import React, { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import SidebarNav from "./SidebarNav";
import UserProfile from "./UserProfile";

import { LayoutDashboard, Ban, Shield, Users, FileText } from "lucide-react";
import Logout from "./Logout";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  isMobile?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  toggleSidebar,
  isMobile = false,
}) => {
  const pathname = usePathname();
  const sidebarRef = useRef<HTMLDivElement>(null);

  const mainNavItems: NavItem[] = [
    { name: "لوحة التحكم", href: "/dashboard", icon: LayoutDashboard },

    { name: "تصفية الويب", href: "/webBlock", icon: Shield },
    { name: "العائلة", href: "/addchild", icon: Users },
    { name: "تقارير الحوادث", href: "/reports", icon: FileText },
  ];
  const sidebarWidth = isOpen ? "w-64" : "w-16";

  return (
    <aside
      ref={sidebarRef}
      dir="rtl"
      className={`${isMobile ? "fixed right-0" : "relative"} ${
        isMobile && !isOpen ? "translate-x-full" : "translate-x-0"
      } ${sidebarWidth}  bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out flex flex-col shadow-xl pb-4`}
      aria-label="Main navigation"
    >
      {" "}
      <div className=" mt-6">
        <UserProfile isOpen={isOpen} />
      </div>
      <SidebarNav
        items={mainNavItems}
        isOpen={isOpen}
        pathname={pathname}
        onItemClick={() => isMobile && toggleSidebar()}
      />
      <Logout />
    </aside>
  );
};

export default Sidebar;
