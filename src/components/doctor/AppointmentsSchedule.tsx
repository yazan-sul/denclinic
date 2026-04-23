'use client';

import { useState, useEffect, useCallback, useContext, useRef, useMemo } from 'react';
import { CalendarIcon, ClockIcon, UsersIcon } from '@/components/Icons';
import { AuthContext } from '@/context/AuthContext';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  service: string;
  date: string;
  time: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED' | 'PAYMENT_FAILED';
  notes?: string;
}

interface Doctor {
  id: number;
  specialization: string;
  user: { id: number; name: string };
}

interface Clinic { id: number; name: string }
interface Branch { id: number; name: string }

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'قيد الانتظار', CONFIRMED: 'مؤكد', COMPLETED: 'مكتمل',
  CANCELLED: 'ملغى', NO_SHOW: 'لم يحضر', RESCHEDULED: 'معاد جدولة',
  PAYMENT_FAILED: 'فشل الدفع',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:       'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
  CONFIRMED:     'bg-blue-100   dark:bg-blue-900/20   text-blue-700   dark:text-blue-300',
  COMPLETED:     'bg-green-100  dark:bg-green-900/20  text-green-700  dark:text-green-300',
  CANCELLED:     'bg-red-100    dark:bg-red-900/20    text-red-700    dark:text-red-300',
  NO_SHOW:       'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
  RESCHEDULED:   'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
  PAYMENT_FAILED:'bg-gray-100   dark:bg-gray-800      text-gray-700   dark:text-gray-300',
};

