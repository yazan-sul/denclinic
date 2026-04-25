'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, User, Phone, Calendar, Mail, Droplets, AlertCircle, FileText, FlaskConical } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LabCase {
  id: number;
  labName: string;
  caseType: string;
  status: string;
  cost: number | null;
  deliveryDate: string | null;
  notesPublic: string | null;
  createdAt: string;
}

interface Treatment {
  id: number;
  status: string;
  diagnosis: string | null;
  notesPublic: string | null;
  cost: number | null;
  createdAt: string;
  labCases: LabCase[];
}

interface Appointment {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  service: { name: string };
  doctor: { id: number; user: { name: string } };
  branch: { id: number; name: string };
  treatments: Treatment[];
}

interface Patient {
  id: number;
  dateOfBirth: string | null;
  gender: string | null;
  bloodType: string | null;
  allergies: string | null;
  medicalHistory: string | null;
  user: { id: number; name: string; phoneNumber: string; email: string | null };
  appointments: Appointment[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  let local: string;
  if (digits.startsWith('970') && digits.length === 12) local = digits.slice(3);
  else if (digits.startsWith('0') && digits.length === 10) local = digits.slice(1);
  else local = digits;
  if (local.length === 9) return `+970-${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6, 9)}`;
  return phone;
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

const APPT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'قيد الانتظار', CONFIRMED: 'مؤكد', COMPLETED: 'مكتمل',
  CANCELLED: 'ملغي', NO_SHOW: 'لم يحضر', IN_PROGRESS: 'جارٍ',
};
const APPT_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800', CONFIRMED: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800', CANCELLED: 'bg-red-100 text-red-800',
  NO_SHOW: 'bg-gray-100 text-gray-700', IN_PROGRESS: 'bg-purple-100 text-purple-800',
};

const TREAT_STATUS_LABELS: Record<string, string> = {
  PLANNED: 'مخطط', ONGOING: 'جارٍ', COMPLETED: 'مكتمل',
};
const TREAT_STATUS_COLORS: Record<string, string> = {
  PLANNED: 'bg-blue-100 text-blue-800',
  ONGOING: 'bg-yellow-100 text-yellow-800',
  COMPLETED: 'bg-green-100 text-green-800',
};

const LAB_STATUS_LABELS: Record<string, string> = {
  PENDING: 'قيد الانتظار', SENT: 'مُرسل', IN_PROGRESS: 'قيد التنفيذ',
  READY: 'جاهز', DELIVERED: 'تم التسليم', CANCELLED: 'ملغي',
};
const LAB_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700', SENT: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-purple-100 text-purple-800', READY: 'bg-green-100 text-green-800',
  DELIVERED: 'bg-teal-100 text-teal-800', CANCELLED: 'bg-red-100 text-red-800',
};

type Tab = 'appointments' | 'treatments' | 'labcases';

// ── Component ─────────────────────────────────────────────────────────────────

interface Props { patientId: string; onBack: () => void }

