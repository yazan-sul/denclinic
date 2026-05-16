import React from "react";
import { AlertCircle } from "lucide-react";
import SurfaceSelector, { ToothSurface } from "./SurfaceSelector";

export type ToothStatus =
  | "HEALTHY" | "DECAYED" | "FILLED" | "CROWN" | "MISSING"
  | "LAB_CROWN" | "LAB_BRIDGE" | "LAB_VENEER" | "LAB_IMPLANT" | "LAB_PENDING";

export interface ToothRecordItem {
    id: number;
    status: ToothStatus;
    surfaces: ToothSurface[];
    notes: string | null;
    createdAt: string;
    doctorName?: string | null;
    appointmentId?: string | null;
}

export interface ToothAppointmentOption {
    id: string;
    appointmentDate: string;
    status: string;
}

export interface ToothLabOrder {
    id:         string;
    status:     string;
    labName:    string;
    workType:   string;
    orderDate:  string;
}

interface Props {
    selectedTooth: number | null;
    status: ToothStatus;
    surfaces: ToothSurface[];
    notes: string;
    history: ToothRecordItem[];
    isDirty: boolean;
    isSaving: boolean;
    appointmentId?: string | null;
    isFinalizing?: boolean;
    toothLabOrders?: ToothLabOrder[];
    onStatusChange: (status: ToothStatus) => void;
    onSurfacesChange: (surfaces: ToothSurface[]) => void;
    onNotesChange: (notes: string) => void;
    onSave: () => void;
    onFinalize?: () => void;
}

const LAB_STATUS_AR: Record<string, string> = {
    DRAFT:              'مسودة',
    SENT_TO_LAB:        'مُرسل للمختبر',
    UNDER_CONSTRUCTION: 'قيد التصنيع',
    DELAYED:            'متأخر',
    RECEIVED_AT_CLINIC: 'وصل للعيادة',
    COMPLETED_FITTED:   'مكتمل ومُركَّب',
    REJECTED:           'مرفوض',
    CANCELLED:          'ملغي',
};

const WORK_TYPE_AR: Record<string, string> = {
    SINGLE_CROWN:            'تاج',
    DENTAL_BRIDGE:           'جسر',
    VENEER_EMAX:             'قشرة / إيماكس',
    INLAY_ONLAY:             'حشوة مختبر',
    IMPLANT_CROWN:           'تاج زرعة',
    COMPLETE_DENTURE:        'طقم كامل',
    PARTIAL_ACRYLIC_DENTURE: 'طقم جزئي أكريل',
    CAST_PARTIAL_DENTURE:    'طقم كروم كوبلت',
    FLEXIBLE_DENTURE:        'طقم مرن',
    ORTHODONTIC_RETAINER:    'ريتينر',
    NIGHT_GUARD:             'جبيرة ليلية',
    CLEAR_ALIGNERS:          'تقويم شفاف',
    STUDY_MODEL:             'موديل دراسي',
};

const STATUS_LABELS: Record<ToothStatus, string> = {
    HEALTHY:     "سليم",
    DECAYED:     "تسوس",
    FILLED:      "حشوة",
    CROWN:       "تاج",
    MISSING:     "مفقود",
    LAB_CROWN:   "تاج — مختبر",
    LAB_BRIDGE:  "جسر — مختبر",
    LAB_VENEER:  "قشرة/إيماكس — مختبر",
    LAB_IMPLANT: "زرعة — مختبر",
    LAB_PENDING: "طلب مختبر",
};

const ToothDetails: React.FC<Props> = ({
    selectedTooth,
    status,
    surfaces,
    notes,
    history,
    isDirty,
    isSaving,
    appointmentId,
    isFinalizing,
    toothLabOrders = [],
    onStatusChange,
    onSurfacesChange,
    onNotesChange,
    onSave,
    onFinalize,
}) => {
    if (!selectedTooth) {
        return (
            <div className="p-6 text-center">
                <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground mt-2">اختر سناً لبدء التوثيق</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full" dir="rtl">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">الحالة</label>
                    <select
                        className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-colors border-border"
                        value={status}
                        onChange={(event) => onStatusChange(event.target.value as ToothStatus)}
                    >
                        {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                    {status.startsWith('LAB_') && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400">
                            ⓘ مُعيَّن من طلب المختبر — يُحفظ كـ"تاج" في السجل السريري
                        </p>
                    )}
                </div>

                {/* Lab orders for this tooth — read only */}
                {toothLabOrders.length > 0 && (
                    <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">طلبات المختبر لهذا السن</p>
                        {toothLabOrders.map(lo => {
                            const isDone = lo.status === 'COMPLETED_FITTED';
                            const isCancelled = lo.status === 'CANCELLED' || lo.status === 'REJECTED';
                            return (
                                <div key={lo.id} className={`rounded-lg border px-3 py-2 text-xs space-y-0.5 ${
                                    isDone      ? 'bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700' :
                                    isCancelled ? 'bg-secondary/30 border-border opacity-60' :
                                    'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700'
                                }`}>
                                    <div className="flex items-center justify-between gap-2">
                                        <span className="font-semibold">
                                            {WORK_TYPE_AR[lo.workType] ?? lo.workType}
                                        </span>
                                        <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${
                                            isDone      ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200' :
                                            isCancelled ? 'bg-secondary text-muted-foreground' :
                                            'bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200'
                                        }`}>
                                            {LAB_STATUS_AR[lo.status] ?? lo.status}
                                        </span>
                                    </div>
                                    <p className="text-muted-foreground">{lo.labName}</p>
                                </div>
                            );
                        })}
                    </div>
                )}

                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">الأسطح</label>
                    <SurfaceSelector value={surfaces} onChange={onSurfacesChange} />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">الملاحظات السريرية</label>
                    <textarea
                        className="w-full min-h-[110px] px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-colors border-border"
                        placeholder="أضف ملاحظاتك وحالات السن والخطة العلاجية..."
                        value={notes}
                        onChange={(event) => onNotesChange(event.target.value)}
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-muted-foreground">السجل</h4>
                        <span className="text-xs text-muted-foreground">{history.length} سجل</span>
                    </div>
                    {history.length === 0 ? (
                        <div className="text-xs text-muted-foreground">لا توجد سجلات لهذا السن</div>
                    ) : (
                        <div className="space-y-2">
                            {history.map((record) => (
                                <div key={record.id} className="rounded-lg border border-border p-3">
                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                        {record.doctorName && <span className="font-medium">{record.doctorName}</span>}
                                        <span dir="ltr">{new Date(record.createdAt).toLocaleString('ar')}</span>
                                    </div>
                                    <div className="mt-2 text-xs font-medium">{STATUS_LABELS[record.status] ?? record.status}</div>
                                    {record.surfaces.length > 0 && (
                                        <div className="mt-1 text-[11px] text-muted-foreground">
                                            الأسطح: {record.surfaces.join("، ")}
                                        </div>
                                    )}
                                    {record.notes && <div className="mt-2 text-xs text-muted-foreground">{record.notes}</div>}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="border-t border-border bg-card px-4 py-3">
                <div className="flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={onFinalize}
                        disabled={!appointmentId || !onFinalize || isFinalizing}
                        className="w-full py-2 rounded-lg border border-border text-sm font-semibold text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isFinalizing ? "جاري الإنهاء..." : "إنهاء الموعد"}
                    </button>
                    <button
                        type="button"
                        onClick={onSave}
                        disabled={!isDirty || isSaving}
                        className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? "جاري الحفظ..." : isDirty ? "حفظ التغييرات" : "لا تغييرات"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ToothDetails;