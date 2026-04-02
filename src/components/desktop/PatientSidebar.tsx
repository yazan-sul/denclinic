'use client';

import { useState } from 'react';
import MenuItem from './MenuItem';
import SidebarHeader from './SidebarHeader';
import SidebarFooter from './SidebarFooter';
import {
  HomeIcon,
  DocumentIcon,
  UsersIcon,
  CalendarIcon,
  ProfileIcon,
} from '@/components/Icons';

interface MenuItem {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

const PatientSidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems: MenuItem[] = [
    {
      id: 'home',
      label: 'الرئيسية',
      href: '/patient',
      icon: <HomeIcon />,
    },
    {
      id: 'bookings',
      label: 'الحجوزات',
      href: '/patient/bookings',
      icon: <CalendarIcon />,
      badge: 2,
    },
    {
      id: 'family',
      label: 'العائلة',
      href: '/patient/family',
      icon: <UsersIcon />,
    },
    {
      id: 'records',
      label: 'السجلات الطبية',
      href: '/patient/records',
      icon: <DocumentIcon />,
    },
    {
      id: 'settings',
      label: 'الإعدادات',
      href: '/patient/settings',
      icon: <ProfileIcon />,
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

export default PatientSidebar;
