import React from "react";

const Legend: React.FC = () => {
    const items = [
        { label: "Healthy", color: "bg-white" },
        { label: "Cavity", color: "bg-red-100" },
        { label: "Filled", color: "bg-blue-100" },
        { label: "Crown", color: "bg-yellow-100" },
        { label: "Missing", color: "bg-gray-100" },
    ];

    return (
        <div className="flex flex-wrap justify-center gap-4 mt-6">
            {items.map((i) => (
                <div key={i.label} className="flex items-center gap-2">
                    <div
                        className={`w-4 h-4 rounded border-2 border-gray-300 ${i.color}`}
                    />
                    <span className="text-sm">{i.label}</span>
                </div>
            ))}
        </div>
    );
};

export default Legend;
