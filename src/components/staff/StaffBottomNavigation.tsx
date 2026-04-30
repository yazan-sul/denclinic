'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { staffBottomNavItems } from '@/config/staffMenuItems';
import { getIcon } from '@/config/iconMap';

export default function StaffBottomNavigation() {
  const pathname = usePathname();

  const activeTabId = useMemo(() => {
    const active = staffBottomNavItems.find((item) => pathname === item.href);
    return active?.id || null;
  }, [pathname]);

  return (
    <nav className="md:hidden w-full bg-card border-t border-border shadow-lg">
      <div className="flex w-full">
        {staffBottomNavItems.map((item) => (
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
              {item.badge && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-white text-[10px] rounded-full flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          </Link>
        ))}
      </div>
    </nav>
  );
}
