"use client";

import React from "react";
import Menu, { MenuItem } from "@/components/Menu";

const TOOTH_MAPPING: Record<string, string> = {
    polySurface39052: "Lateral Incisor",
    polySurface39053: "Canine",
    polySurface39054: "First Premolar",
    polySurface39055: "Second Premolar",
    polySurface39056: "First Molar",
    polySurface39057: "Second Molar",
    polySurface39058: "Third Molar",
    polySurface39059: "Central Incisor",
    polySurface39060: "Lateral Incisor",
    polySurface39061: "Canine",
    polySurface39062: "First Premolar",
    polySurface39063: "Second Premolar",
    polySurface39064: "First Molar",
    polySurface39065: "Second Molar",
    polySurface39066: "Third Molar",
    polySurface39067: "Central Incisor",
    polySurface39068: "Lateral Incisor",
    polySurface39069: "Canine",
    polySurface39070: "First Premolar",
    polySurface39071: "Second Premolar",
    polySurface39072: "First Molar",
    polySurface39073: "Second Molar",
    polySurface39074: "Third Molar",
    polySurface39075: "Central Incisor",
    polySurface39076: "Lateral Incisor",
    polySurface39077: "Canine",
    polySurface39078: "First Premolar",
    polySurface39079: "Second Premolar",
    polySurface39080: "First Molar",
    polySurface39081: "Second Molar",
    polySurface39082: "Third Molar",
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
            name: "Teeth",
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