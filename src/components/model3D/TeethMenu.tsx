"use client";

import React from "react";
import Menu, { MenuItem } from "@/components/Menu";

const TOOTH_MAPPING: Record<string, string> = {
    polySurface39052: "القاطع الجانبي",
    polySurface39053: "الناب",
    polySurface39054: "الضاحك الأول",
    polySurface39055: "الضاحك الثاني",
    polySurface39056: "الرحى الأولى",
    polySurface39057: "الرحى الثانية",
    polySurface39058: "الرحى الثالثة (العقل)",
    polySurface39059: "القاطع المركزي",
    polySurface39060: "القاطع الجانبي",
    polySurface39061: "الناب",
    polySurface39062: "الضاحك الأول",
    polySurface39063: "الضاحك الثاني",
    polySurface39064: "الرحى الأولى",
    polySurface39065: "الرحى الثانية",
    polySurface39066: "الرحى الثالثة (العقل)",
    polySurface39067: "القاطع المركزي",
    polySurface39068: "القاطع الجانبي",
    polySurface39069: "الناب",
    polySurface39070: "الضاحك الأول",
    polySurface39071: "الضاحك الثاني",
    polySurface39072: "الرحى الأولى",
    polySurface39073: "الرحى الثانية",
    polySurface39074: "الرحى الثالثة (العقل)",
    polySurface39075: "القاطع المركزي",
    polySurface39076: "القاطع الجانبي",
    polySurface39077: "الناب",
    polySurface39078: "الضاحك الأول",
    polySurface39079: "الضاحك الثاني",
    polySurface39080: "الرحى الأولى",
    polySurface39081: "الرحى الثانية",
    polySurface39082: "الرحى الثالثة (العقل)",
};

// Tooth Icon Component
const ToothIcon = ({ className }: { className?: string }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
    >
        <path d="M12 2c-1.5 0-2.5 1-3 2.5-.5 1.5-.5 3-.5 4.5 0 2-1 3-1 5s.5 4 1.5 5 2 1 3 1 2 0 3-1 1.5-3 1.5-5-.5-3-1-5c0-1.5 0-3-.5-4.5C14.5 3 13.5 2 12 2z" />
    </svg>
);

interface TeethMenuProps {
    hoveredTooth: string | null;
    setHoveredTooth: (tooth: string | null) => void;
    setSelectedTooth: (tooth: string | null) => void;
    selectedTooth?: string | null;
    className?: string;
}

const TeethMenu: React.FC<TeethMenuProps> = ({
    hoveredTooth,
    setHoveredTooth,
    setSelectedTooth,
    selectedTooth = null,
    className = "",
}) => {
    // Create sub-items for each tooth
    const teethSubItems: MenuItem[] = Object.keys(TOOTH_MAPPING).map((key) => ({
        name: TOOTH_MAPPING[key],
        icon: ({ className }: { className?: string }) => (
            <span
                className={`w-2 h-2 rounded-full bg-teal-500  block ${className}`}
            />
        ),
        onClick: () => setSelectedTooth(key),
        onHover: () => setHoveredTooth(key),
        onLeave: () => setHoveredTooth(null),
        isActive: selectedTooth === key,
        isHovered: hoveredTooth === key,
    }));

    // Main menu item with dropdown
    const menuItems: MenuItem[] = [
        {
            name: "الأسنان",
            icon: ToothIcon,
            subItems: teethSubItems,
        },
    ];

    return (
        <Menu
            items={menuItems}
            className={className}
            hideMainName={false}
            orientation="vertical"
            dropdownPosition="right"
        />
    );
};

export default TeethMenu;