export default function PatientProfile({ patientId, onBack }: Props) {
  const [patient,   setPatient]   = useState<Patient | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('appointments');
  const [expandedAppt, setExpandedAppt] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetch(`/api/clinic/patients/${patientId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        if (!json.success) throw new Error(json.error?.message || 'تعذر تحميل بيانات المريض');
        setPatient(json.data);
      })
      .catch(err => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [patientId]);

  // ── Loading ───────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-4" dir="rtl">
        <div className="h-8 w-40 bg-secondary rounded animate-pulse" />
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          <div className="bg-card border border-border rounded-2xl p-6 h-80 animate-pulse" />
          <div className="xl:col-span-3 bg-card border border-border rounded-2xl h-80 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="space-y-4" dir="rtl">
        <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowRight className="w-4 h-4" /><span>العودة</span>
        </button>
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || 'لم يتم العثور على المريض'}
        </div>
      </div>
    );
  }

  // ── Derived data ──────────────────────────────────────────────────────────

  const allTreatments = patient.appointments.flatMap(a =>
    a.treatments.map(t => ({ ...t, appointment: a }))
  );
  const allLabCases = allTreatments.flatMap(t =>
    t.labCases.map(l => ({ ...l, treatment: t, appointment: t.appointment }))
  );

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'appointments', label: 'المواعيد',         count: patient.appointments.length },
    { key: 'treatments',   label: 'السجلات العلاجية', count: allTreatments.length },
    { key: 'labcases',     label: 'المختبر',          count: allLabCases.length },
  ];

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4" dir="rtl">

      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowRight className="w-4 h-4" /><span>العودة لقائمة المرضى</span>
      </button>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

        {/* ── Left: Patient Info Card ── */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            {/* Avatar + name */}
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                <User className="w-10 h-10 text-primary" />
              </div>
              <h3 className="font-bold text-xl">{patient.user.name}</h3>
              <p className="text-sm text-muted-foreground">رقم الملف: #{patient.id}</p>
              {patient.gender && (
                <span className="mt-1 text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  {patient.gender === 'male' ? 'ذكر' : patient.gender === 'female' ? 'أنثى' : 'آخر'}
                </span>
              )}
            </div>

            <div className="space-y-3">
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
          </div>

          {/* Summary stats */}
          <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
            <h4 className="text-sm font-semibold mb-3">ملخص</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">إجمالي المواعيد</span>
                <span className="font-semibold">{patient.appointments.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">مكتمل</span>
                <span className="font-semibold text-green-600">
                  {patient.appointments.filter(a => a.status === 'COMPLETED').length}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">إجمالي السجلات</span>
                <span className="font-semibold">{allTreatments.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">حالات مختبر</span>
                <span className="font-semibold">{allLabCases.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right: Tabs ── */}
        <div className="xl:col-span-3 space-y-4">

          {/* Tab bar */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex border-b border-border">
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2
                    ${activeTab === tab.key
                      ? 'text-primary border-b-2 border-primary bg-primary/5'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                    }`}
                >
                  {tab.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-mono
                    ${activeTab === tab.key ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>

            <div className="p-4">

              {/* ── Appointments tab ── */}
              {activeTab === 'appointments' && (
                <div className="space-y-3">
                  {patient.appointments.length === 0 ? (
                    <p className="text-center py-10 text-muted-foreground text-sm">لا توجد مواعيد</p>
                  ) : patient.appointments.map(appt => (
                    <div key={appt.id} className="border border-border rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedAppt(expandedAppt === appt.id ? null : appt.id)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/20 transition-colors text-right"
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-medium text-sm">{appt.service.name}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {formatDate(appt.appointmentDate)} — {appt.appointmentTime} — {appt.branch.name}
                            </p>
                            <p className="text-xs text-muted-foreground">د. {appt.doctor.user.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs px-2 py-1 rounded-full ${APPT_STATUS_COLORS[appt.status] || 'bg-gray-100 text-gray-700'}`}>
                            {APPT_STATUS_LABELS[appt.status] || appt.status}
                          </span>
                          <span className="text-muted-foreground text-xs">{expandedAppt === appt.id ? '▲' : '▼'}</span>
                        </div>
                      </button>

                      {expandedAppt === appt.id && (
                        <div className="border-t border-border bg-secondary/10 px-4 py-3 space-y-3">
                          {appt.treatments.length === 0 ? (
                            <p className="text-xs text-muted-foreground">لا توجد سجلات علاجية لهذا الموعد</p>
                          ) : appt.treatments.map(t => (
                            <div key={t.id} className="bg-card border border-border rounded-lg p-3 space-y-1">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-medium">{t.diagnosis || 'سجل علاجي'}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${TREAT_STATUS_COLORS[t.status]}`}>
                                  {TREAT_STATUS_LABELS[t.status]}
                                </span>
                              </div>
                              {t.notesPublic && <p className="text-xs text-muted-foreground">{t.notesPublic}</p>}
                              {t.cost != null && (
                                <p className="text-xs font-mono text-foreground">{t.cost} ₪</p>
                              )}
                              {t.labCases.length > 0 && (
                                <div className="mt-2 pt-2 border-t border-border/50 space-y-1">
                                  <p className="text-[10px] text-muted-foreground font-medium">حالات المختبر</p>
                                  {t.labCases.map(l => (
                                    <div key={l.id} className="flex items-center justify-between text-xs">
                                      <span>{l.labName} — {l.caseType}</span>
                                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${LAB_STATUS_COLORS[l.status]}`}>
                                        {LAB_STATUS_LABELS[l.status]}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* ── Treatments tab ── */}
              {activeTab === 'treatments' && (
                <div className="space-y-3">
                  {allTreatments.length === 0 ? (
                    <p className="text-center py-10 text-muted-foreground text-sm">لا توجد سجلات علاجية</p>
                  ) : allTreatments.map(t => (
                    <div key={t.id} className="bg-card border border-border rounded-xl p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{t.diagnosis || 'سجل علاجي'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDate(t.appointment.appointmentDate)} — {t.appointment.service.name}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${TREAT_STATUS_COLORS[t.status]}`}>
                          {TREAT_STATUS_LABELS[t.status]}
                        </span>
                      </div>
                      {t.notesPublic && (
                        <p className="text-xs text-muted-foreground border-t border-border/50 pt-2">{t.notesPublic}</p>
                      )}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-muted-foreground">
                          {t.labCases.length > 0 ? `${t.labCases.length} حالة مختبر` : ''}
                        </span>
                        {t.cost != null && (
                          <span className="font-mono font-semibold">{t.cost} ₪</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Lab Cases tab ── */}
              {activeTab === 'labcases' && (
                <div className="space-y-3">
                  {allLabCases.length === 0 ? (
                    <p className="text-center py-10 text-muted-foreground text-sm">لا توجد حالات مختبر</p>
                  ) : allLabCases.map(l => (
                    <div key={l.id} className="bg-card border border-border rounded-xl p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{l.labName}</p>
                          <p className="text-xs text-muted-foreground">{l.caseType}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatDate(l.appointment.appointmentDate)} — {l.appointment.service.name}
                          </p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full shrink-0 ${LAB_STATUS_COLORS[l.status]}`}>
                          {LAB_STATUS_LABELS[l.status]}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-xs">
                        <span className="text-muted-foreground">
                          {l.deliveryDate ? `موعد التسليم: ${formatDate(l.deliveryDate)}` : ''}
                        </span>
                        {l.cost != null && (
                          <span className="font-mono font-semibold">{l.cost} ₪</span>
                        )}
                      </div>
                      {l.notesPublic && (
                        <p className="text-xs text-muted-foreground mt-1">{l.notesPublic}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}