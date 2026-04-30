'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import PatientLayout from '@/components/layouts/PatientLayout';

const RELATIONSHIP_LABELS: Record<string, string> = {
  PARENT: 'والد/والدة', SPOUSE: 'زوج/زوجة', SIBLING: 'أخ/أخت',
  CHILD: 'ابن/ابنة', GRANDPARENT: 'جد/جدة', OTHER: 'أخرى',
};

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  COMPLETED: { label: 'مكتمل', cls: 'bg-green-500/20 text-green-700' },
  CONFIRMED: { label: 'مؤكد', cls: 'bg-blue-500/20 text-blue-700' },
  PENDING: { label: 'قيد الانتظار', cls: 'bg-yellow-400/20 text-yellow-700' },
  CANCELLED: { label: 'ملغى', cls: 'bg-destructive/20 text-destructive' },
  NO_SHOW: { label: 'لم يحضر', cls: 'bg-destructive/20 text-destructive' },
  RESCHEDULED: { label: 'أُعيد جدولته', cls: 'bg-orange-400/20 text-orange-700' },
};

function calcAge(dob: string | null): number | null {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

export default function FamilyMemberDetailsPage() {
  const params = useParams();
  const patientId = params.memberId as string;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/patient/family/${patientId}/records`)
      .then((r) => r.json())
      .then((json) => {
        if (!json.success) throw new Error(json.error?.message || 'حدث خطأ');
        setData(json.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) {
    return (
      <PatientLayout title="السجل الطبي" showBackButton backHref="/patient/family">
        <div className="text-center py-16 text-muted-foreground">جاري التحميل...</div>
      </PatientLayout>
    );
  }

  if (error || !data) {
    return (
      <PatientLayout title="السجل الطبي" showBackButton backHref="/patient/family">
        <div className="text-center py-16 text-destructive text-sm">{error || 'حدث خطأ'}</div>
      </PatientLayout>
    );
  }

  const { patient, appointments, relationship } = data;
  const age = calcAge(patient.dateOfBirth);

  return (
    <PatientLayout
      title={patient.user.name}
      subtitle={`السجل الطبي · ${RELATIONSHIP_LABELS[relationship] ?? relationship}`}
      showBackButton
      backHref="/patient/family"
    >
      <div className="space-y-6">
        {/* Patient Info Card */}
        <div className="bg-card border border-border rounded-xl p-4 sm:p-5">
          <div className="flex items-center gap-3 mb-4">
            {patient.user.avatar
              ? <img src={patient.user.avatar} className="w-14 h-14 rounded-full object-cover shrink-0" alt="" />
              : (
                <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl shrink-0">
                  {patient.user.name.trim()[0]}
                </div>
              )
            }
            <div>
              <h2 className="font-bold text-base sm:text-lg">{patient.user.name}</h2>
              <p className="text-sm text-primary">{RELATIONSHIP_LABELS[relationship] ?? relationship}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {age !== null && (
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">العمر</p>
                <p className="font-bold text-sm">{age} سنة</p>
              </div>
            )}
            {patient.bloodType && (
              <div className="bg-red-500/10 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">فصيلة الدم</p>
                <p className="font-bold text-sm text-red-700">{patient.bloodType}</p>
              </div>
            )}
            {patient.gender && (
              <div className="bg-muted rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">الجنس</p>
                <p className="font-bold text-sm">{patient.gender === 'male' ? 'ذكر' : 'أنثى'}</p>
              </div>
            )}
            {patient.allergies && (
              <div className="bg-orange-500/10 rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">الحساسية</p>
                <p className="font-bold text-xs text-orange-700 truncate">{patient.allergies}</p>
              </div>
            )}
          </div>
          {patient.medicalHistory && (
            <div className="mt-3 pt-3 border-t border-border">
              <p className="text-xs text-muted-foreground mb-1">التاريخ الطبي</p>
              <p className="text-sm leading-relaxed">{patient.medicalHistory}</p>
            </div>
          )}
        </div>

        {/* Appointments */}
        <section className="space-y-3">
          <h3 className="font-bold text-base sm:text-lg">السجلات الطبية</h3>
          {appointments.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">لا توجد سجلات طبية</div>
          ) : (
            appointments.map((appt: any) => {
              const st = STATUS_LABELS[appt.status] ?? { label: appt.status, cls: 'bg-muted text-muted-foreground' };
              return (
                <div key={appt.id} className="bg-card border border-border rounded-xl p-3 sm:p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm sm:text-base truncate">{appt.service.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(appt.appointmentDate).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${st.cls}`}>{st.label}</span>
                  </div>

                  <div className="space-y-1.5 text-sm border-t border-border pt-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">الطبيب</span>
                      <span className="font-medium text-xs">{appt.doctor.user.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-xs">العيادة</span>
                      <span className="font-medium text-xs">{appt.clinic.name}</span>
                    </div>
                    {appt.notes && (
                      <div className="pt-2 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-1">ملاحظات</p>
                        <p className="text-xs leading-relaxed">{appt.notes}</p>
                      </div>
                    )}
                  </div>

                  {appt.treatments.length > 0 && (
                    <div className="space-y-2 border-t border-border pt-3">
                      {appt.treatments.map((t: any, i: number) => (
                        <div key={i} className="bg-muted/50 rounded-lg p-2.5 space-y-1">
                          {t.diagnosis && <p className="text-xs font-semibold">{t.diagnosis}</p>}
                          {t.notesPublic && <p className="text-xs text-muted-foreground leading-relaxed">{t.notesPublic}</p>}
                          {t.cost !== null && t.cost !== undefined && (
                            <p className="text-xs text-primary font-medium">{t.cost} ₪</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </div>
    </PatientLayout>
  );
}