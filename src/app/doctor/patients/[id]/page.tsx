'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import DoctorLayout from '@/components/layouts/DoctorLayout';
import { formatPhone } from '@/lib/format';
import TeethContainer from '@/components/model3D/TeethContainer';
import ToothDetails, { ToothRecordItem, ToothStatus } from '@/components/model3D/ToothDetails';
import Legend from '@/components/model3D/Legend';
import SideSheet from '@/components/ui/SideSheet';
import Modal from '@/components/ui/Modal';
import { getToothNumberFromMesh, TOOTH_MESH_TO_NAME } from '@/components/model3D/toothMapping';
import { ArrowRight, User, Phone, Calendar, Mail, Droplets, AlertCircle, FileText } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Patient {
  id: number;
  dateOfBirth: string | null;
  gender: string | null;
  bloodType: string | null;
  allergies: string | null;
  medicalHistory: string | null;
  user: { id: number; name: string; phoneNumber: string; email: string | null };
  appointments: {
    id: string;
    appointmentDate: string;
    status: string;
  }[];
}


function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
}

function calcAge(dob: string | null): string {
  if (!dob) return '';
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
  return `${age} سنة`;
}

function getLatestActiveAppointmentId(
  appointments: Array<{ id: string; appointmentDate: string; status: string }>
): string | null {
  const activeStatuses = new Set(['IN_PROGRESS', 'CONFIRMED', 'PENDING']);
  const activeAppointments = appointments.filter((appointment) => activeStatuses.has(appointment.status));
  if (activeAppointments.length === 0) return null;

  const sorted = [...activeAppointments].sort((a, b) => {
    const left = new Date(a.appointmentDate).getTime();
    const right = new Date(b.appointmentDate).getTime();
    return right - left;
  });

  return sorted[0]?.id ?? null;
}

