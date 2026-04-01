'use client';

import { useState } from 'react';
import MenuItem from './MenuItem';
import SidebarHeader from './SidebarHeader';
import SidebarFooter from './SidebarFooter';
import {
  HomeIcon,
  CalendarIcon,
  UsersIcon,
  MessageIcon,
  ReportsIcon,
  SettingsIcon,
} from '@/components/Icons';

interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems: MenuItem[] = [
    {
      id: 'home',
      label: 'الرئيسية',
      href: '/dashboard',
      icon: <HomeIcon />,
    },
    {
      id: 'appointments',
      label: 'المواعيد',
      href: '/appointments',
      icon: <CalendarIcon />,
      badge: 3,
    },
    {
      id: 'patients',
      label: 'المرضى',
      href: '/patients',
      icon: <UsersIcon />,
    },
    {
      id: 'messages',
      label: 'الرسائل',
      href: '/messages',
      icon: <MessageIcon />,
      badge: 5,
    },
    {
      id: 'reports',
      label: 'التقارير',
      href: '/reports',
      icon: <ReportsIcon />,
    },
    {
      id: 'settings',
      label: 'الإعدادات',
      href: '/settings',
      icon: <SettingsIcon />,
    },
  ];

  return (
    <aside
      className={`bg-card border-l border-border transition-all duration-300 flex flex-col shadow-sm ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <SidebarHeader isCollapsed={isCollapsed} onToggleCollapse={() => setIsCollapsed(!isCollapsed)} />

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto py-2">
        {menuItems.map((item) => (
          <MenuItem
            key={item.id}
            {...item}
            isCollapsed={isCollapsed}
          />
        ))}
      </nav>

      <SidebarFooter isCollapsed={isCollapsed} />
    </aside>
  );
};

export default Sidebar;
