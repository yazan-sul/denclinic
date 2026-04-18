'use client';

import { usePathname } from 'next/navigation';
import MenuItem from '@/components/desktop/MenuItem';
import SidebarHeader from '@/components/desktop/SidebarHeader';
import SidebarFooter from '@/components/desktop/SidebarFooter';
import { staffMenuItems } from '@/config/staffMenuItems';
import { getIcon } from '@/config/iconMap';

interface StaffSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function StaffSidebar({ isCollapsed, onToggleCollapse }: StaffSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={`h-full bg-card border-l border-border transition-all duration-300 flex flex-col shadow-sm ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}
    >
      <SidebarHeader isCollapsed={isCollapsed} onToggleCollapse={onToggleCollapse} />

      <nav className="flex-1 overflow-y-auto py-2">
        {staffMenuItems.map((item) => (
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
      </nav>

      <SidebarFooter isCollapsed={isCollapsed} />
    </aside>
  );
}
