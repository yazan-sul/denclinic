'use client';

import { useContext, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { AuthContext } from '@/context/AuthContext';
import { menuItems } from '@/config/menuItems';
import { getIcon } from '@/config/iconMap';

const DoctorBottomNavigation = () => {
  const pathname = usePathname();
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const isLoading = authContext?.isLoading;

  // Infer role from pathname if user is not set
  const inferredRole = useMemo(() => {
    if (user) {
      return user.role;
    }
    if (pathname.startsWith('/doctor')) {
      return 'DOCTOR';
    }
    return 'DOCTOR';
  }, [user, pathname]);

  // Filter navigation items based on role
  const filteredNavItems = useMemo(() => {
    return menuItems.filter((item) => item.roles.includes(inferredRole));
  }, [inferredRole]);

  // Determine active tab based on exact pathname match
  const activeTabId = useMemo(() => {
    const activeItem = filteredNavItems.find((item) => pathname === item.href);
    return activeItem?.id || null;
  }, [pathname, filteredNavItems]);

  if (isLoading) {
    return null; // Don't show nav during loading
  }

  return (
    <nav className="md:hidden w-full bg-card border-t border-border shadow-lg">
      <div className="flex w-full">
        {filteredNavItems.map((item) => (
          <Link key={item.id} href={item.href} className="flex-1">
            <button
              className={`w-full flex flex-col items-center justify-center py-3 px-2 transition-colors duration-200 cursor-pointer ${
                activeTabId === item.id
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
