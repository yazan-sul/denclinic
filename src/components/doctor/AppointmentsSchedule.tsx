'use client';

import { useState, useEffect, useCallback, useContext, useRef, useMemo } from 'react';
import { CalendarIcon, ClockIcon, UsersIcon } from '@/components/Icons';
import { AuthContext } from '@/context/AuthContext';
import { formatPhone } from '@/lib/format';
import { useActiveRole } from '@/context/ActiveRoleContext';
import dynamic from 'next/dynamic';

const CreateLabOrderModal = dynamic(() => import('@/components/doctor/lab/CreateLabOrderModal'), { ssr: false });

function rp(lr: string | null) { return lr === 'STAFF' ? '&activeRole=STAFF' : ''; }

// ── Types ─────────────────────────────────────────────────────────────────────

interface Appointment {
  id: string;
  patientId: number;
  clinicId: number;
  branchId: number;
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
  const layoutRole   = useActiveRole();
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
  const [appointments,  setAppointments]  = useState<Appointment[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [updatingId,    setUpdatingId]    = useState<string | null>(null);
  const [labOrderApt,   setLabOrderApt]   = useState<Appointment | null>(null);

  // Highlight scroll
  const highlightRef = useRef<HTMLDivElement>(null);

  // ── Load clinics ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`/api/doctor/clinics?${rp(layoutRole).slice(1)}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => { if (json.success) setClinics(json.data); })
      .catch(() => {});
  }, [layoutRole]);

  // ── Load branches when clinic changes ───────────────────────────────────────
  useEffect(() => {
    setBranches([]);
    setSelectedBranchId('all');
    if (selectedClinicId === 'all') return;
    fetch(`/api/clinic/branches?clinicId=${selectedClinicId}${rp(layoutRole)}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => { if (json.success) setBranches(json.data); })
      .catch(() => {});
  }, [selectedClinicId, layoutRole]);

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
      if (layoutRole === 'STAFF')                  params.set('activeRole', 'STAFF');

      const res  = await fetch(`/api/clinic/records?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'فشل تحميل المواعيد');

      const mapped: Appointment[] = json.data.map((apt: any) => ({
        id:           apt.id,
        patientId:    apt.patient?.id               ?? 0,
        clinicId:     apt.clinic?.id                ?? 0,
        branchId:     apt.branch?.id                ?? 0,
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
    <>
    <div className="space-y-5">

      {/* ── Filters ── */}
      <div className="bg-card rounded-xl border border-border p-3 md:p-4 space-y-2 md:space-y-3">

        {/* Row 1: 4 cols — من تاريخ | إلى تاريخ | الحالة | بحث */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
          <div>
            <label className="block text-[9px] md:text-[10px] text-muted-foreground mb-0.5 md:mb-1">من تاريخ</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="w-full px-2 py-1 md:py-1.5 border border-border rounded-lg bg-background text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-[9px] md:text-[10px] text-muted-foreground mb-0.5 md:mb-1">إلى تاريخ</label>
            <input type="date" value={to} min={from} onChange={e => setTo(e.target.value)}
              className="w-full px-2 py-1 md:py-1.5 border border-border rounded-lg bg-background text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="block text-[9px] md:text-[10px] text-muted-foreground mb-0.5 md:mb-1">الحالة</label>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="w-full px-2 py-1 md:py-1.5 border border-border rounded-lg bg-background text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="all">كل الحالات</option>
              {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] md:text-[10px] text-muted-foreground mb-0.5 md:mb-1">بحث</label>
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="المريض..."
              className="w-full px-2 py-1 md:py-1.5 border border-border rounded-lg bg-background text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        {/* Row 2: 3 cols — العيادة | الفرع | الطبيب */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
          <div>
            <label className="block text-[9px] md:text-[10px] text-muted-foreground mb-0.5 md:mb-1">العيادة</label>
            <select value={selectedClinicId} onChange={e => setSelectedClinicId(e.target.value)}
              className="w-full px-2 py-1 md:py-1.5 border border-border rounded-lg bg-background text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="all">جميع العيادات</option>
              {clinics.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] md:text-[10px] text-muted-foreground mb-0.5 md:mb-1">الفرع</label>
            <select value={selectedBranchId} onChange={e => setSelectedBranchId(e.target.value)}
              disabled={selectedClinicId === 'all'}
              className="w-full px-2 py-1 md:py-1.5 border border-border rounded-lg bg-background text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40 disabled:cursor-not-allowed">
              <option value="all">جميع الفروع</option>
              {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
            </select>
          </div>
          {isManager && (
            <div>
              <label className="block text-[9px] md:text-[10px] text-muted-foreground mb-0.5 md:mb-1">الطبيب</label>
              <select value={selectedDoctorId} onChange={e => setSelectedDoctorId(e.target.value)}
                className="w-full px-2 py-1 md:py-1.5 border border-border rounded-lg bg-background text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="all">جميع الأطباء</option>
                {doctors.map(d => <option key={d.id} value={String(d.id)}>{d.user.name} — {d.specialization}</option>)}
              </select>
            </div>
          )}
        </div>

        {/* Row 3: أزرار سريعة + تنظيف */}
        <div className="flex flex-wrap items-center gap-1 md:gap-2 border-t border-border/50 pt-2 md:pt-3">
          <span className="text-[9px] md:text-[10px] text-muted-foreground">اختصار:</span>
          <button onClick={() => { setFrom(today); setTo(today); }}
            className="text-xs px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors whitespace-nowrap">اليوم</button>
          <button onClick={() => {
            const d = new Date(); d.setDate(d.getDate() - d.getDay());
            const sun = d.toISOString().split('T')[0];
            const sat = new Date(d.setDate(d.getDate() + 6)).toISOString().split('T')[0];
            setFrom(sun); setTo(sat);
          }} className="text-xs px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors whitespace-nowrap">أسبوع</button>
          <button onClick={() => {
            const d = new Date(); const y = d.getFullYear(); const m = d.getMonth();
            setFrom(`${y}-${String(m+1).padStart(2,'0')}-01`);
            setTo(new Date(y, m+1, 0).toISOString().split('T')[0]);
          }} className="text-xs px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors whitespace-nowrap">شهر</button>
          <button onClick={() => {
            setFrom(today); setTo(today);
            setFilterStatus('all'); setSearchInput('');
            setSelectedClinicId('all'); setSelectedBranchId('all'); setSelectedDoctorId('all');
          }} className="text-xs px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors whitespace-nowrap ml-auto md:ml-1">تنظيف</button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
        {[
          { label: 'المجموع',       value: stats.total,     color: 'text-primary' },
          { label: 'مؤكد / انتظار', value: stats.pending,   color: 'text-blue-600' },
          { label: 'مكتمل',         value: stats.completed, color: 'text-green-600' },
          { label: 'ملغى',          value: stats.cancelled, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="bg-card rounded-xl border border-border p-2 md:p-4 text-center">
            <p className={`text-lg md:text-2xl font-bold ${s.color}`}>{isLoading ? '—' : s.value}</p>
            <p className="text-xs md:text-sm text-muted-foreground mt-0.5 md:mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Appointments ── */}
      {isLoading ? (
        <div className="space-y-2 md:space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 md:h-28 bg-card border border-border rounded-xl animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="text-center py-8 md:py-12 text-destructive">
          <p className="text-sm md:text-base">{error}</p>
          <button onClick={fetchAppointments} className="mt-3 px-3 md:px-4 py-1.5 md:py-2 bg-primary text-primary-foreground rounded-lg text-xs md:text-sm font-medium">
            إعادة المحاولة
          </button>
        </div>
      ) : sortedAppointments.length === 0 ? (
        <div className="text-center py-8 md:py-12 text-muted-foreground">
          <CalendarIcon className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 md:mb-3 opacity-50" />
          <p className="text-sm md:text-base">لا توجد مواعيد في هذه الفترة</p>
        </div>
      ) : (
        <div className="space-y-2 md:space-y-3">
          {sortedAppointments.map(apt => {
            const isHighlighted = apt.id === highlightId;
            const canAct = apt.status === 'CONFIRMED' || apt.status === 'PENDING';
            return (
              <div
                key={apt.id}
                ref={isHighlighted ? highlightRef : null}
                className={`bg-card rounded-xl border p-3 md:p-4 md:p-5 hover:shadow-md transition-all ${
                  isHighlighted ? 'border-primary ring-2 ring-primary/30 shadow-md' : 'border-border'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
                  {/* Left: info */}
                  <div className="flex items-start gap-2 md:gap-4 flex-1 min-w-0">
                    <div className="w-8 h-8 md:w-12 md:h-12 bg-primary/10 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0">
                      <UsersIcon className="w-4 h-4 md:w-6 md:h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm md:text-base truncate">{apt.patientName}</h3>
                      <p className="text-xs md:text-sm text-muted-foreground">{apt.service}</p>
                      <div className="flex flex-wrap gap-2 md:gap-3 mt-0.5 md:mt-1 text-xs md:text-sm text-muted-foreground">
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <ClockIcon className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0" />{apt.time}
                        </span>
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <CalendarIcon className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0" />{apt.date}
                        </span>
                        {apt.patientPhone && <span className="font-mono text-xs" dir="ltr">{formatPhone(apt.patientPhone)}</span>}
                      </div>
                      {apt.notes && (
                        <p className="text-xs mt-1 md:mt-2 px-2 md:px-3 py-0.5 md:py-1.5 bg-secondary rounded-lg border border-border/50">
                          <strong>ملاحظات:</strong> {apt.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: status + actions */}
                  <div className="flex items-center justify-between md:flex-col md:items-end gap-2 flex-shrink-0">
                    <span className={`px-2 md:px-3 py-0.5 md:py-1 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLORS[apt.status] ?? ''}`}>
                      {STATUS_LABELS[apt.status] ?? apt.status}
                    </span>
                    <div className="flex gap-1 md:gap-2 flex-wrap justify-end">
                      {canAct && (
                        <>
                          <button onClick={() => updateStatus(apt.id, 'COMPLETED')}
                            disabled={updatingId === apt.id}
                            className="px-2 md:px-3 py-0.5 md:py-1 bg-green-100 text-green-700 rounded-lg text-xs hover:bg-green-200 disabled:opacity-50 transition-colors font-medium">
                            ✓
                          </button>
                          <button onClick={() => updateStatus(apt.id, 'NO_SHOW')}
                            disabled={updatingId === apt.id}
                            className="px-2 md:px-3 py-0.5 md:py-1 bg-orange-100 text-orange-700 rounded-lg text-xs hover:bg-orange-200 disabled:opacity-50 transition-colors font-medium">
                            ✕
                          </button>
                        </>
                      )}
                      {apt.status !== 'CANCELLED' && apt.status !== 'NO_SHOW' && (
                        <button onClick={() => setLabOrderApt(apt)}
                          className="px-2 md:px-3 py-0.5 md:py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-xs hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors font-medium whitespace-nowrap">
                          🔬 طلب مختبر
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>

    {labOrderApt && (() => {
      const apt = labOrderApt;
      return (
        <CreateLabOrderModal
          onClose={() => setLabOrderApt(null)}
          onSaved={() => setLabOrderApt(null)}
          defaultClinicId={apt.clinicId ? String(apt.clinicId) : undefined}
          defaultBranchId={apt.branchId ? String(apt.branchId) : undefined}
          defaultPatient={apt.patientId ? {
            id:          apt.patientId,
            name:        apt.patientName,
            phoneNumber: apt.patientPhone,
          } : undefined}
          defaultAppointmentId={apt.id}
        />
      );
    })()}
    </>
  );
}