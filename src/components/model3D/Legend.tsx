import React from "react";

const Legend: React.FC = () => {
    const items = [
        { label: "سليم",          color: "bg-white border-gray-300" },
        { label: "تسوس",          color: "bg-red-300" },
        { label: "حشوة",          color: "bg-blue-300" },
        { label: "تاج",           color: "bg-yellow-300" },
        { label: "مفقود",         color: "bg-black" },
        { label: "تاج (مختبر)",   color: "bg-amber-500" },
        { label: "جسر (مختبر)",   color: "bg-amber-900" },
        { label: "قشرة (مختبر)",  color: "bg-purple-400" },
        { label: "زرعة (مختبر)",  color: "bg-slate-400" },
        { label: "طلب مختبر",     color: "bg-orange-400" },
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
