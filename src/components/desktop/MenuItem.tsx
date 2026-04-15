'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

export interface MenuItemProps {
  id: string;
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  isCollapsed?: boolean;
}

const MenuItem = ({ id, label, href, icon, badge, isCollapsed }: MenuItemProps) => {
  const pathname = usePathname();
  // Exact path match only - prevents /doctor from matching all /doctor/* routes
  const isActive = pathname === href;

  return (
    <Link href={href}>
      <button
        className={`w-full flex items-center px-4 py-3 transition-all duration-200 relative group cursor-pointer ${
          isActive
            ? 'bg-secondary border-r-4 border-primary text-primary'
            : 'text-foreground hover:bg-secondary cursor-pointer'
        }`}
      >
        <span className="flex-shrink-0">{icon}</span>

        {!isCollapsed && (
          <>
            <span className="mr-3 flex-1 text-right font-medium">{label}</span>
            {badge && (
              <span className="ml-2 px-2 py-1 text-xs font-bold bg-destructive text-destructive-foreground rounded-full">
                {badge}
              </span>
            )}
          </>
        )}

        {/* Tooltip for collapsed state */}
        {isCollapsed && (
          <div className="absolute left-full ml-2 px-3 py-1 bg-foreground text-background text-sm rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 font-medium">
            {label}
          </div>
        )}
      </button>
    </Link>
  );
};

export default MenuItem;
