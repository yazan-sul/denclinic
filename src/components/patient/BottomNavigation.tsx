'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  HomeIcon,
  UsersIcon,
  DocumentIcon,
  CalendarIcon,
  ProfileIcon,
} from '@/components/Icons';

const BottomNavigation = () => {
  const [activeTab, setActiveTab] = useState('home');

  const navItems = [
    {
      id: 'home',
      label: 'الرئيسية',
      icon: <HomeIcon />,
      href: '/patient',
    },
    {
      id: 'family',
      label: 'العائلة',
      icon: <UsersIcon />,
      href: '/patient/family',
    },
    {
      id: 'records',
      label: 'السجلات',
      icon: <DocumentIcon />,
      href: '/patient/records',
    },
    {
      id: 'bookings',
      label: 'الحجوزات',
      icon: <CalendarIcon />,
      href: '/patient/bookings',
    },
    {
      id: 'profile',
      label: 'الملف الشخصي',
      icon: <ProfileIcon />,
      href: '/patient/profile',
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-lg">
      <div className="flex justify-around items-center">
        {navItems.map((item) => (
          <Link key={item.id} href={item.href}>
            <button
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-colors duration-200 ${
                activeTab === item.id
                  ? 'text-primary bg-secondary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.icon}
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </button>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default BottomNavigation;
