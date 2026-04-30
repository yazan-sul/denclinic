'use client';

import { useContext, useState, useEffect, useCallback } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { CalendarIcon, UsersIcon, CheckCircleIcon } from '@/components/Icons';

interface Clinic {
  id: number;
  name: string;
}

interface Branch {
  id: number;
  name: string;
  address: string;
}

interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  service: string;
  appointmentDate: string;
  appointmentTime: string;
  timeDisplay: string;
  periodDisplay: string;
  status: string;
  branchId: number;
  branchName: string;
  clinicName: string;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'قيد الانتظار',
  CONFIRMED: 'مؤكد',
  COMPLETED: 'مكتمل',
  CANCELLED: 'ملغى',
  NO_SHOW: 'لم يحضر',
  RESCHEDULED: 'معاد جدولة',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
  CONFIRMED: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  COMPLETED: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  CANCELLED: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  NO_SHOW: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
  RESCHEDULED: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
};

const todayStr = new Date().toISOString().split('T')[0];

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const local  = digits.startsWith('970') && digits.length === 12 ? digits.slice(3)
               : digits.startsWith('0')   && digits.length === 10 ? digits.slice(1)
               : digits;
  return local.length === 9
    ? `+970-${local.slice(0,3)}-${local.slice(3,6)}-${local.slice(6,9)}`
    : phone;
}

function formatTime12h(hhmm: string): { timeDisplay: string; periodDisplay: string } {
  const [hStr, mStr] = (hhmm || '00:00').split(':');
  const h = parseInt(hStr, 10);
  const periodDisplay = h >= 12 ? 'م' : 'ص';
  const h12 = h % 12 || 12;
  return { timeDisplay: `${h12}:${mStr}`, periodDisplay };
}