const DEFAULT_STATUS: ToothStatus = 'HEALTHY';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PatientProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [patient,         setPatient]         = useState<Patient | null>(null);
  const [isLoading,       setIsLoading]       = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [selectedToothId, setSelectedToothId] = useState<number | null>(null);
  const [selectedMeshName, setSelectedMeshName] = useState<string | null>(null);
  const [toothStatuses, setToothStatuses] = useState<Record<number, ToothStatus | null>>({});
  const [history, setHistory] = useState<ToothRecordItem[]>([]);
  const [formStatus, setFormStatus] = useState<ToothStatus>(DEFAULT_STATUS);
  const [formSurfaces, setFormSurfaces] = useState<Array<'MESIAL' | 'DISTAL' | 'OCCLUSAL' | 'BUCCAL' | 'LINGUAL'>>([]);
  const [formNotes, setFormNotes] = useState('');
  const [formAppointmentId, setFormAppointmentId] = useState<string | null>(null);
  const [initialForm, setInitialForm] = useState({
    status: DEFAULT_STATUS as ToothStatus,
    surfaces: [] as Array<'MESIAL' | 'DISTAL' | 'OCCLUSAL' | 'BUCCAL' | 'LINGUAL'>,
    notes: '',
    appointmentId: null as string | null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingToothId, setPendingToothId] = useState<number | null>(null);

  const isDirty = useMemo(() => {
    if (!selectedToothId) return false;
    if (formStatus !== initialForm.status) return true;
    if (formNotes !== initialForm.notes) return true;
    if (formAppointmentId !== initialForm.appointmentId) return true;
    if (formSurfaces.length !== initialForm.surfaces.length) return true;
    const left = [...formSurfaces].sort().join('|');
    const right = [...initialForm.surfaces].sort().join('|');
    return left !== right;
  }, [formNotes, formStatus, formSurfaces, initialForm, selectedToothId]);

  useEffect(() => {
    if (!id) return;
    setIsLoading(true);
    Promise.all([
      fetch(`/api/clinic/patients/${id}`, { credentials: 'include' }).then(r => r.json()),
      fetch(`/api/clinic/patients/${id}/teeth`, { credentials: 'include' }).then(r => r.json()),
    ])
      .then(([patientJson, teethJson]) => {
        if (!patientJson.success) throw new Error(patientJson.error?.message || 'تعذر تحميل بيانات المريض');
        if (!teethJson.success) throw new Error(teethJson.error?.message || 'تعذر تحميل بيانات الأسنان');
        setPatient(patientJson.data);

        const fallbackAppointmentId = getLatestActiveAppointmentId(patientJson.data.appointments ?? []);
        if (fallbackAppointmentId) {
          setFormAppointmentId((prev) => prev ?? fallbackAppointmentId);
        }

        const statusMap: Record<number, ToothStatus | null> = {};
        teethJson.data.forEach((entry: { toothNumber: number; latest: ToothRecordItem | null }) => {
          statusMap[entry.toothNumber] = entry.latest?.status ?? null;
        });
        setToothStatuses(statusMap);
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    if (!id || !selectedToothId) return;
    fetch(`/api/clinic/patients/${id}/teeth?toothNumber=${selectedToothId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        if (!json.success) throw new Error(json.error?.message || 'تعذر تحميل بيانات السن');
        const toRecord = (record: any): ToothRecordItem => ({
          id: record.id,
          status: record.status,
          surfaces: record.surfaces ?? [],
          notes: record.notes ?? null,
          createdAt: record.createdAt,
          doctorName: record.doctor?.user?.name ?? null,
          appointmentId: record.appointmentId ?? null,
        });

        const latest = json.data.latest ? toRecord(json.data.latest) : null;
        const nextStatus = (latest?.status ?? DEFAULT_STATUS) as ToothStatus;
        const nextSurfaces = (latest?.surfaces ?? []) as Array<'MESIAL' | 'DISTAL' | 'OCCLUSAL' | 'BUCCAL' | 'LINGUAL'>;
        const nextNotes = latest?.notes ?? '';
        const nextAppointmentId = latest?.appointmentId ?? null;

        setHistory((json.data.history ?? []).map(toRecord));
        setFormStatus(nextStatus);
        setFormSurfaces(nextSurfaces);
        setFormNotes(nextNotes);
        setFormAppointmentId(nextAppointmentId);
        setInitialForm({
          status: nextStatus,
          surfaces: nextSurfaces,
          notes: nextNotes,
          appointmentId: nextAppointmentId,
        });
      })
      .catch(err => setError(err.message));
  }, [id, selectedToothId]);

  useEffect(() => {
    const appointmentIdParam = searchParams.get('appointmentId');
    if (appointmentIdParam && appointmentIdParam !== formAppointmentId) {
      setFormAppointmentId(appointmentIdParam);
    }
  }, [formAppointmentId, searchParams]);

  const requestToothChange = (nextToothId: number | null) => {
    if (isDirty) {
      setPendingToothId(nextToothId);
      setShowConfirm(true);
      return;
    }
    setSelectedToothId(nextToothId);
    if (nextToothId === null) setSelectedMeshName(null);
  };

  const handleToothSelect = (name: string | null) => {
    if (!name) {
      requestToothChange(null);
      return;
    }
    const toothNumber = getToothNumberFromMesh(name);
    if (!toothNumber) return;
    setSelectedMeshName(name);
    requestToothChange(toothNumber);
  };

  const handleSave = async () => {
    if (!id || !selectedToothId || !isDirty) return;
    const effectiveAppointmentId =
      formAppointmentId ?? getLatestActiveAppointmentId(patient?.appointments ?? []);
    if (!effectiveAppointmentId) {
      setError('معرف الموعد غير متوفر');
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch(`/api/clinic/patients/${id}/teeth`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toothNumber: selectedToothId,
          status: formStatus,
          surfaces: formSurfaces,
          notes: formNotes || null,
          appointmentId: effectiveAppointmentId,
        }),
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message || 'تعذر حفظ بيانات السن');

      const newRecord = {
        id: json.data.id,
        status: json.data.status,
        surfaces: json.data.surfaces ?? [],
        notes: json.data.notes ?? null,
        createdAt: json.data.createdAt,
        doctorName: json.data.doctor?.user?.name ?? null,
        appointmentId: json.data.appointmentId ?? null,
      } as ToothRecordItem;

      setHistory((prev) => [newRecord, ...prev]);
      setToothStatuses((prev) => ({ ...prev, [selectedToothId]: newRecord.status }));
      setInitialForm({
        status: formStatus,
        surfaces: formSurfaces,
        notes: formNotes,
        appointmentId: formAppointmentId,
      });
      setSelectedToothId(null);
      setSelectedMeshName(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'تعذر حفظ بيانات السن';
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFinalize = async () => {
    const effectiveAppointmentId =
      formAppointmentId ?? getLatestActiveAppointmentId(patient?.appointments ?? []);
    if (!effectiveAppointmentId) {
      setError('معرف الموعد غير متوفر');
      return;
    }
    setIsFinalizing(true);
    try {
      const response = await fetch(`/api/clinic/records/${effectiveAppointmentId}/finalize`, {
        method: 'POST',
        credentials: 'include',
      });
      const json = await response.json();
      if (!json.success) throw new Error(json.error?.message || 'تعذر إنهاء الموعد');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'تعذر إنهاء الموعد';
      setError(message);
    } finally {
      setIsFinalizing(false);
    }
  };

  return (
    <DoctorLayout title="ملف المريض" subtitle="عرض سجلات المريض والخطة العلاجية">
      <div dir="rtl" className="h-[calc(100vh-140px)] overflow-hidden">

       
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        <div className="flex flex-row gap-6 h-full">
       

          {/* 3D Teeth Model (center) */}
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col h-full flex-1">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/5">
              <h3 className="font-bold">المخطط السني ثلاثي الأبعاد</h3>
              <div className="flex items-center gap-4">
             
                <Legend />
              </div>
            </div>

            <div className="flex-1 relative bg-secondary/10">
              <TeethContainer
                onToothSelect={handleToothSelect}
                externalSelectedTooth={selectedMeshName}
                toothStatuses={toothStatuses}
              />
            </div>

          </div>
             {/* Patient info card (left) */}
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm h-full overflow-hidden xl:w-[320px]">
            {isLoading ? (
              <div className="space-y-3 animate-pulse">
                <div className="w-20 h-20 bg-secondary rounded-full mx-auto" />
                <div className="h-5 bg-secondary rounded w-3/4 mx-auto" />
                <div className="h-3 bg-secondary rounded w-1/2 mx-auto" />
                <div className="space-y-2 pt-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-8 bg-secondary rounded" />
                  ))}
                </div>
              </div>
            ) : patient ? (
              <>
                {/* Avatar + name */}
                <div className="flex flex-col items-center text-center mb-6">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                    <User className="w-10 h-10 text-primary" />
                  </div>
                  <h3 className="font-bold text-xl">{patient.user.name}</h3>
                 
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Phone */}
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                      <p className="font-medium font-mono" dir="ltr">{formatPhone(patient.user.phoneNumber)}</p>
                    </div>
                  </div>

                  {/* Email */}
                  {patient.user.email && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                        <p className="font-medium truncate">{patient.user.email}</p>
                      </div>
                    </div>
                  )}

                  {/* DOB */}
                  {patient.dateOfBirth && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">تاريخ الميلاد</p>
                        <p className="font-medium">{formatDate(patient.dateOfBirth)}</p>
                        <p className="text-xs text-muted-foreground">{calcAge(patient.dateOfBirth)}</p>
                      </div>
                    </div>
                  )}

                  {/* Blood type */}
                  {patient.bloodType && (
                    <div className="flex items-center gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                        <Droplets className="w-4 h-4 text-red-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">فصيلة الدم</p>
                        <p className="font-medium font-mono">{patient.bloodType}</p>
                      </div>
                    </div>
                  )}

                  {/* Allergies */}
                  {patient.allergies && (
                    <div className="flex items-start gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <AlertCircle className="w-4 h-4 text-orange-400" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">الحساسية</p>
                        <p className="font-medium text-orange-700">{patient.allergies}</p>
                      </div>
                    </div>
                  )}

                  {/* Medical history */}
                  {patient.medicalHistory && (
                    <div className="flex items-start gap-3 text-sm">
                      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-0.5">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">التاريخ الطبي</p>
                        <p className="font-medium whitespace-pre-wrap text-xs leading-relaxed">{patient.medicalHistory}</p>
                      </div>
                    </div>
                  )}
                </div>

              </>
            ) : null}
          </div>
        </div>
      </div>
      <SideSheet
        isOpen={selectedToothId !== null}
        onOpenChange={(open) => {
          if (!open) requestToothChange(null);
        }}
        side="left"
        title={selectedToothId ? (TOOTH_MESH_TO_NAME[String(selectedToothId)] ?? `Tooth ${selectedToothId}`) : 'Tooth details'}
      >
        <ToothDetails
          selectedTooth={selectedToothId}
          status={formStatus}
          surfaces={formSurfaces}
          notes={formNotes}
          history={history}
          isDirty={isDirty}
          isSaving={isSaving}
          appointmentId={formAppointmentId ?? getLatestActiveAppointmentId(patient?.appointments ?? [])}
          isFinalizing={isFinalizing}
          onStatusChange={setFormStatus}
          onSurfacesChange={setFormSurfaces}
          onNotesChange={setFormNotes}
          onSave={handleSave}
          onFinalize={handleFinalize}
        />
      </SideSheet>

      <Modal
        isOpen={showConfirm}
        onClose={() => {
          setShowConfirm(false);
          setPendingToothId(null);
        }}
        title="Unsaved changes"
        subtitle="You have unsaved changes. Discard them?"
        actions={
          <>
            <button
              className="px-4 py-2 rounded-lg border border-border"
              onClick={() => {
                setShowConfirm(false);
                setPendingToothId(null);
              }}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground"
              onClick={() => {
                setShowConfirm(false);
                setSelectedToothId(pendingToothId);
                if (pendingToothId === null) setSelectedMeshName(null);
                setPendingToothId(null);
              }}
            >
              Discard changes
            </button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Your current edits will be lost if you continue.
        </p>
      </Modal>
    </DoctorLayout>
  );
}