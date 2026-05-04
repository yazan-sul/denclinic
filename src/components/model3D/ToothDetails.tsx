import React from "react";
import { AlertCircle } from "lucide-react";
import SurfaceSelector, { ToothSurface } from "./SurfaceSelector";

export type ToothStatus = "HEALTHY" | "DECAYED" | "FILLED" | "CROWN" | "MISSING";

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

interface Props {
    selectedTooth: number | null;
    status: ToothStatus;
    surfaces: ToothSurface[];
    notes: string;
    history: ToothRecordItem[];
    appointmentId: string | null;
    appointments: ToothAppointmentOption[];
    isDirty: boolean;
    isSaving: boolean;
    onStatusChange: (status: ToothStatus) => void;
    onSurfacesChange: (surfaces: ToothSurface[]) => void;
    onNotesChange: (notes: string) => void;
    onAppointmentChange: (appointmentId: string | null) => void;
    onSave: () => void;
}

const STATUS_LABELS: Record<ToothStatus, string> = {
    HEALTHY: "Healthy",
    DECAYED: "Decayed",
    FILLED: "Filled",
    CROWN: "Crown",
    MISSING: "Missing",
};

const ToothDetails: React.FC<Props> = ({
    selectedTooth,
    status,
    surfaces,
    notes,
    history,
    appointmentId,
    appointments,
    isDirty,
    isSaving,
    onStatusChange,
    onSurfacesChange,
    onNotesChange,
    onAppointmentChange,
    onSave,
}) => {
    if (!selectedTooth) {
        return (
            <div className="p-6 text-center">
                <AlertCircle className="w-10 h-10 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground mt-2">Select a tooth to start documentation.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Status</label>
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
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Surfaces</label>
                    <SurfaceSelector value={surfaces} onChange={onSurfacesChange} />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Clinical notes</label>
                    <textarea
                        className="w-full min-h-[110px] px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-colors border-border"
                        placeholder="Add observations, findings, or treatment plan."
                        value={notes}
                        onChange={(event) => onNotesChange(event.target.value)}
                    />
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Link to appointment</label>
                    <select
                        className="w-full px-3 py-2 text-sm border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary transition-colors border-border"
                        value={appointmentId ?? ''}
                        onChange={(event) => onAppointmentChange(event.target.value || null)}
                    >
                        <option value="">No appointment</option>
                        {appointments.map((appointment) => (
                            <option key={appointment.id} value={appointment.id}>
                                {new Date(appointment.appointmentDate).toLocaleDateString()} - {appointment.status}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-semibold text-muted-foreground">History</h4>
                        <span className="text-xs text-muted-foreground">{history.length} entries</span>
                    </div>
                    {history.length === 0 ? (
                        <div className="text-xs text-muted-foreground">No records yet for this tooth.</div>
                    ) : (
                        <div className="space-y-2">
                            {history.map((record) => (
                                <div key={record.id} className="rounded-lg border border-border p-3">
                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                        <span>{new Date(record.createdAt).toLocaleString()}</span>
                                        {record.doctorName && <span>{record.doctorName}</span>}
                                    </div>
                                    <div className="mt-2 text-xs font-medium">{STATUS_LABELS[record.status]}</div>
                                    {record.surfaces.length > 0 && (
                                        <div className="mt-1 text-[11px] text-muted-foreground">
                                            Surfaces: {record.surfaces.join(", ")}
                                        </div>
                                    )}
                                    {record.appointmentId && (
                                        <div className="mt-1 text-[11px] text-muted-foreground">
                                            Linked appointment: {record.appointmentId}
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
                <button
                    type="button"
                    onClick={onSave}
                    disabled={!isDirty || isSaving}
                    className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSaving ? "Saving..." : isDirty ? "Save changes" : "No changes"}
                </button>
            </div>
        </div>
    );
};

export default ToothDetails;