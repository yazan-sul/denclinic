"use client";

import React, { useState } from "react";

export interface MenuItem {
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick?: () => void;
    onHover?: () => void;
    onLeave?: () => void;
    href?: string;
    subItems?: MenuItem[];
    isActive?: boolean;
    isHovered?: boolean;
}

interface MenuProps {
    items: MenuItem[];
    className?: string;
    hideMainName?: boolean;
    orientation?: "vertical" | "horizontal";
    dropdownPosition?: "right" | "left" | "bottom";
}

const Menu: React.FC<MenuProps> = ({
    items,
    className = "",
    hideMainName = false,
    orientation = "vertical",
    dropdownPosition = "right",
}) => {
    const [openIndex, setOpenIndex] = useState<number | null>(null);

    const toggleDropdown = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    const getDropdownPositionClasses = () => {
        switch (dropdownPosition) {
            case "left":
                return "left-0";
            case "bottom":
                return "top-full left-0 mt-2";
            case "right":
            default:
                return "right-0 mt-2";
        }
    };

    const containerClasses =
        orientation === "horizontal"
            ? "flex flex-row gap-2"
            : "flex flex-col gap-1";

    return (
        <div className={`relative ${containerClasses} ${className}`}>
            {items.map((item, index) => {
                const Icon = item.icon;
                const hasDropdown = item.subItems && item.subItems.length > 0;
                const isActive = item.isActive;
                const isHovered = item.isHovered;

                return (
                    <div key={index} className="relative">
                        {/* MAIN BUTTON */}
                        <button
                            onClick={() =>
                                hasDropdown ? toggleDropdown(index) : item.onClick?.()
                            }
                            onMouseEnter={() => item.onHover?.()}
                            onMouseLeave={() => item.onLeave?.()}
                            className={`
                flex items-center border border-gray-200  gap-2 px-3 py-2 rounded-lg 
                transition-colors w-full
                ${isActive
                                    ? "bg-green-100 dark:bg-green-900"
                                    : isHovered
                                        ? "bg-blue-100 dark:bg-blue-900"
                                        : "hover:bg-gray-50 dark:hover:bg-gray-700"
                                }
              `}
                        >
                            <Icon
                                className={`
                  w-5 h-5
                  ${isActive
                                        ? "text-green-600 dark:text-green-300"
                                        : isHovered
                                            ? "text-blue-600 dark:text-blue-300"
                                            : "text-gray-600 dark:text-gray-300"
                                    }
                `}
                            />
                            {!hideMainName && !hasDropdown && (
                                <span className="text-sm font-medium text-gray-800 dark:text-gray-300">
                                    {item.name}
                                </span>
                            )}
                        </button>

                        {/* DROPDOWN */}
                        {hasDropdown && openIndex === index && (
                            <div
                                className={`
                  absolute ${getDropdownPositionClasses()}
                  w-48 bg-white dark:bg-gray-800 
                  border border-gray-200 dark:border-gray-700 
                  rounded-lg shadow-lg z-50
                  max-h-96 overflow-y-auto
                `}
                            >
                                {item.subItems!.map((subItem, subIndex) => {
                                    const SubIcon = subItem.icon;
                                    const isSubActive = subItem.isActive;
                                    const isSubHovered = subItem.isHovered;

                                    return (
                                        <button
                                            key={subIndex}
                                            onClick={() => {
                                                subItem.onClick?.();
                                                setOpenIndex(null);
                                            }}
                                            onMouseEnter={() => subItem.onHover?.()}
                                            onMouseLeave={() => subItem.onLeave?.()}
                                            className={`
                        flex items-center gap-2 w-full px-3 py-2 
                        text-left transition-colors
                        ${isSubActive
                                                    ? "bg-green-100 dark:bg-green-900"
                                                    : isSubHovered
                                                        ? "bg-blue-100 dark:bg-blue-900"
                                                        : "hover:bg-gray-100 dark:hover:bg-gray-700"
                                                }
                      `}
                                        >
                                            <SubIcon
                                                className={`
                          w-4 h-4
                          ${isSubActive
                                                        ? "text-green-600 dark:text-green-300"
                                                        : isSubHovered
                                                            ? "text-blue-600 dark:text-blue-300"
                                                            : "text-gray-600 dark:text-gray-300"
                                                    }
                        `}
                                            />
                                            <span className="text-sm text-gray-800 dark:text-gray-300">
                                                {subItem.name}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

export default Menu;