const today = new Date().toISOString().split('T')[0];
const MANAGER_ROLES = ['CLINIC_OWNER', 'ADMIN', 'STAFF'];

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  highlightId?:   string;
  initialDate?:   string;
  initialSearch?: string;
  initialFrom?:   string;
  initialTo?:     string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AppointmentsSchedule({ highlightId, initialDate, initialSearch, initialFrom, initialTo }: Props) {
  const authContext  = useContext(AuthContext);
  const activeRole   = authContext?.activeRole;
  const isManager    = activeRole ? MANAGER_ROLES.includes(activeRole) : false;

  // Filters
  const [from,        setFrom]        = useState(initialFrom || initialDate || today);
  const [to,          setTo]          = useState(initialTo   || initialDate || today);
  const [filterStatus,setFilterStatus]= useState('all');
  const [searchInput, setSearchInput] = useState(initialSearch || '');
  const [search,      setSearch]      = useState(initialSearch || '');

  // Clinic / Branch filters
  const [clinics,          setClinics]          = useState<Clinic[]>([]);
  const [branches,         setBranches]         = useState<Branch[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState('all');
  const [selectedBranchId, setSelectedBranchId] = useState('all');

  // Doctor filter (managers only)
  const [doctors,          setDoctors]          = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState('all');

  // Data
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [updatingId,   setUpdatingId]   = useState<string | null>(null);

  // Highlight scroll
  const highlightRef = useRef<HTMLDivElement>(null);

  // ── Load clinics ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/doctor/clinics', { credentials: 'include' })
      .then(r => r.json())
      .then(json => { if (json.success) setClinics(json.data); })
      .catch(() => {});
  }, []);

  // ── Load branches when clinic changes ───────────────────────────────────────
  useEffect(() => {
    setBranches([]);
    setSelectedBranchId('all');
    if (selectedClinicId === 'all') return;
    fetch(`/api/clinic/branches?clinicId=${selectedClinicId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => { if (json.success) setBranches(json.data); })
      .catch(() => {});
  }, [selectedClinicId]);

  // ── Load doctors (managers) ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isManager) return;
    fetch('/api/clinic/doctors', { credentials: 'include' })
      .then(r => r.json())
      .then(json => { if (json.success) setDoctors(json.data); })
      .catch(() => {});
  }, [isManager]);

  // ── Debounce search ─────────────────────────────────────────────────────────
  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  // ── Fetch appointments ──────────────────────────────────────────────────────
  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from, to, pageSize: '200' });
      if (filterStatus !== 'all')                  params.set('status',   filterStatus);
      if (search)                                  params.set('search',   search);
      if (selectedClinicId !== 'all')              params.set('clinicId', selectedClinicId);
      if (selectedBranchId !== 'all')              params.set('branchId', selectedBranchId);
      if (isManager && selectedDoctorId !== 'all') params.set('doctorId', selectedDoctorId);

      const res  = await fetch(`/api/clinic/records?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'فشل تحميل المواعيد');

      const mapped: Appointment[] = json.data.map((apt: any) => ({
        id:           apt.id,
        patientName:  apt.patient?.user?.name        ?? 'غير معروف',
        patientPhone: apt.patient?.user?.phoneNumber ?? '',
        service:      apt.service?.name              ?? '',
        date:         apt.appointmentDate?.split('T')[0] ?? from,
        time:         apt.appointmentTime            ?? '',
        status:       apt.status,
        notes:        apt.notes ?? undefined,
      }));

      setAppointments(mapped);
    } catch (err: any) {
      setError(err.message ?? 'حدث خطأ');
    } finally {
      setIsLoading(false);
    }
  }, [from, to, filterStatus, search, selectedClinicId, selectedBranchId, isManager, selectedDoctorId]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // ── Scroll to highlighted appointment ───────────────────────────────────────
  useEffect(() => {
    if (!highlightId || isLoading) return;
    const t = setTimeout(() => highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
    return () => clearTimeout(t);
  }, [highlightId, isLoading]);

  // ── Sorted list (highlight first) ───────────────────────────────────────────
  const sortedAppointments = useMemo(() => {
    if (!highlightId) return appointments;
    return [...appointments].sort((a, b) => (a.id === highlightId ? -1 : b.id === highlightId ? 1 : 0));
  }, [appointments, highlightId]);

  // ── Status update ───────────────────────────────────────────────────────────
  const updateStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res  = await fetch(`/api/clinic/records/${id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'فشل التحديث');
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus as Appointment['status'] } : a));
    } catch (err: any) {
      alert(err.message ?? 'حدث خطأ');
    } finally {
      setUpdatingId(null);
    }
  };

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:     appointments.length,
    pending:   appointments.filter(a => a.status === 'CONFIRMED' || a.status === 'PENDING').length,
    completed: appointments.filter(a => a.status === 'COMPLETED').length,
    cancelled: appointments.filter(a => a.status === 'CANCELLED').length,
  }), [appointments]);

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Filters ── */}
      <div className="bg-card rounded-xl border border-border p-4 space-y-3">
        {/* Row 1: dates */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">من تاريخ</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">إلى تاريخ</label>
            <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">الحالة</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="all">الكل</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">بحث</label>
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="المريض أو الخدمة..."
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        {/* Row 2: clinic + branch */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">العيادة</label>
            <select value={selectedClinicId} onChange={e => setSelectedClinicId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="all">جميع العيادات</option>
              {clinics.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted-foreground mb-1">الفرع</label>
            <select value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)}
              disabled={selectedClinicId === 'all'}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40 disabled:cursor-not-allowed">
              <option value="all">جميع الفروع</option>
              {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
            </select>
          </div>
        </div>

        {/* Row 3: doctor filter (managers) + quick-date buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => { setFrom(today); setTo(today); }}
            className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">اليوم</button>
          <button onClick={() => {
            const d = new Date(); d.setDate(d.getDate() - d.getDay());
            const sun = d.toISOString().split('T')[0];
            const sat = new Date(d.setDate(d.getDate() + 6)).toISOString().split('T')[0];
            setFrom(sun); setTo(sat);
          }} className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">هذا الأسبوع</button>
          <button onClick={() => {
            const d = new Date(); const y = d.getFullYear(); const m = d.getMonth();
            setFrom(`${y}-${String(m+1).padStart(2,'0')}-01`);
            setTo(new Date(y, m+1, 0).toISOString().split('T')[0]);
          }} className="text-xs px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">هذا الشهر</button>

          {isManager && doctors.length > 0 && (
            <select value={selectedDoctorId} onChange={e => setSelectedDoctorId(e.target.value)}
              className="mr-auto px-3 py-1.5 border border-border rounded-lg bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="all">جميع الأطباء</option>
              {doctors.map(d => <option key={d.id} value={String(d.id)}>{d.user.name} — {d.specialization}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'المجموع',       value: stats.total,     color: 'text-primary' },
          { label: 'مؤكد / انتظار', value: stats.pending,   color: 'text-blue-600' },
          { label: 'مكتمل',         value: stats.completed, color: 'text-green-600' },
          { label: 'ملغى',          value: stats.cancelled, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{isLoading ? '—' : s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Appointments ── */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-28 bg-card border border-border rounded-xl animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">
          <p>{error}</p>
          <button onClick={fetchAppointments} className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm">
            إعادة المحاولة
          </button>
        </div>
      ) : sortedAppointments.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>لا توجد مواعيد في هذه الفترة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedAppointments.map(apt => {
            const isHighlighted = apt.id === highlightId;
            const canAct = apt.status === 'CONFIRMED' || apt.status === 'PENDING';
            return (
              <div
                key={apt.id}
                ref={isHighlighted ? highlightRef : null}
                className={`bg-card rounded-xl border p-4 md:p-5 hover:shadow-md transition-all ${
                  isHighlighted ? 'border-primary ring-2 ring-primary/30 shadow-md' : 'border-border'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Left: info */}
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <UsersIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base truncate">{apt.patientName}</h3>
                      <p className="text-sm text-muted-foreground">{apt.service}</p>
                      <div className="flex flex-wrap gap-3 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-3.5 h-3.5" />{apt.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-3.5 h-3.5" />{apt.date}
                        </span>
                        {apt.patientPhone && <span dir="ltr">{apt.patientPhone}</span>}
                      </div>
                      {apt.notes && (
                        <p className="text-xs mt-2 px-3 py-1.5 bg-secondary rounded-lg border border-border/50">
                          <strong>ملاحظات:</strong> {apt.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: status + actions */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[apt.status] ?? ''}`}>
                      {STATUS_LABELS[apt.status] ?? apt.status}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {canAct && (
                        <>
                          <button onClick={() => updateStatus(apt.id, 'COMPLETED')}
                            disabled={updatingId === apt.id}
                            className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-xs hover:bg-green-200 disabled:opacity-50 transition-colors">
                            مكتمل
                          </button>
                          <button onClick={() => updateStatus(apt.id, 'NO_SHOW')}
                            disabled={updatingId === apt.id}
                            className="px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg text-xs hover:bg-orange-200 disabled:opacity-50 transition-colors">
                            لم يحضر
                          </button>
                        </>
                      )}
                      <a
                        href={`/doctor/patients?search=${encodeURIComponent(apt.patientName)}${selectedClinicId !== 'all' ? `&clinicId=${selectedClinicId}` : ''}${selectedBranchId !== 'all' ? `&branchId=${selectedBranchId}` : ''}`}
                        className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs hover:bg-primary/90 transition-colors"
                      >
                        عرض الحساب
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}