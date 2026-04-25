'use client';

import { useMemo, useContext, useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import MenuItem from './MenuItem';
import SidebarHeader from './SidebarHeader';
import SidebarFooter from './SidebarFooter';
import AccountSwitcher from './AccountSwitcher';
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
  const activeRole = authContext?.activeRole;
  const pathname = usePathname();

  const inferredRole = useMemo(() => {
    if (activeRole) return activeRole;
    if (pathname.startsWith('/patient')) return 'PATIENT';
    if (pathname.startsWith('/doctor')) return 'DOCTOR';
    return 'DOCTOR';
  }, [activeRole, pathname]);

  // Filter menu items based on role
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter((item) => item.roles.includes(inferredRole));
  }, [inferredRole]);

  // Live badge count: today's pending + confirmed appointments
  const [appointmentsBadge, setAppointmentsBadge] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (inferredRole === 'PATIENT') return;
    const today = new Date().toISOString().split('T')[0];
    Promise.all([
      fetch(`/api/clinic/records?from=${today}&to=${today}&status=PENDING&pageSize=1`, { credentials: 'include' }).then((r) => r.json()),
      fetch(`/api/clinic/records?from=${today}&to=${today}&status=CONFIRMED&pageSize=1`, { credentials: 'include' }).then((r) => r.json()),
    ])
      .then(([pending, confirmed]) => {
        const total =
          (pending.success ? pending.pagination.total : 0) +
          (confirmed.success ? confirmed.pagination.total : 0);
        setAppointmentsBadge(total > 0 ? total : undefined);
      })
      .catch(() => {});
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
          <div className="space-y-2 p-2">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-12 bg-secondary rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* All items except settings */}
            {filteredMenuItems
              .filter((item) => item.iconName !== 'settings')
              .map((item) => (
                <MenuItem
                  key={item.id}
                  id={item.id}
                  label={item.label}
                  href={item.href}
                  icon={getIcon(item.iconName)}
                  badge={item.id === 'appointments' ? appointmentsBadge : item.badge}
                  isCollapsed={isCollapsed}
                />
              ))}

            {/* Account Switcher before settings */}
            <AccountSwitcher isCollapsed={isCollapsed} />

            {/* Settings item */}
            {filteredMenuItems
              .filter((item) => item.iconName === 'settings')
              .map((item) => (
                <MenuItem
                  key={item.id}
                  id={item.id}
                  label={item.label}
                  href={item.href}
                  icon={getIcon(item.iconName)}
                  badge={item.badge}
                  isCollapsed={isCollapsed}
                />
              ))}
          </>
        )}
      </nav>

      <SidebarFooter isCollapsed={isCollapsed} />
    </aside>
  );
};

export default Sidebar;
