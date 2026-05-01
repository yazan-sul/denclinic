'use client';

import { useContext, useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AuthContext } from '@/context/AuthContext';
import { CalendarIcon, UsersIcon, SearchIcon, CheckCircleIcon } from '@/components/Icons';

type FilterStatus = 'all' | 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';

interface Clinic  { id: number; name: string }
interface Branch  { id: number; name: string }

interface Appointment {
  id: number;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  patient: { user: { name: string; phoneNumber: string } } | null;
  doctor: { user: { name: string } } | null;
  service: { name: string } | null;
  payment: { status: string } | null;
}

const today = new Date().toISOString().split('T')[0];

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING:   { label: 'قادم',      className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  CONFIRMED: { label: 'مؤكد',      className: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' },
  COMPLETED: { label: 'مكتمل',     className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  CANCELLED: { label: 'ملغي',      className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  NO_SHOW:   { label: 'لم يحضر',   className: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
  RESCHEDULED: { label: 'معاد جدولته', className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
  PAYMENT_FAILED: { label: 'فشل الدفع', className: 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300' },
};

const filterPills: { id: FilterStatus; label: string }[] = [
  { id: 'all',       label: 'الكل' },
  { id: 'PENDING',   label: 'قادم' },
  { id: 'CONFIRMED', label: 'مؤكد' },
  { id: 'COMPLETED', label: 'مكتمل' },
  { id: 'CANCELLED', label: 'ملغي' },
  { id: 'NO_SHOW',   label: 'لم يحضر' },
];

export default function StaffDashboard() {
  const authContext = useContext(AuthContext);
  const user = authContext?.user as any;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  // Clinic / Branch filters
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>('all');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');

  // Load clinics
  useEffect(() => {
    fetch('/api/doctor/clinics', { credentials: 'include' })
      .then(r => r.json())
      .then(json => { if (json.success) setClinics(json.data); })
      .catch(() => {});
  }, []);

  // Load branches when clinic changes
  useEffect(() => {
    setBranches([]);
    setSelectedBranchId('all');
    if (selectedClinicId === 'all') return;
    fetch(`/api/clinic/branches?clinicId=${selectedClinicId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => { if (json.success) setBranches(json.data); })
      .catch(() => {});
  }, [selectedClinicId]);

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ from: today, to: today });
        if (selectedClinicId !== 'all') params.set('clinicId', selectedClinicId);
        if (selectedBranchId !== 'all') params.set('branchId', selectedBranchId);
        params.set('pageSize', '100');

        const res = await fetch(`/api/clinic/records?${params}`, { credentials: 'include' });
        if (!res.ok) throw new Error('فشل تحميل المواعيد');
        const json = await res.json();
        setAppointments(json.data?.appointments ?? json.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'حدث خطأ');
      } finally {
        setLoading(false);
      }
    };

    fetchAppointments();
  }, [selectedClinicId, selectedBranchId]);

  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      const name = a.patient?.user?.name ?? '';
      const phone = a.patient?.user?.phoneNumber ?? '';
      const matchSearch = !search || name.includes(search) || phone.includes(search);
      const matchStatus = filterStatus === 'all' || a.status === filterStatus;
      return matchSearch && matchStatus;
    });
  }, [appointments, search, filterStatus]);

  const totalToday    = appointments.length;
  const completedToday = appointments.filter((a) => a.status === 'COMPLETED').length;
  const upcomingToday  = appointments.filter((a) => a.status === 'PENDING' || a.status === 'CONFIRMED').length;
  const unpaidToday    = appointments.filter((a) => !a.payment || a.payment.status !== 'COMPLETED').length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Welcome */}
      <div className="bg-gradient-to-l from-primary/5 to-primary/10 rounded-2xl p-6 border border-primary/20">
        <h2 className="text-2xl font-bold text-foreground mb-1">
          مرحباً، {user?.name || 'السكرتير'} 👋
        </h2>
        <p className="text-muted-foreground text-sm mb-4">
          {loading ? 'جاري التحميل...' : `لديك ${upcomingToday} موعد قادم اليوم — ${selectedClinicId === 'all' ? 'جميع العيادات' : clinics.find(c => String(c.id) === selectedClinicId)?.name ?? ''}`}
        </p>

        {/* Clinic / Branch filters */}
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">العيادة:</span>
            <select
              value={selectedClinicId}
              onChange={(e) => setSelectedClinicId(e.target.value)}
              className="text-sm bg-background border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">جميع العيادات</option>
              {clinics.map(c => (
                <option key={c.id} value={String(c.id)}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">الفرع:</span>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              disabled={selectedClinicId === 'all'}
              className="text-sm bg-background border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              <option value="all">جميع الفروع</option>
              {branches.map(b => (
                <option key={b.id} value={String(b.id)}>{b.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-3">
            <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-foreground">{loading ? '—' : totalToday}</p>
          <p className="text-sm text-muted-foreground mt-1">مواعيد اليوم</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-3">
            <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-2xl font-bold text-foreground">{loading ? '—' : completedToday}</p>
          <p className="text-sm text-muted-foreground mt-1">مكتمل</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-3">
            <CalendarIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-foreground">{loading ? '—' : upcomingToday}</p>
          <p className="text-sm text-muted-foreground mt-1">قادم</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mb-3">
            <UsersIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-2xl font-bold text-foreground">{loading ? '—' : unpaidToday}</p>
          <p className="text-sm text-muted-foreground mt-1">غير مدفوع</p>
        </div>
      </div>

      {/* Today's Appointments */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 p-4 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">حجوزات المرضى اليومية</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="ابحث عن مريض..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9 pl-4 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary w-48"
              />
            </div>
            <Link
              href="/staff/appointments"
              className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              + موعد جديد
            </Link>
          </div>
        </div>

        {/* Status filter pills */}
        <div className="flex gap-2 px-4 py-3 border-b border-border overflow-x-auto">
          {filterPills.map((pill) => (
            <button
              key={pill.id}
              onClick={() => setFilterStatus(pill.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filterStatus === pill.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-foreground hover:bg-muted'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>

        {/* Table */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">{error}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-right px-4 py-3 font-semibold text-foreground">المريض</th>
                  <th className="text-right px-4 py-3 font-semibold text-foreground">التوقيت</th>
                  <th className="text-right px-4 py-3 font-semibold text-foreground hidden sm:table-cell">نوع الكشف</th>
                  <th className="text-right px-4 py-3 font-semibold text-foreground hidden md:table-cell">الطبيب</th>
                  <th className="text-right px-4 py-3 font-semibold text-foreground">الدفع</th>
                  <th className="text-right px-4 py-3 font-semibold text-foreground">الحالة</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground">
                      لا توجد مواعيد
                    </td>
                  </tr>
                ) : (
                  filtered.map((appt) => {
                    const patientName = appt.patient?.user?.name ?? 'مريض';
                    const phone       = appt.patient?.user?.phoneNumber ?? '';
                    const doctorName  = appt.doctor?.user?.name ?? '—';
                    const service     = appt.service?.name ?? '—';
                    const isPaid      = appt.payment?.status === 'COMPLETED';
                    const cfg         = statusConfig[appt.status] ?? { label: appt.status, className: 'bg-secondary text-foreground' };

                    return (
                      <tr key={appt.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                              {patientName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{patientName}</p>
                              <p className="text-xs text-muted-foreground" dir="ltr">{phone}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-foreground font-medium" dir="ltr">
                          {appt.appointmentTime}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{service}</td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{doctorName}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium ${isPaid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                            {isPaid ? 'مدفوع' : 'غير مدفوع'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
                            {cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link href="/staff/appointments" className="text-xs text-primary hover:underline">
                            تفاصيل
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Links */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">الوصول السريع</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/staff/appointments"
            className="flex flex-col items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <CalendarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">إدارة المواعيد</span>
          </Link>

          <Link href="/staff/patients"
            className="flex flex-col items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <UsersIcon className="w-6 h-6 text-purple-600 dark:text-purple-400 group-hover:text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">قائمة المرضى</span>
          </Link>

          <Link href="/staff/payments"
            className="flex flex-col items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400 group-hover:text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">المدفوعات</span>
          </Link>

          <Link href="/staff/lab"
            className="flex flex-col items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <SearchIcon className="w-6 h-6 text-amber-600 dark:text-amber-400 group-hover:text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">المختبرات</span>
          </Link>
        </div>
      </div>
    </div>
  );
}