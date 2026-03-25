import React from "react";
import Link from "next/link";

interface SidebarItemProps {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isOpen: boolean;
  isActive: boolean;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  name,
  href,
  icon: Icon,
  isOpen,
  isActive,
  onClick,
}) => {
  const linkContent = (
    <Link
      href={href}
      className={`
        flex items-center gap-3 px-2 py-2.5 rounded-lg
        transition-colors duration-200 relative
        ${
          isActive
            ? "bg-teal-500 text-white shadow-lg shadow-teal-500/20"
            : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50"
        }
      `}
      onClick={onClick}
      aria-current={isActive ? "page" : undefined}
    >
      <Icon
        className={`
          w-5 h-5 flex-shrink-0 transition-transform duration-200
          ${isActive ? "scale-110" : "group-hover:scale-110"}
        `}
      />

      <span
        className={`
          transition-all duration-300 whitespace-nowrap
          ${
            isOpen
              ? "opacity-100 translate-x-0"
              : "opacity-0 w-0 overflow-hidden"
          }
        `}
      >
        {name}
      </span>
    </Link>
  );
  return isOpen && linkContent;
};

export default SidebarItem;
