"use client";

import React from "react";
import Menu, { MenuItem } from "@/components/Menu";

const TOOTH_MAPPING: Record<string, string> = {
    "11": "القاطع المركزي 11",
    "12": "القاطع الجانبي 12",
    "13": "الناب 13",
    "14": "الضاحك الأول 14",
    "15": "الضاحك الثاني 15",
    "16": "الرحى الأولى 16",
    "17": "الرحى الثانية 17",
    "18": "الرحى الثالثة (العقل) 18",
    "21": "القاطع المركزي 21",
    "22": "القاطع الجانبي 22",
    "23": "الناب 23",
    "24": "الضاحك الأول 24",
    "25": "الضاحك الثاني 25",
    "26": "الرحى الأولى 26",
    "27": "الرحى الثانية 27",
    "28": "الرحى الثالثة (العقل) 28",
    "31": "القاطع المركزي 31",
    "32": "القاطع الجانبي 32",
    "33": "الناب 33",
    "34": "الضاحك الأول 34",
    "35": "الضاحك الثاني 35",
    "36": "الرحى الأولى 36",
    "37": "الرحى الثانية 37",
    "38": "الرحى الثالثة (العقل) 38",
    "41": "القاطع المركزي 41",
    "42": "القاطع الجانبي 42",
    "43": "الناب 43",
    "44": "الضاحك الأول 44",
    "45": "الضاحك الثاني 45",
    "46": "الرحى الأولى 46",
    "47": "الرحى الثانية 47",
    "48": "الرحى الثالثة (العقل) 48",
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