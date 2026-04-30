// TeethContainer.tsx
import React, { useState, useEffect } from "react";

import EnhancedTeethViewer from "./DentalChart";
import TeethMenu from "./TeethMenu";

interface TeethContainerProps {
    onToothSelect?: (toothName: string | null) => void;
    onToothHover?: (toothName: string | null) => void;
    externalSelectedTooth?: string | null;
}

export default function TeethContainer({ 
    onToothSelect, 
    onToothHover,
    externalSelectedTooth 
}: TeethContainerProps = {}) {
    const [hoveredTooth, setHoveredTooth] = useState<string | null>(null);
    const [selectedTooth, setSelectedTooth] = useState<string | null>(externalSelectedTooth || null);

    // Sync externalSelectedTooth if it changes from outside
    useEffect(() => {
        if (externalSelectedTooth !== undefined) {
            setSelectedTooth(externalSelectedTooth);
        }
    }, [externalSelectedTooth]);

    const handleSelect = (name: string | null) => {
        setSelectedTooth(name);
        onToothSelect?.(name);
    };

    const handleHover = (name: string | null) => {
        setHoveredTooth(name);
        onToothHover?.(name);
    };

    return (
        <div className="flex w-full h-full bg-gray-50 dark:bg-gray-500 dark:text-white rounded-2xl shadow-lg p-2">
            <div className="hidden md:block">
                <TeethMenu
                    hoveredTooth={hoveredTooth}
                    setHoveredTooth={handleHover}
                    setSelectedTooth={handleSelect}
                    selectedTooth={selectedTooth}
                />
            </div>
            <div className="flex p-2 flex-1 min-w-0">
                <EnhancedTeethViewer
                    externalHoveredTooth={hoveredTooth}
                    externalSelectedTooth={selectedTooth}
                    onToothClick={(tooth) => handleSelect(tooth.name)}
                    onToothHover={(tooth) => handleHover(tooth?.name || null)}
                />
            </div>
        </div>
    );
}