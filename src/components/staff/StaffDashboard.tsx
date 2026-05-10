'use client';

import { useContext, useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { AuthContext } from '@/context/AuthContext';
import { useActiveRole } from '@/context/ActiveRoleContext';
import { CalendarIcon, UsersIcon, SearchIcon, CheckCircleIcon } from '@/components/Icons';
import { formatPhone, getPaymentLabel } from '@/lib/format';

type FilterStatus = 'all' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

interface Clinic  { id: number; name: string }
interface Branch  { id: number; name: string }
interface Doctor  { id: number; name: string }

interface Appointment {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  clinic:   { id: number; name: string } | null;
  branch:   { id: number; name: string } | null;
  patient:  { user: { name: string; phoneNumber: string } } | null;
  doctor:   { user: { name: string } } | null;
  service:  { name: string } | null;
  payment:  { status: string } | null;
}

interface AppointmentGroup {
  clinicId: number;
  clinicName: string;
  branchId: number;
  branchName: string;
  appointments: Appointment[];
}

const getToday = () => {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, '0'),
    String(d.getDate()).padStart(2, '0'),
  ].join('-');
};

const addDays = (dateStr: string, n: number) => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d + n);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};

const formatDateAr = (dateStr: string) =>
  new Date(dateStr + 'T00:00:00').toLocaleDateString('ar-EG', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING:        { label: 'قادم',          className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  CONFIRMED:      { label: 'مؤكد',          className: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' },
  COMPLETED:      { label: 'مكتمل',         className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  CANCELLED:      { label: 'ملغي',          className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  NO_SHOW:        { label: 'لم يحضر',       className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
  RESCHEDULED:    { label: 'معاد جدولته',   className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
  PAYMENT_FAILED: { label: 'فشل الدفع',    className: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300' },
};

const filterPills: { id: FilterStatus; label: string }[] = [
  { id: 'all',       label: 'الكل' },
  { id: 'PENDING',   label: 'قادم' },
  { id: 'CONFIRMED', label: 'مؤكد' },
  { id: 'COMPLETED', label: 'مكتمل' },
  { id: 'CANCELLED', label: 'ملغي' },
  { id: 'NO_SHOW',   label: 'لم يحضر' },
];

/* ── Appointment Table ── */
function AppointmentTable({
  appointments, confirmingId, onConfirm,
}: {
  appointments: Appointment[];
  confirmingId: string | null;
  onConfirm: (id: string) => void;
}) {
  return (
    <>
      {/* Desktop */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/30">
              <th className="text-right px-4 py-2.5 font-semibold text-foreground">المريض</th>
              <th className="text-right px-4 py-2.5 font-semibold text-foreground">التوقيت</th>
              <th className="text-right px-4 py-2.5 font-semibold text-foreground">نوع الكشف</th>
              <th className="text-right px-4 py-2.5 font-semibold text-foreground">الطبيب</th>
              <th className="text-right px-4 py-2.5 font-semibold text-foreground">الدفع</th>
              <th className="text-right px-4 py-2.5 font-semibold text-foreground">الحالة</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {appointments.map((appt) => {
              const patientName = appt.patient?.user?.name ?? 'مريض';
              const phone       = appt.patient?.user?.phoneNumber ?? '';
              const doctorName  = appt.doctor?.user?.name ?? '—';
              const service     = appt.service?.name ?? '—';
              const payStatus   = appt.payment?.status;
              const isCancelled = appt.status === 'CANCELLED';
              const isUpcoming  = appt.status === 'PENDING';
              const isConfirmed = appt.status === 'CONFIRMED';
              const cfg         = statusConfig[appt.status] ?? { label: appt.status, className: 'bg-secondary text-foreground' };
              const payLabel    = isCancelled
                ? (payStatus === 'REFUNDED'  ? { text: 'مسترد',     cls: 'text-purple-600 dark:text-purple-400' }
                  : payStatus === 'CANCELLED' ? { text: 'ملغي الدفع', cls: 'text-muted-foreground' }
                  : null)
                : payStatus === 'COMPLETED' ? { text: 'مدفوع',  cls: 'text-green-600 dark:text-green-400' }
                : payStatus === 'PENDING'   ? { text: 'معلّق',  cls: 'text-amber-600 dark:text-amber-400' }
                : isUpcoming               ? null
                : { text: 'غير مدفوع', cls: 'text-red-500 dark:text-red-400' };
              const confirming = confirmingId === appt.id;
              return (
                <tr key={appt.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                        {patientName.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground leading-tight">{patientName}</p>
                        <p className="text-xs text-muted-foreground" dir="rtl">{formatPhone(phone)}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-foreground font-mono text-xs" dir="ltr">{appt.appointmentTime}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{service}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{doctorName}</td>
                  <td className="px-4 py-3">
                    {payLabel && <span className={`text-xs font-medium ${payLabel.cls}`}>{payLabel.text}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {isConfirmed && (
                        <button
                          onClick={() => onConfirm(appt.id)}
                          disabled={confirming}
                          className="text-xs px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 whitespace-nowrap font-medium transition-colors"
                        >
                          {confirming ? '...' : '✓ وصل'}
                        </button>
                      )}
                      <Link href="/staff/appointments" className="text-xs text-primary hover:underline">تفاصيل</Link>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="md:hidden space-y-3 px-4 py-3">
        {appointments.map((appt) => {
          const patientName = appt.patient?.user?.name ?? 'مريض';
          const phone       = appt.patient?.user?.phoneNumber ?? '';
          const service     = appt.service?.name ?? '—';
          const isCancelled = appt.status === 'CANCELLED';
          const isConfirmed = appt.status === 'CONFIRMED';
          const payStatus   = appt.payment?.status;
          const cfg         = statusConfig[appt.status] ?? { label: appt.status, className: 'bg-secondary text-foreground' };
          const payLabel    = getPaymentLabel(payStatus, isCancelled, appt.status);
          const confirming  = confirmingId === appt.id;
          return (
            <div key={appt.id} className="bg-background border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                    {patientName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{patientName}</p>
                    <p className="text-xs text-muted-foreground" dir="rtl">{formatPhone(phone)}</p>
                  </div>
                </div>
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${cfg.className}`}>
                  {cfg.label}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">الوقت</p>
                  <p className="font-mono text-foreground" dir="ltr">{appt.appointmentTime}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">نوع الكشف</p>
                  <p className="text-foreground">{service}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                {payLabel && <span className={`text-xs font-semibold ${payLabel.cls}`}>{payLabel.text}</span>}
                <div className="flex items-center gap-2 mr-auto">
                  {isConfirmed && (
                    <button
                      onClick={() => onConfirm(appt.id)}
                      disabled={confirming}
                      className="text-xs px-2 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium"
                    >
                      {confirming ? '...' : '✓ وصل'}
                    </button>
                  )}
                  <Link href="/staff/appointments" className="text-xs text-primary hover:underline font-medium">تفاصيل</Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

export default function StaffDashboard() {
  const authContext = useContext(AuthContext);
  const user = authContext?.user as any;
  const layoutRole = useActiveRole();

  const [appointments,   setAppointments]   = useState<Appointment[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [lastUpdated,    setLastUpdated]    = useState<Date | null>(null);
  const [search,         setSearch]         = useState('');
  const [filterStatus,   setFilterStatus]   = useState<FilterStatus>('all');
  const [selectedDate,   setSelectedDate]   = useState(getToday());
  const [tomorrowCount,  setTomorrowCount]  = useState<number | null>(null);
  const [debtorCount,    setDebtorCount]    = useState<number | null>(null);
  const [confirmingId,   setConfirmingId]   = useState<string | null>(null);

  // Clinic / Branch / Doctor
  const [clinics,           setClinics]           = useState<Clinic[]>([]);
  const [branches,          setBranches]          = useState<Branch[]>([]);
  const [doctors,           setDoctors]           = useState<Doctor[]>([]);
  const [selectedClinicId,  setSelectedClinicId]  = useState<string>('all');
  const [selectedBranchId,  setSelectedBranchId]  = useState<string>('all');
  const [selectedDoctorId,  setSelectedDoctorId]  = useState<string>('all');


  useEffect(() => {
    fetch(`/api/doctor/clinics${layoutRole === 'STAFF' ? '?activeRole=STAFF' : ''}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => { if (json.success) setClinics(json.data); })
      .catch(() => {});
  }, [layoutRole]);

  useEffect(() => {
    setBranches([]);
    setSelectedBranchId('all');
    setDoctors([]);
    setSelectedDoctorId('all');
    if (selectedClinicId === 'all') return;
    fetch(`/api/clinic/branches?clinicId=${selectedClinicId}&activeRole=STAFF`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => { if (json.success) setBranches(json.data); })
      .catch(() => {});
  }, [selectedClinicId]);

  // Fetch doctors based on clinic + branch selection
  useEffect(() => {
    setDoctors([]);
    setSelectedDoctorId('all');
    if (selectedClinicId === 'all') return;
    const params = new URLSearchParams({ clinicId: selectedClinicId, activeRole: 'STAFF' });
    if (selectedBranchId !== 'all') params.set('branchId', selectedBranchId);
    fetch(`/api/clinic/doctors?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        if (json.success) setDoctors(json.data.map((d: any) => ({ id: d.id, name: d.user.name })));
      })
      .catch(() => {});
  }, [selectedClinicId, selectedBranchId]);

  // Fetch appointments for selected date
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from: selectedDate, to: selectedDate, activeRole: 'STAFF' });
      if (selectedClinicId !== 'all') params.set('clinicId', selectedClinicId);
      if (selectedBranchId !== 'all') params.set('branchId', selectedBranchId);
      if (selectedDoctorId !== 'all') params.set('doctorId', selectedDoctorId);
      params.set('pageSize', '100');
      const res  = await fetch(`/api/clinic/records?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('فشل تحميل المواعيد');
      const json = await res.json();
      setAppointments(json.data?.appointments ?? json.data ?? []);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }, [selectedDate, selectedClinicId, selectedBranchId, selectedDoctorId]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // Auto-refresh every 30 seconds to pick up payment changes from other pages
  useEffect(() => {
    const id = setInterval(fetchAppointments, 30_000);
    return () => clearInterval(id);
  }, [fetchAppointments]);

  // Fetch tomorrow's count (only when viewing today)
  useEffect(() => {
    if (selectedDate !== getToday()) { setTomorrowCount(null); return; }
    const tomorrow = addDays(selectedDate, 1);
    const params = new URLSearchParams({ from: tomorrow, to: tomorrow, activeRole: 'STAFF', pageSize: '1' });
    if (selectedClinicId !== 'all') params.set('clinicId', selectedClinicId);
    fetch(`/api/clinic/records?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        const total = json.data?.pagination?.total ?? (json.data?.appointments ?? json.data ?? []).length;
        setTomorrowCount(total);
      })
      .catch(() => setTomorrowCount(null));
  }, [selectedDate, selectedClinicId]);

  // Fetch debtors count
  useEffect(() => {
    if (selectedClinicId === 'all') { setDebtorCount(null); return; }
    fetch(`/api/staff/patient-balances?clinicId=${selectedClinicId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        const debtors = (json.data ?? []).filter((p: any) => p.status === 'DEBT').length;
        setDebtorCount(debtors);
      })
      .catch(() => setDebtorCount(null));
  }, [selectedClinicId]);

  // Confirm attendance
  const handleConfirm = async (appointmentId: string) => {
    if (confirmingId) return;
    setConfirmingId(appointmentId);
    try {
      const params = selectedClinicId !== 'all' ? `?clinicId=${selectedClinicId}` : '';
      const res = await fetch(`/api/clinic/records/${appointmentId}${params}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'COMPLETED' }),
      });
      if (res.ok) {
        setAppointments(prev =>
          prev.map(a => a.id === appointmentId ? { ...a, status: 'COMPLETED' } : a)
        );
      }
    } catch { /* silent */ }
    finally { setConfirmingId(null); }
  };

  const filtered = useMemo(() => appointments.filter((a) => {
    const name  = a.patient?.user?.name ?? '';
    const phone = a.patient?.user?.phoneNumber ?? '';
    const matchSearch = !search || name.includes(search) || phone.includes(search);
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchSearch && matchStatus;
  }), [appointments, search, filterStatus]);

  const groupedAppointments = useMemo((): AppointmentGroup[] => {
    if (selectedClinicId !== 'all' && selectedBranchId !== 'all') return [];
    const map = new Map<string, AppointmentGroup>();
    filtered.forEach((a) => {
      const cId   = a.clinic?.id   ?? 0;
      const cName = a.clinic?.name ?? 'عيادة غير معروفة';
      const bId   = a.branch?.id   ?? 0;
      const bName = a.branch?.name ?? 'فرع غير معروف';
      const key   = `${cId}-${bId}`;
      if (!map.has(key)) {
        map.set(key, { clinicId: cId, clinicName: cName, branchId: bId, branchName: bName, appointments: [] });
      }
      map.get(key)!.appointments.push(a);
    });
    return Array.from(map.values()).sort((a, b) =>
      a.clinicName.localeCompare(b.clinicName, 'ar') || a.branchName.localeCompare(b.branchName, 'ar')
    );
  }, [filtered, selectedClinicId, selectedBranchId]);

  const totalToday     = appointments.length;
  const completedToday = appointments.filter(a => a.status === 'COMPLETED').length;
  const upcomingToday  = appointments.filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED').length;
  const noShowToday    = appointments.filter(a => a.status === 'NO_SHOW').length;
  const unpaidToday    = appointments.filter(a =>
    (a.status === 'CONFIRMED' || a.status === 'COMPLETED') &&
    (!a.payment || a.payment.status === 'PENDING')
  ).length;

  const isToday    = selectedDate === getToday();
  const dateLabel  = isToday ? 'اليوم' : formatDateAr(selectedDate);
  const clinicName = clinics.find(c => String(c.id) === selectedClinicId)?.name ?? '';

  return (
    <div className="space-y-6" dir="rtl">

      {/* Welcome + Date Navigation */}
      <div className="bg-gradient-to-l from-primary/5 to-primary/10 rounded-2xl p-4 md:p-6 border border-primary/20 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1">
              مرحباً، {user?.name || 'السكرتير'} 👋
            </h2>
            <p className="text-muted-foreground text-xs md:text-sm">
              {loading ? 'جاري التحميل...' : `${upcomingToday} موعد قادم — ${selectedClinicId === 'all' ? 'جميع العيادات' : clinicName}`}
            </p>
          </div>

          {/* Day navigation */}
          <div className="flex items-center gap-1 bg-background border border-border rounded-xl p-1">
            <button
              onClick={() => setSelectedDate(d => addDays(d, -1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground text-lg"
              title="اليوم السابق"
            >‹</button>
            <div className="px-3 text-center min-w-[100px]">
              <p className="text-xs font-semibold text-foreground">{dateLabel}</p>
              <p className="text-xs text-muted-foreground" dir="ltr">{selectedDate}</p>
            </div>
            <button
              onClick={() => setSelectedDate(d => addDays(d, 1))}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground text-lg"
              title="اليوم التالي"
            >›</button>
            {!isToday && (
              <button
                onClick={() => setSelectedDate(getToday())}
                className="mr-1 px-2 py-1 text-xs bg-primary text-white rounded-lg font-medium"
              >اليوم</button>
            )}
          </div>
        </div>

        {/* Tomorrow's alert */}
        {isToday && tomorrowCount !== null && tomorrowCount > 0 && (
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-2.5 text-sm">
            <span className="text-blue-600 dark:text-blue-400">📅</span>
            <span className="text-blue-700 dark:text-blue-300 font-medium">
              غداً {tomorrowCount} موعد
            </span>
            <button
              onClick={() => setSelectedDate(addDays(getToday(), 1))}
              className="mr-auto text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              عرض مواعيد الغد ›
            </button>
          </div>
        )}

        {/* Clinic / Branch filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs md:text-sm text-muted-foreground whitespace-nowrap">العيادة:</span>
            <select
              value={selectedClinicId}
              onChange={e => setSelectedClinicId(e.target.value)}
              className="flex-1 text-xs md:text-sm bg-background border border-border rounded-lg px-2 md:px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">جميع العيادات</option>
              {clinics.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xs md:text-sm text-muted-foreground whitespace-nowrap">الفرع:</span>
            <select
              value={selectedBranchId}
              onChange={e => setSelectedBranchId(e.target.value)}
              disabled={selectedClinicId === 'all'}
              className="flex-1 text-xs md:text-sm bg-background border border-border rounded-lg px-2 md:px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              <option value="all">جميع الفروع</option>
              {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
            </select>
          </div>
        </div>

        {/* Doctor filter — only when clinic is selected and has multiple doctors */}
        {doctors.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs md:text-sm text-muted-foreground whitespace-nowrap">الطبيب:</span>
            <div className="flex gap-1.5 flex-wrap">
              <button
                onClick={() => setSelectedDoctorId('all')}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${selectedDoctorId === 'all' ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/40 bg-background'}`}
              >
                الكل
              </button>
              {doctors.map(d => (
                <button
                  key={d.id}
                  onClick={() => setSelectedDoctorId(String(d.id))}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${selectedDoctorId === String(d.id) ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/40 bg-background'}`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-4">
        <div className="bg-card border border-border rounded-xl p-3 md:p-4">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-2 md:mb-3">
            <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-xl md:text-2xl font-bold text-foreground">{loading ? '—' : totalToday}</p>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">مواعيد {isToday ? 'اليوم' : 'اليوم المختار'}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 md:p-4">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-2 md:mb-3">
            <CheckCircleIcon className="w-4 h-4 md:w-5 md:h-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-xl md:text-2xl font-bold text-foreground">{loading ? '—' : completedToday}</p>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">مكتمل</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 md:p-4">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-2 md:mb-3">
            <CalendarIcon className="w-4 h-4 md:w-5 md:h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <p className="text-xl md:text-2xl font-bold text-foreground">{loading ? '—' : upcomingToday}</p>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">قادم</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-3 md:p-4">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mb-2 md:mb-3">
            <UsersIcon className="w-4 h-4 md:w-5 md:h-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xl md:text-2xl font-bold text-foreground">{loading ? '—' : unpaidToday}</p>
              <p className="text-xs md:text-sm text-muted-foreground mt-1">بانتظار الدفع</p>
            </div>
            {noShowToday > 0 && (
              <span className="text-xs text-orange-600 dark:text-orange-400 font-medium pb-1">{noShowToday} غياب</span>
            )}
          </div>
        </div>

        {/* Debtors card — only when a clinic is selected */}
        <Link
          href="/staff/payments"
          className="bg-card border border-border rounded-xl p-3 md:p-4 hover:border-amber-400 dark:hover:border-amber-600 transition-colors group"
        >
          <div className="w-8 h-8 md:w-10 md:h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center mb-2 md:mb-3 group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
            <span className="text-base md:text-lg">💳</span>
          </div>
          <p className="text-xl md:text-2xl font-bold text-foreground">
            {debtorCount === null ? '—' : debtorCount}
          </p>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            {selectedClinicId === 'all' ? 'مدينون (اختر عيادة)' : 'مريض مدين'}
          </p>
        </Link>
      </div>

      {/* Today's Appointments */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 p-3 md:p-4 border-b border-border">
          <div className="flex items-center gap-2 md:gap-3 flex-wrap">
            <h3 className="text-base md:text-lg font-bold text-foreground">
              مواعيد {dateLabel}
            </h3>
            {selectedClinicId === 'all' ? (
              <span className="px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                جميع العيادات
              </span>
            ) : (
              <div className="flex items-center gap-1 md:gap-1.5 flex-wrap">
                <span className="px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                  {clinicName || 'العيادة'}
                </span>
                {selectedBranchId !== 'all' && (
                  <>
                    <span className="text-muted-foreground text-xs">›</span>
                    <span className="px-2 md:px-2.5 py-0.5 md:py-1 rounded-full text-xs font-semibold bg-secondary text-foreground border border-border">
                      {branches.find(b => String(b.id) === selectedBranchId)?.name ?? 'الفرع'}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 w-full md:w-auto">
            {lastUpdated && (
              <button
                onClick={fetchAppointments}
                disabled={loading}
                className="hidden md:block text-xs text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap disabled:opacity-50"
              >
                {loading ? 'جاري التحديث...' : `آخر تحديث ${lastUpdated.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}`}
              </button>
            )}
            <div className="relative flex-1 md:flex-none">
              <SearchIcon className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="ابحث..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full md:w-48 pr-7 md:pr-9 pl-2 md:pl-4 py-1.5 md:py-2 text-xs md:text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <Link
              href="/staff/appointments"
              className="px-2 md:px-4 py-1.5 md:py-2 bg-primary text-white rounded-lg text-xs md:text-sm font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap flex-shrink-0"
            >
              + موعد
            </Link>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-1 md:gap-2 px-3 md:px-4 py-2 md:py-3 border-b border-border overflow-x-auto">
          {filterPills.map(pill => (
            <button
              key={pill.id}
              onClick={() => setFilterStatus(pill.id)}
              className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0 ${
                filterStatus === pill.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground hover:bg-muted'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-8 md:py-12 text-muted-foreground text-sm">جاري التحميل...</div>
        ) : error ? (
          <div className="text-center py-8 md:py-12 text-destructive text-sm">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 md:py-12 text-muted-foreground text-sm">لا توجد مواعيد</div>
        ) : (selectedClinicId !== 'all' || selectedBranchId !== 'all') ? (
          <AppointmentTable
            appointments={filtered}
  
            confirmingId={confirmingId}
            onConfirm={handleConfirm}
          />
        ) : (
          <div className="divide-y divide-border">
            {groupedAppointments.map(group => (
              <div key={`${group.clinicId}-${group.branchId}`}>
                <div className="flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-2.5 bg-secondary/40 border-b border-border flex-wrap">
                  <span className="text-xs md:text-sm font-bold text-primary">{group.clinicName}</span>
                  <span className="text-muted-foreground text-xs hidden md:inline">›</span>
                  <span className="text-xs md:text-sm font-semibold text-foreground">{group.branchName}</span>
                  <span className="mr-auto text-xs text-muted-foreground">{group.appointments.length} موعد</span>
                </div>
                <AppointmentTable
                  appointments={group.appointments}

                  confirmingId={confirmingId}
                  onConfirm={handleConfirm}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div>
        <h3 className="text-base md:text-lg font-semibold text-foreground mb-3 md:mb-4">الوصول السريع</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
          <Link href="/staff/appointments"
            className="flex flex-col items-center gap-2 md:gap-3 p-3 md:p-4 bg-card border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <CalendarIcon className="w-5 h-5 md:w-6 md:h-6 text-blue-600 dark:text-blue-400 group-hover:text-primary" />
            </div>
            <span className="text-xs md:text-sm font-medium text-foreground text-center">إدارة المواعيد</span>
          </Link>

          <Link href="/staff/patients"
            className="flex flex-col items-center gap-2 md:gap-3 p-3 md:p-4 bg-card border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <UsersIcon className="w-5 h-5 md:w-6 md:h-6 text-purple-600 dark:text-purple-400 group-hover:text-primary" />
            </div>
            <span className="text-xs md:text-sm font-medium text-foreground text-center">قائمة المرضى</span>
          </Link>

          <Link href="/staff/payments"
            className="flex flex-col items-center gap-2 md:gap-3 p-3 md:p-4 bg-card border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <CheckCircleIcon className="w-5 h-5 md:w-6 md:h-6 text-green-600 dark:text-green-400 group-hover:text-primary" />
            </div>
            <span className="text-xs md:text-sm font-medium text-foreground text-center">المدفوعات</span>
          </Link>

          <Link href="/staff/lab"
            className="flex flex-col items-center gap-2 md:gap-3 p-3 md:p-4 bg-card border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <SearchIcon className="w-5 h-5 md:w-6 md:h-6 text-amber-600 dark:text-amber-400 group-hover:text-primary" />
            </div>
            <span className="text-xs md:text-sm font-medium text-foreground text-center">المختبرات</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
