'use client';

import { useState, useContext, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthContext } from '@/context/AuthContext';
import { doctorMenuItems } from '@/config/doctorMenuItems';
import { getIcon } from '@/config/iconMap';

const DoctorBottomNavigation = () => {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState('home');
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const isLoading = authContext?.isLoading;

  // Filter navigation items based on user role
  const filteredNavItems = useMemo(() => {
    if (!user) {
      // Default to doctor items if no user
      return doctorMenuItems.filter((item) => item.roles.includes('DOCTOR'));
    }
    return doctorMenuItems.filter((item) => item.roles.includes(user.role));
  }, [user]);

  // Determine active tab based on current pathname
  const detectActiveTab = useMemo(() => {
    const activeItem = filteredNavItems.find(
      (item) => pathname === item.href || pathname.startsWith(item.href + '/')
    );
    return activeItem?.id || 'home';
  }, [pathname, filteredNavItems]);

  if (isLoading) {
    return null; // Don't show nav during loading
  }

  return (
    <nav className="md:hidden w-full bg-card border-t border-border shadow-lg">
      <div className="flex justify-around items-center">
        {filteredNavItems.map((item) => (
          <Link key={item.id} href={item.href}>
            <button
              onClick={() => setActiveTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-3 px-2 transition-colors duration-200 ${
                detectActiveTab === item.id
                  ? 'text-primary bg-secondary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {getIcon(item.iconName)}
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </button>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default DoctorBottomNavigation;