export default function DoctorDashboard() {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>('');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load clinics once — start with "all"
  useEffect(() => {
    fetch('/api/doctor/clinics', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data.length > 0) {
          setClinics(json.data);
          // Default to "all" so doctor sees everything at once
          setSelectedClinicId('all');
        }
      })
      .catch(() => {});
  }, []);

  // Reload branches when clinic changes
  useEffect(() => {
    setBranches([]);
    setSelectedBranchId('all');

    if (!clinics.length) return;

    const clinicIds = selectedClinicId === 'all'
      ? clinics.map((c) => c.id)
      : [Number(selectedClinicId)];

    // Fetch branches from all selected clinics in parallel
    Promise.all(
      clinicIds.map((cid) =>
        fetch(`/api/clinic/branches?clinicId=${cid}`, { credentials: 'include' })
          .then((r) => r.json())
          .then((json) => (json.success ? json.data : []))
          .catch(() => [])
      )
    ).then((results) => {
      const merged: Branch[] = results.flat();
      // Deduplicate by id
      const seen = new Set<number>();
      setBranches(merged.filter((b) => !seen.has(b.id) && seen.add(b.id)));
    });
  }, [selectedClinicId, clinics]);

  // Load today's appointments whenever clinic or branch filter changes
  const fetchAppointments = useCallback(async () => {
    if (!clinics.length) return;
    setIsLoading(true);
    setError(null);
    try {
      const clinicIds = selectedClinicId === 'all'
        ? clinics.map((c) => c.id)
        : [Number(selectedClinicId)];

      // Fetch from each clinic in parallel then merge
      const results = await Promise.all(
        clinicIds.map(async (cid) => {
          const params = new URLSearchParams({
            from: todayStr,
            to: todayStr,
            pageSize: '100',
            clinicId: String(cid),
          });
          if (selectedBranchId !== 'all') params.set('branchId', selectedBranchId);
          const res = await fetch(`/api/clinic/records?${params}`, { credentials: 'include' });
          const json = await res.json();
          return json.success ? json.data : [];
        })
      );

      const merged = results.flat();
      const json = { success: true, data: merged };

      const mapped: Appointment[] = json.data.map((apt: any) => {
        const { timeDisplay, periodDisplay } = formatTime12h(apt.appointmentTime);
        return {
          id: String(apt.id),
          patientName: apt.patient?.user?.name || '—',
          patientPhone: apt.patient?.user?.phoneNumber || '—',
          service: apt.service?.name || '—',
          appointmentDate: apt.appointmentDate,
          appointmentTime: apt.appointmentTime || '00:00',
          timeDisplay,
          periodDisplay,
          status: apt.status,
          branchId: apt.branch?.id,
          branchName: apt.branch?.name || '—',
          clinicName: apt.clinic?.name || '—',
        };
      });

      // Sort all merged appointments by time ascending
      mapped.sort((a, b) => a.appointmentTime.localeCompare(b.appointmentTime));
      setAppointments(mapped);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ');
    } finally {
      setIsLoading(false);
    }
  }, [selectedClinicId, selectedBranchId, clinics]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const todayCount = appointments.length;
  const completedCount = appointments.filter((a) => a.status === 'COMPLETED').length;
  const pendingCount = appointments.filter(
    (a) => a.status === 'PENDING' || a.status === 'CONFIRMED'
  ).length;

  const selectedClinicName = selectedClinicId === 'all'
    ? 'جميع العيادات'
    : clinics.find((c) => String(c.id) === selectedClinicId)?.name || '';
  const selectedBranchName =
    selectedBranchId === 'all'
      ? 'جميع الفروع'
      : branches.find((b) => String(b.id) === selectedBranchId)?.name || '';

  return (
    <div className="space-y-6">
      {/* Welcome + Filters */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-border p-6">
        <div className="flex flex-col gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">مرحبا {user?.name || 'الدكتور'}</h2>
            <p className="text-muted-foreground text-sm">
              {isLoading
                ? 'جاري التحميل...'
                : `لديك ${pendingCount} موعد قادم اليوم — ${selectedClinicName}${selectedBranchId !== 'all' ? ` / ${selectedBranchName}` : ''}`}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Clinic Filter */}
            {clinics.length > 0 && (
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                  العيادة:
                </label>
                <select
                  value={selectedClinicId}
                  onChange={(e) => setSelectedClinicId(e.target.value)}
                  className="text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer min-w-[160px]"
                >
                  <option value="all">جميع العيادات</option>
                  {clinics.map((c) => (
                    <option key={c.id} value={String(c.id)}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Branch Filter — disabled when all clinics selected */}
            <div className="flex items-center gap-2">
              <label className={`text-sm font-medium whitespace-nowrap ${selectedClinicId === 'all' ? 'text-muted-foreground/40' : 'text-muted-foreground'}`}>
                الفرع:
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                disabled={selectedClinicId === 'all'}
                className="text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[150px] disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <option value="all">جميع الفروع</option>
                {branches.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">مواعيد اليوم</p>
              <p className="text-3xl font-bold text-primary">{isLoading ? '—' : todayCount}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <CalendarIcon className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">المكتملة اليوم</p>
              <p className="text-3xl font-bold text-green-600">{isLoading ? '—' : completedCount}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">القادمة اليوم</p>
              <p className="text-3xl font-bold text-blue-600">{isLoading ? '—' : pendingCount}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <UsersIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-card rounded-xl border border-border p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-xl font-semibold">مواعيد اليوم</h3>
          <div className="flex items-center gap-2">
            {selectedClinicName && (
              <span className="text-xs bg-secondary px-3 py-1 rounded-full font-medium">
                {selectedClinicName}
              </span>
            )}
            {selectedBranchId !== 'all' && (
              <span className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
                {selectedBranchName}
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="text-center py-6 text-red-500 text-sm">{error}</div>
        )}

        {isLoading && !error && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-secondary rounded-lg animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && !error && appointments.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد مواعيد اليوم</p>
            {selectedBranchId !== 'all' && (
              <button
                onClick={() => setSelectedBranchId('all')}
                className="mt-2 text-sm text-primary hover:underline"
              >
                عرض جميع الفروع
              </button>
            )}
          </div>
        )}

        {!isLoading && !error && appointments.length > 0 && (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border/50 hover:border-border transition-all"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  {/* Time */}
                  <div className="w-16 h-16 bg-primary/10 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
                    <span className="font-bold text-primary text-sm leading-tight">
                      {apt.timeDisplay}
                    </span>
                    <span className="text-xs text-muted-foreground">{apt.periodDisplay}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{apt.patientName}</p>
                    <p className="text-sm text-muted-foreground truncate">{apt.service}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs text-muted-foreground font-mono" dir="ltr">{formatPhone(apt.patientPhone)}</span>
                      {selectedClinicId === 'all' && apt.clinicName && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {apt.clinicName}
                        </span>
                      )}
                      {selectedBranchId === 'all' && apt.branchName && (
                        <span className="text-xs bg-secondary px-2 py-0.5 rounded-full">
                          {apt.branchName}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status + Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 mr-2">
                  <span
                    className={`hidden sm:inline-flex text-xs px-2 py-1 rounded-full font-medium ${
                      STATUS_COLORS[apt.status] || 'bg-secondary text-secondary-foreground'
                    }`}
                  >
                    {STATUS_LABELS[apt.status] || apt.status}
                  </span>
                  <a
                    href={`/doctor/appointments?id=${apt.id}&date=${todayStr}`}
                    className="px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    تفاصيل
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Nav */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a
          href="/doctor/schedule"
          className="p-4 bg-primary/10 rounded-xl border border-primary/20 hover:border-primary/50 transition-all text-center font-medium text-primary hover:bg-primary/20"
        >
          ⏱️ إدارة جدول العمل
        </a>
        <a
          href="/doctor/patients"
          className="p-4 bg-blue-100/20 dark:bg-blue-900/20 rounded-xl border border-blue-200/20 hover:border-blue-200 transition-all text-center font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100/30"
        >
          👥 سجل المرضى
        </a>
      </div>
    </div>
  );
}