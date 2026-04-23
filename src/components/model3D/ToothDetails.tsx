import React from "react";
import { AlertCircle } from "lucide-react";

export interface Tooth {
    number: number;
    name: string;
    condition: "Healthy" | "Cavity" | "Filled" | "Crown" | "Missing";
    notes?: string;
}
interface Props {
    selectedTooth: number | null;
    teethData: Record<number, Tooth>;
}

const CONDITION_AR = {
    Healthy: 'سليم',
    Cavity:  'تسوس',
    Filled:  'حشوة',
    Crown:   'تاج',
    Missing: 'مفقود',
};

const getConditionColor = (cond: Tooth["condition"]) => {
    const map = {
        Healthy: "bg-green-100 text-green-800",
        Cavity:  "bg-red-100 text-red-800",
        Filled:  "bg-blue-100 text-blue-800",
        Crown:   "bg-yellow-100 text-yellow-800",
        Missing: "bg-gray-100 text-gray-800",
    };
    return map[cond];
};

const ToothDetails: React.FC<Props> = ({ selectedTooth, teethData }) => {
    console.log(selectedTooth);
    if (!selectedTooth)
        return (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6 text-center">
                <AlertCircle className="w-10 h-10 text-gray-400 mx-auto" />
                <p className="text-gray-500 mt-2">اضغط على سن لعرض التفاصيل</p>
            </div>
        );

    const tooth = teethData[selectedTooth];

    return (
        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="text-lg font-bold mb-3">السن #{selectedTooth}</h3>

            <p className="text-sm text-gray-600">الاسم</p>
            <p className="font-medium mb-3">{tooth.name}</p>

            <p className="text-sm text-gray-600">الحالة</p>
            <span className={`px-3 py-1 rounded-full ${getConditionColor(tooth.condition)}`}>
                {CONDITION_AR[tooth.condition] ?? tooth.condition}
            </span>

            {tooth.notes && (
                <div className="mt-3">
                    <p className="text-sm text-gray-600">ملاحظات</p>
                    <p className="text-sm mt-1">{tooth.notes}</p>
                </div>
            )}
        </div>
    );
};

export default ToothDetails;