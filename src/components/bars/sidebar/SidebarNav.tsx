import React from "react";
import SidebarItem from "./SidebarItem";
interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarNavProps {
  items: NavItem[];
  isOpen: boolean;
  pathname: string;
  onItemClick?: () => void;
}

const SidebarNav: React.FC<SidebarNavProps> = ({
  items,
  isOpen,
  pathname,
  onItemClick,
}) => {
  const isActive = (href: string) => pathname.startsWith(href);

  return (
    <nav className="flex-1 p-4 overflow-y">
      <ul className="space-y-1">
        {items.map((item) => (
          <SidebarItem
            key={item.href}
            name={item.name}
            href={item.href}
            icon={item.icon}
            isOpen={isOpen}
            isActive={isActive(item.href)}
            onClick={onItemClick}
          />
        ))}
      </ul>
    </nav>
  );
};

export default SidebarNav;
