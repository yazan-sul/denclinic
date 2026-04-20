'use client';

import { useMemo, useContext } from 'react';
import { usePathname } from 'next/navigation';
import MenuItem from './MenuItem';
import SidebarHeader from './SidebarHeader';
import SidebarFooter from './SidebarFooter';
import { AuthContext } from '@/context/AuthContext';
import { menuItems } from '@/config/menuItems';
import { getIcon } from '@/config/iconMap';

interface SidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar = ({ isCollapsed, onToggleCollapse }: SidebarProps) => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const isLoading = authContext?.isLoading;
  const pathname = usePathname();

  // Infer role from current pathname if user is not set
  const inferredRole = useMemo(() => {
    if (user) {
      return user.roles[0];
    }
    // Infer from pathname
    if (pathname.startsWith('/patient')) {
      return 'PATIENT';
    }
    if (pathname.startsWith('/doctor')) {
      return 'DOCTOR';
    }
    // Default to DOCTOR for other admin pages
    return 'DOCTOR';
  }, [user, pathname]);

  // Filter menu items based on role
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => item.roles.includes(inferredRole));
  }, [inferredRole]);

  return (
    <aside
      className={`h-full bg-card border-l border-border transition-all duration-300 flex flex-col shadow-sm ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <SidebarHeader isCollapsed={isCollapsed} onToggleCollapse={onToggleCollapse} />

      {/* Menu Items */}
      <nav className="flex-1 overflow-y-auto py-2">
        {isLoading ? (
          // Loading skeleton
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-12 bg-secondary rounded animate-pulse"
              />
            ))}
          </div>
        ) : (
          filteredMenuItems.map((item) => (
            <MenuItem
              key={item.id}
              id={item.id}
              label={item.label}
              href={item.href}
              icon={getIcon(item.iconName)}
              badge={item.badge}
              isCollapsed={isCollapsed}
            />
          ))
        )}
      </nav>

      <SidebarFooter isCollapsed={isCollapsed} />
    </aside>
  );
};

export default Sidebar;
