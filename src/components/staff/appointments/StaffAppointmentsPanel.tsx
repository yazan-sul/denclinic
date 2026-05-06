'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { SearchIcon, XIcon, CheckCircleIcon } from '@/components/Icons';
import { formatPhone } from '@/lib/format';
import {
  PHONE_PREFIXES, buildPhone,
  validateNationalId, validateLocalPhone, validateFullName,
} from '@/lib/patientValidation';

// ─── Types ────────────────────────────────────────────────────────────────────

type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED';
type FilterStatus      = 'ALL' | AppointmentStatus;
type BookStep          = 1 | 2 | 3;

interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  doctorName: string;
  serviceName: string;
  branchName: string;
  date: string;
  time: string;
  status: AppointmentStatus;
}

interface PatientResult {
  id: number;
  nationalId: string;
  dateOfBirth: string | null;
  gender: string | null;
  bloodType: string | null;
  user: { id: number; name: string; phoneNumber: string };
}

interface Doctor   { id: number; specialization: string; user: { name: string } }
interface Slot     { id: number; time: string }
interface Service  { id: number; name: string }
interface Clinic   { id: number; name: string }
interface Branch   { id: number; name: string; clinicId: number }

// ─── Config ───────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING:     { label: 'قادم',          className: 'bg-blue-100   dark:bg-blue-900/30   text-blue-700   dark:text-blue-300' },
  CONFIRMED:   { label: 'مؤكد',          className: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' },
  COMPLETED:   { label: 'مكتمل',         className: 'bg-green-100  dark:bg-green-900/30  text-green-700  dark:text-green-300' },
  CANCELLED:   { label: 'ملغي',          className: 'bg-red-100    dark:bg-red-900/30    text-red-700    dark:text-red-300' },
  NO_SHOW:     { label: 'لم يحضر',       className: 'bg-amber-100  dark:bg-amber-900/30  text-amber-700  dark:text-amber-300' },
  RESCHEDULED: { label: 'معاد جدولته',   className: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300' },
};

const filterStatuses: { id: FilterStatus; label: string }[] = [
  { id: 'ALL',         label: 'الكل' },
  { id: 'PENDING',     label: 'قادم' },
  { id: 'CONFIRMED',   label: 'مؤكد' },
  { id: 'COMPLETED',   label: 'مكتمل' },
  { id: 'CANCELLED',   label: 'ملغي' },
  { id: 'NO_SHOW',     label: 'لم يحضر' },
  { id: 'RESCHEDULED', label: 'معاد جدولته' },
];

const todayStr = new Date().toISOString().split('T')[0];

// ─── Helper ───────────────────────────────────────────────────────────────────

function mapApiToAppointment(a: Record<string, unknown>): Appointment {
  const patient = a.patient as { user?: { name?: string; phoneNumber?: string } } | undefined;
  const doctor  = a.doctor  as { user?: { name?: string } } | undefined;
  const service = a.service as { name?: string } | undefined;
  const branch  = a.branch  as { name?: string } | undefined;
  return {
    id:           String(a.id),
    patientName:  patient?.user?.name         ?? '',
    patientPhone: patient?.user?.phoneNumber  ?? '',
    doctorName:   doctor?.user?.name          ?? '',
    serviceName:  service?.name               ?? '',
    branchName:   branch?.name                ?? '',
    date:         String(a.appointmentDate ?? '').split('T')[0],
    time:         String(a.appointmentTime ?? ''),
    status:       (a.status as AppointmentStatus) ?? 'PENDING',
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StaffAppointmentsPanel() {
  // ── Appointments list ────────────────────────────────────────────────────────
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [filterDate,   setFilterDate]   = useState(todayStr);
  const [viewAll,      setViewAll]      = useState(false);
  const [toast,        setToast]        = useState('');

  // ── Cancel modal ─────────────────────────────────────────────────────────────
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling,   setCancelling]   = useState(false);

  // ── Book modal ───────────────────────────────────────────────────────────────
  const [showBook,  setShowBook]  = useState(false);
  const [bookStep,  setBookStep]  = useState<BookStep>(1);
  const [booking,   setBooking]   = useState(false);
  const [bookError, setBookError] = useState('');

  // Step 1 — patient
  const [nidInput,      setNidInput]      = useState('');
  const [searching,     setSearching]     = useState('');   // 'search' | 'creating' | ''
  const [foundPatient,  setFoundPatient]  = useState<PatientResult | null>(null);
  const [createForm,    setCreateForm]    = useState({ name: '', phone: '', dob: '', gender: '', bloodType: '' });
  const [showCreate,    setShowCreate]    = useState(false);

  // Step 2 — slot
  const [clinics,        setClinics]        = useState<Clinic[]>([]);
  const [branches,       setBranches]       = useState<Branch[]>([]);
  const [doctors,        setDoctors]        = useState<Doctor[]>([]);
  const [slots,          setSlots]          = useState<Slot[]>([]);
  const [selectedClinic, setSelectedClinic] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedDate,   setSelectedDate]   = useState(todayStr);
  const [loadingSlots,   setLoadingSlots]   = useState(false);
  const [selectedSlot,   setSelectedSlot]   = useState('');

  // Step 3 — service + notes
  const [services,         setServices]         = useState<Service[]>([]);
  const [selectedService,  setSelectedService]  = useState('');
  const [bookNotes,        setBookNotes]        = useState('');

  // ── Load appointments ────────────────────────────────────────────────────────
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/clinic/records?activeRole=STAFF&pageSize=200', { credentials: 'include' });
      const json = await res.json();
      if (json.success) setAppointments((json.data ?? []).map(mapApiToAppointment));
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  // ── Filtering ────────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return appointments.filter(a => {
      if (search && !a.patientName.includes(search) && !a.patientPhone.includes(search)) return false;
      if (filterStatus !== 'ALL' && a.status !== filterStatus) return false;
      if (!viewAll && a.date !== filterDate) return false;
      return true;
    }).sort((a, b) => a.date !== b.date ? a.date.localeCompare(b.date) : a.time.localeCompare(b.time));
  }, [appointments, search, filterStatus, filterDate, viewAll]);

  // ── Stats for today ──────────────────────────────────────────────────────────
  const todayAppts = appointments.filter(a => a.date === todayStr);
  const stats = {
    scheduled:   todayAppts.filter(a => a.status === 'PENDING' || a.status === 'CONFIRMED').length,
    completed:   todayAppts.filter(a => a.status === 'COMPLETED').length,
    cancelled:   todayAppts.filter(a => a.status === 'CANCELLED' || a.status === 'NO_SHOW').length,
  };

  // ── Toast ────────────────────────────────────────────────────────────────────
  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  // ── Status change ────────────────────────────────────────────────────────────
  const changeStatus = async (id: string, status: AppointmentStatus) => {
    try {
      await fetch(`/api/clinic/records/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, activeRole: 'STAFF' }),
      });
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
      showToast('تم تحديث الحالة');
    } catch { showToast('تعذر التحديث'); }
  };

  // ── Cancel ───────────────────────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await fetch(`/api/bookings/${cancelTarget.id}/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: cancelReason }),
      });
      setAppointments(prev => prev.map(a => a.id === cancelTarget.id ? { ...a, status: 'CANCELLED' } : a));
      setCancelTarget(null);
      setCancelReason('');
      showToast('تم إلغاء الموعد');
    } catch { showToast('تعذر الإلغاء'); }
    finally { setCancelling(false); }
  };

  // ── Book modal helpers ───────────────────────────────────────────────────────
  const openBook = () => {
    setBookStep(1); setNidInput(''); setFoundPatient(null);
    setShowCreate(false); setCreateForm({ name: '', phone: '', dob: '', gender: '', bloodType: '' });
    setSelectedClinic(''); setSelectedBranch(''); setSelectedDoctor('');
    setSelectedDate(todayStr); setSlots([]); setSelectedSlot('');
    setSelectedService(''); setBookNotes(''); setBookError('');
    setShowBook(true);
  };

  // Step 1: search by national ID
  const searchNid = async () => {
    if (!nidInput.trim()) return;
    setSearching('search');
    setFoundPatient(null);
    setShowCreate(false);
    try {
      const res  = await fetch(`/api/clinic/staff-patients?nationalId=${encodeURIComponent(nidInput.trim())}&activeRole=STAFF`, { credentials: 'include' });
      const json = await res.json();
      if (json.success && json.found) {
        setFoundPatient(json.data);
      } else {
        setShowCreate(true);
        setCreateForm(f => ({ ...f }));
      }
    } catch { setBookError('تعذر البحث'); }
    finally { setSearching(''); }
  };

  // Step 1: create patient
  const createPatient = async () => {
    const { name, phone, dob, gender, bloodType } = createForm;
    if (!name.trim() || !phone.trim()) { setBookError('الاسم والهاتف مطلوبان'); return; }
    setSearching('creating');
    setBookError('');
    try {
      const res  = await fetch('/api/clinic/staff-patients?activeRole=STAFF', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nationalId: nidInput.trim(), name: name.trim(), phoneNumber: phone.trim(), dateOfBirth: dob || undefined, gender: gender || undefined, bloodType: bloodType || undefined }),
      });
      const json = await res.json();
      if (json.success) { setFoundPatient(json.data); setShowCreate(false); }
      else setBookError(json.error?.message ?? 'تعذر إنشاء الملف');
    } catch { setBookError('تعذر إنشاء الملف'); }
    finally { setSearching(''); }
  };

  // Step 2: load clinics on open
  useEffect(() => {
    if (!showBook) return;
    fetch('/api/doctor/clinics?activeRole=STAFF', { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success) { setClinics(j.data); if (j.data.length) setSelectedClinic(String(j.data[0].id)); } })
      .catch(() => {});
  }, [showBook]);

  // Step 2: load branches when clinic changes
  useEffect(() => {
    if (!selectedClinic) return;
    fetch(`/api/clinic/branches?clinicId=${selectedClinic}&activeRole=STAFF`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success) { setBranches(j.data); if (j.data.length) setSelectedBranch(String(j.data[0].id)); } })
      .catch(() => {});
  }, [selectedClinic]);

  // Step 2: load doctors when branch changes
  useEffect(() => {
    if (!selectedClinic || !selectedBranch) return;
    fetch(`/api/clinic/doctors?clinicId=${selectedClinic}&branchId=${selectedBranch}&activeRole=STAFF`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success) { setDoctors(j.data); if (j.data.length) setSelectedDoctor(String(j.data[0].id)); } })
      .catch(() => {});
  }, [selectedClinic, selectedBranch]);

  // Step 2: load available slots
  useEffect(() => {
    if (!selectedBranch || !selectedDoctor || !selectedDate) { setSlots([]); return; }
    setLoadingSlots(true);
    setSelectedSlot('');
    fetch(`/api/time-slots?branchId=${selectedBranch}&doctorId=${selectedDoctor}&date=${selectedDate}`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success) setSlots((j.data ?? []).map((s: { id: number; time: string }) => ({ id: s.id, time: s.time }))); })
      .catch(() => {})
      .finally(() => setLoadingSlots(false));
  }, [selectedBranch, selectedDoctor, selectedDate]);

  // Step 3: load services when clinic set
  useEffect(() => {
    if (!selectedClinic) return;
    fetch(`/api/clinic/services?clinicId=${selectedClinic}&activeRole=STAFF`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success) { setServices(j.data); if (j.data.length) setSelectedService(String(j.data[0].id)); } })
      .catch(() => {});
  }, [selectedClinic]);

  // ── Confirm booking ──────────────────────────────────────────────────────────
  const confirmBooking = async () => {
    if (!foundPatient || !selectedSlot || !selectedService) return;
    setBooking(true); setBookError('');
    try {
      const res  = await fetch('/api/clinic/staff-bookings?activeRole=STAFF', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: foundPatient.id, slotId: Number(selectedSlot), serviceId: Number(selectedService), notes: bookNotes }),
      });
      const json = await res.json();
      if (json.success) {
        setShowBook(false);
        showToast('تم حجز الموعد بنجاح');
        fetchAppointments();
      } else {
        setBookError(json.error?.message ?? 'تعذر الحجز');
      }
    } catch { setBookError('تعذر الاتصال بالخادم'); }
    finally { setBooking(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 md:space-y-6" dir="rtl">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border rounded-xl p-3 md:p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">مجدولة اليوم</p>
          <p className="text-xl md:text-2xl font-bold text-blue-600">{stats.scheduled}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 md:p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">مكتملة</p>
          <p className="text-xl md:text-2xl font-bold text-green-600">{stats.completed}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-3 md:p-4 text-center">
          <p className="text-xs text-muted-foreground mb-1">ملغاة / غائب</p>
          <p className="text-xl md:text-2xl font-bold text-red-500">{stats.cancelled}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl">
              <button onClick={() => setViewAll(false)} className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${!viewAll ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>يوم</button>
              <button onClick={() => setViewAll(true)}  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${viewAll  ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>الكل</button>
            </div>
            {!viewAll && (
              <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                className="px-3 py-1.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            )}
          </div>
          <button onClick={openBook}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap">
            + حجز موعد
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[180px]">
            <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="ابحث (اسم، هاتف)..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pr-9 pl-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as FilterStatus)}
            className="px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
            {filterStatuses.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Appointments */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground text-sm">لا توجد مواعيد</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/50">
                    <th className="text-right px-4 py-3 font-semibold">المريض</th>
                    <th className="text-right px-4 py-3 font-semibold">الوقت</th>
                    <th className="text-right px-4 py-3 font-semibold">الخدمة</th>
                    <th className="text-right px-4 py-3 font-semibold">الطبيب</th>
                    {viewAll && <th className="text-right px-4 py-3 font-semibold">التاريخ</th>}
                    <th className="text-right px-4 py-3 font-semibold">الحالة</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(a => (
                    <tr key={a.id} className="border-b border-border/50 hover:bg-secondary/20">
                      <td className="px-4 py-3">
                        <p className="font-medium">{a.patientName}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">{formatPhone(a.patientPhone)}</p>
                      </td>
                      <td className="px-4 py-3 font-mono" dir="ltr">{a.time}</td>
                      <td className="px-4 py-3 text-muted-foreground">{a.serviceName}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{a.doctorName}</td>
                      {viewAll && <td className="px-4 py-3 text-muted-foreground" dir="ltr">{a.date}</td>}
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[a.status]?.className}`}>
                          {statusConfig[a.status]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          {(a.status === 'PENDING' || a.status === 'CONFIRMED') && (
                            <>
                              <button onClick={() => changeStatus(a.id, 'COMPLETED')} className="text-xs text-green-600 hover:underline">إتمام</button>
                              <button onClick={() => changeStatus(a.id, 'NO_SHOW')}   className="text-xs text-amber-600 hover:underline">غائب</button>
                              <button onClick={() => { setCancelTarget(a); setCancelReason(''); }} className="text-xs text-red-500 hover:underline">إلغاء</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {filtered.map(a => (
              <div key={a.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-sm">{a.patientName}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{formatPhone(a.patientPhone)}</p>
                  </div>
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusConfig[a.status]?.className}`}>
                    {statusConfig[a.status]?.label}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>⏰ <span dir="ltr">{a.time}</span></span>
                  {viewAll && <span>📅 <span dir="ltr">{a.date}</span></span>}
                  <span>👨‍⚕️ {a.doctorName}</span>
                  <span>🦷 {a.serviceName}</span>
                </div>
                {(a.status === 'PENDING' || a.status === 'CONFIRMED') && (
                  <div className="flex gap-3 pt-1 border-t border-border/50">
                    <button onClick={() => changeStatus(a.id, 'COMPLETED')} className="text-xs text-green-600 font-medium">إتمام</button>
                    <button onClick={() => changeStatus(a.id, 'NO_SHOW')}   className="text-xs text-amber-600 font-medium">غائب</button>
                    <button onClick={() => { setCancelTarget(a); setCancelReason(''); }} className="text-xs text-red-500 font-medium">إلغاء</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Cancel Modal ── */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm border border-border" dir="rtl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-bold">إلغاء الموعد</h2>
              <button onClick={() => setCancelTarget(null)}><XIcon className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-secondary/40 rounded-xl p-3 text-sm space-y-1">
                <p><span className="text-muted-foreground">المريض: </span>{cancelTarget.patientName}</p>
                <p><span className="text-muted-foreground">الموعد: </span><span dir="ltr">{cancelTarget.date} — {cancelTarget.time}</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">سبب الإلغاء</label>
                <textarea value={cancelReason} onChange={e => setCancelReason(e.target.value)} rows={3} placeholder="أدخل السبب..."
                  className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-border">
              <button onClick={() => setCancelTarget(null)} className="flex-1 py-2 text-sm border border-border rounded-xl hover:bg-secondary">تراجع</button>
              <button onClick={handleCancel} disabled={cancelling} className="flex-1 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50">
                {cancelling ? 'جاري...' : 'تأكيد الإلغاء'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Book Modal ── */}
      {showBook && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg border border-border max-h-[92vh] flex flex-col" dir="rtl">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3">
                {bookStep > 1 && (
                  <button onClick={() => setBookStep(s => (s - 1) as BookStep)} className="text-muted-foreground hover:text-foreground text-sm">→ رجوع</button>
                )}
                <h2 className="font-bold text-base">
                  {bookStep === 1 ? 'الخطوة ١ — تعريف المريض' : bookStep === 2 ? 'الخطوة ٢ — اختيار الموعد' : 'الخطوة ٣ — تأكيد الحجز'}
                </h2>
              </div>
              <button onClick={() => setShowBook(false)}><XIcon className="w-5 h-5" /></button>
            </div>

            {/* Step indicator */}
            <div className="flex gap-1 px-5 pt-3 pb-0 flex-shrink-0">
              {[1,2,3].map(s => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${bookStep >= s ? 'bg-primary' : 'bg-border'}`} />
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* ── Step 1: Patient ── */}
              {bookStep === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">رقم الهوية</label>
                    <div className="flex gap-2">
                      <input value={nidInput} onChange={e => { setNidInput(e.target.value); setFoundPatient(null); setShowCreate(false); }}
                        onKeyDown={e => e.key === 'Enter' && searchNid()}
                        placeholder="أدخل رقم الهوية..."
                        className="flex-1 px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                      <button onClick={searchNid} disabled={!!searching || !nidInput.trim()}
                        className="px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl disabled:opacity-50 hover:bg-primary/90">
                        {searching === 'search' ? '...' : 'بحث'}
                      </button>
                    </div>
                  </div>

                  {/* Found patient card */}
                  {foundPatient && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                      <p className="text-xs text-green-700 dark:text-green-400 font-medium mb-2">✓ تم العثور على المريض</p>
                      <div className="space-y-1 text-sm">
                        <p><span className="text-muted-foreground">الاسم: </span><strong>{foundPatient.user.name}</strong></p>
                        <p><span className="text-muted-foreground">الهاتف: </span><span dir="ltr">{formatPhone(foundPatient.user.phoneNumber)}</span></p>
                        <p><span className="text-muted-foreground">الهوية: </span>{foundPatient.nationalId}</p>
                        {foundPatient.gender && <p><span className="text-muted-foreground">الجنس: </span>{foundPatient.gender === 'male' ? 'ذكر' : 'أنثى'}</p>}
                      </div>
                    </div>
                  )}

                  {/* Create form */}
                  {showCreate && !foundPatient && (
                    <div className="border border-amber-200 dark:border-amber-800 rounded-xl p-4 space-y-3 bg-amber-50/50 dark:bg-amber-900/10">
                      <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">لا يوجد مريض بهذه الهوية — أنشئ ملفاً جديداً</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium mb-1">الاسم الكامل *</label>
                          <input value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} placeholder="الاسم الكامل"
                            className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium mb-1">رقم الهاتف *</label>
                          <input value={createForm.phone} onChange={e => setCreateForm(f => ({ ...f, phone: e.target.value }))} placeholder="05xxxxxxxx" dir="ltr"
                            className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">تاريخ الميلاد</label>
                          <input type="date" value={createForm.dob} onChange={e => setCreateForm(f => ({ ...f, dob: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">الجنس</label>
                          <select value={createForm.gender} onChange={e => setCreateForm(f => ({ ...f, gender: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                            <option value="">اختر</option>
                            <option value="male">ذكر</option>
                            <option value="female">أنثى</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium mb-1">فصيلة الدم</label>
                          <select value={createForm.bloodType} onChange={e => setCreateForm(f => ({ ...f, bloodType: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                            <option value="">اختر</option>
                            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </div>
                      </div>
                      <button onClick={createPatient} disabled={!!searching || !createForm.name.trim() || !createForm.phone.trim()}
                        className="w-full py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50">
                        {searching === 'creating' ? 'جاري الإنشاء...' : 'إنشاء الملف'}
                      </button>
                    </div>
                  )}

                  {bookError && <p className="text-sm text-red-600">{bookError}</p>}
                </>
              )}

              {/* ── Step 2: Slot ── */}
              {bookStep === 2 && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium mb-1">العيادة</label>
                      <select value={selectedClinic} onChange={e => setSelectedClinic(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                        {clinics.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">الفرع</label>
                      <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                        {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">الطبيب</label>
                      <select value={selectedDoctor} onChange={e => setSelectedDoctor(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                        {doctors.map(d => <option key={d.id} value={String(d.id)}>{d.user.name} — {d.specialization}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">التاريخ</label>
                      <input type="date" value={selectedDate} min={todayStr} onChange={e => setSelectedDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium mb-2">المواعيد المتاحة</label>
                    {loadingSlots ? (
                      <div className="flex justify-center py-4"><div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                    ) : slots.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4 border border-border rounded-xl">لا توجد مواعيد متاحة في هذا التاريخ</p>
                    ) : (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {slots.map(s => (
                          <button key={s.id} onClick={() => setSelectedSlot(String(s.id))}
                            className={`py-2.5 rounded-xl text-sm font-mono font-medium border transition-all ${selectedSlot === String(s.id) ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/50 bg-background'}`}>
                            {s.time}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {bookError && <p className="text-sm text-red-600">{bookError}</p>}
                </>
              )}

              {/* ── Step 3: Service + Confirm ── */}
              {bookStep === 3 && (
                <>
                  {/* Summary */}
                  <div className="bg-secondary/40 rounded-xl p-4 text-sm space-y-2">
                    <p><span className="text-muted-foreground">المريض: </span><strong>{foundPatient?.user.name}</strong></p>
                    <p><span className="text-muted-foreground">الطبيب: </span>{doctors.find(d => String(d.id) === selectedDoctor)?.user.name}</p>
                    <p><span className="text-muted-foreground">الموعد: </span><span dir="ltr">{selectedDate} — {slots.find(s => String(s.id) === selectedSlot)?.time}</span></p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">الخدمة *</label>
                    <select value={selectedService} onChange={e => setSelectedService(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                      {services.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">ملاحظات</label>
                    <textarea value={bookNotes} onChange={e => setBookNotes(e.target.value)} rows={3} placeholder="ملاحظات اختيارية..."
                      className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                  </div>
                  {bookError && <p className="text-sm text-red-600">{bookError}</p>}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-border flex-shrink-0">
              <button onClick={() => setShowBook(false)} className="flex-1 py-2.5 text-sm border border-border rounded-xl hover:bg-secondary">إلغاء</button>
              {bookStep < 3 ? (
                <button
                  onClick={() => { setBookError(''); setBookStep(s => (s + 1) as BookStep); }}
                  disabled={
                    (bookStep === 1 && !foundPatient) ||
                    (bookStep === 2 && !selectedSlot)
                  }
                  className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50">
                  التالي
                </button>
              ) : (
                <button onClick={confirmBooking} disabled={booking || !selectedService}
                  className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50">
                  {booking ? 'جاري الحجز...' : 'تأكيد الحجز'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
