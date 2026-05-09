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

interface Doctor   { id: number; specialization: string; user: { id: number; name: string } }
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
  const [createForm,    setCreateForm]    = useState({ name: '', phoneLocal: '', dob: '', gender: '', bloodType: '' });
  const [phonePrefix,   setPhonePrefix]   = useState(PHONE_PREFIXES[0].code);
  const [createErrors,  setCreateErrors]  = useState<{ name?: string; phone?: string; dob?: string }>({});
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
    setShowCreate(false); setCreateForm({ name: '', phoneLocal: '', dob: '', gender: '', bloodType: '' });
    setPhonePrefix(PHONE_PREFIXES[0].code); setCreateErrors({});
    setSelectedClinic(''); setSelectedBranch(''); setSelectedDoctor('');
    setSelectedDate(todayStr); setSlots([]); setSelectedSlot('');
    setSelectedService(''); setBookNotes(''); setBookError('');
    setShowBook(true);
  };

  // Step 1: search by national ID
  const searchNid = async () => {
    const nid = nidInput.trim();
    const validationError = validateNationalId(nid);
    if (validationError) { setBookError(validationError); return; }
    setBookError('');
    setSearching('search');
    setFoundPatient(null);
    setShowCreate(false);
    try {
      const res  = await fetch(`/api/clinic/staff-patients?nationalId=${encodeURIComponent(nid)}&activeRole=STAFF`, { credentials: 'include' });
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
    const { name, phoneLocal, dob, gender, bloodType } = createForm;

    // Validate all fields
    const errors: { name?: string; phone?: string; dob?: string } = {};
    const nameErr = validateFullName(name);
    if (nameErr) errors.name = nameErr;
    const phoneErr = validateLocalPhone(phoneLocal);
    if (phoneErr) errors.phone = phoneErr;
    if (dob && new Date(dob) > new Date()) errors.dob = 'تاريخ الميلاد لا يمكن أن يكون في المستقبل';
    setCreateErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const fullPhone = buildPhone(phonePrefix, phoneLocal);
    setSearching('creating');
    setBookError('');
    try {
      const res  = await fetch('/api/clinic/staff-patients?activeRole=STAFF', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nationalId: nidInput.trim(), name: name.trim(), phoneNumber: fullPhone, dateOfBirth: dob || undefined, gender: gender || undefined, bloodType: bloodType || undefined }),
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

  // Step 2: load doctors when branch changes — exclude the patient if they are also a doctor
  useEffect(() => {
    if (!selectedClinic || !selectedBranch) return;
    fetch(`/api/clinic/doctors?clinicId=${selectedClinic}&branchId=${selectedBranch}&activeRole=STAFF`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        if (!j.success) return;
        const patientUserId = foundPatient?.user.id ?? null;
        const filtered: Doctor[] = patientUserId
          ? (j.data as Doctor[]).filter(d => d.user.id !== patientUserId)
          : j.data;
        setDoctors(filtered);
        if (filtered.length) setSelectedDoctor(String(filtered[0].id));
        else setSelectedDoctor('');
      })
      .catch(() => {});
  }, [selectedClinic, selectedBranch, foundPatient]);

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
              <h2 className="font-bold text-base">
                {bookStep === 1 ? 'تعريف المريض' : bookStep === 2 ? 'اختيار الموعد' : 'تأكيد الحجز'}
              </h2>
              <button onClick={() => setShowBook(false)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Step indicator */}
            <div className="flex items-start px-6 pt-4 pb-2 flex-shrink-0">
              {([
                { n: 1, label: 'المريض' },
                { n: 2, label: 'الموعد' },
                { n: 3, label: 'التأكيد' },
              ] as { n: BookStep; label: string }[]).map(({ n, label }, i) => (
                <span key={n} className="contents">
                  {/* Circle + label */}
                  <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                      ${bookStep > n
                        ? 'bg-primary text-white'
                        : bookStep === n
                          ? 'bg-primary text-white ring-4 ring-primary/20'
                          : 'bg-muted text-muted-foreground border border-border'
                      }`}>
                      {bookStep > n ? '✓' : n}
                    </div>
                    <span className={`text-[10px] font-medium whitespace-nowrap transition-colors ${bookStep >= n ? 'text-primary' : 'text-muted-foreground'}`}>
                      {label}
                    </span>
                  </div>
                  {/* Connector line between circles */}
                  {i < 2 && (
                    <div className={`flex-1 h-0.5 mt-3.5 mx-1 rounded-full transition-colors ${bookStep > n ? 'bg-primary' : 'bg-border'}`} />
                  )}
                </span>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* ── Step 1: Patient ── */}
              {bookStep === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      رقم الهوية الفلسطينية
                      <span className="text-xs text-muted-foreground font-normal mr-1">(9 أرقام)</span>
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={nidInput}
                        onChange={e => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 9);
                          setNidInput(val);
                          setFoundPatient(null);
                          setShowCreate(false);
                          setBookError('');
                        }}
                        onKeyDown={e => e.key === 'Enter' && searchNid()}
                        placeholder="أدخل رقم الهوية (9 أرقام)"
                        inputMode="numeric"
                        maxLength={9}
                        dir="ltr"
                        className="flex-1 px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary font-mono tracking-widest"
                      />
                      <button
                        onClick={searchNid}
                        disabled={!!searching || nidInput.length !== 9}
                        className="px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl disabled:opacity-50 hover:bg-primary/90"
                      >
                        {searching === 'search' ? '...' : 'بحث'}
                      </button>
                    </div>
                    {nidInput.length > 0 && nidInput.length < 9 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {nidInput.length}/9 أرقام
                      </p>
                    )}
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

                        {/* Full name — quadruple */}
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium mb-1">
                            الاسم الكامل *
                            <span className="text-muted-foreground font-normal mr-1">(رباعي)</span>
                          </label>
                          <input
                            value={createForm.name}
                            onChange={e => {
                              setCreateForm(f => ({ ...f, name: e.target.value }));
                              setCreateErrors(er => ({ ...er, name: undefined }));
                            }}
                            placeholder="الاسم الأول الثاني الثالث الرابع"
                            className={`w-full px-3 py-2 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary ${createErrors.name ? 'border-red-400' : 'border-border'}`}
                          />
                          {createErrors.name && <p className="text-xs text-red-500 mt-1">{createErrors.name}</p>}
                        </div>

                        {/* Phone with country prefix */}
                        <div className="sm:col-span-2">
                          <label className="block text-xs font-medium mb-1">رقم الهاتف *</label>
                          <div className="flex gap-2" dir="ltr">
                            <select
                              value={phonePrefix}
                              onChange={e => setPhonePrefix(e.target.value)}
                              className="px-2 py-2 text-xs border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary flex-shrink-0"
                            >
                              {PHONE_PREFIXES.map(p => (
                                <option key={p.code} value={p.code}>+{p.code}</option>
                              ))}
                            </select>
                            <input
                              value={createForm.phoneLocal}
                              onChange={e => {
                                const val = e.target.value.replace(/\D/g, '');
                                setCreateForm(f => ({ ...f, phoneLocal: val }));
                                setCreateErrors(er => ({ ...er, phone: undefined }));
                              }}
                              placeholder="5xxxxxxxx"
                              inputMode="numeric"
                              className={`flex-1 px-3 py-2 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary ${createErrors.phone ? 'border-red-400' : 'border-border'}`}
                            />
                          </div>
                          {createErrors.phone && <p className="text-xs text-red-500 mt-1">{createErrors.phone}</p>}
                        </div>

                        {/* Date of birth — no future dates */}
                        <div>
                          <label className="block text-xs font-medium mb-1">تاريخ الميلاد</label>
                          <input
                            type="date"
                            value={createForm.dob}
                            max={todayStr}
                            onChange={e => {
                              setCreateForm(f => ({ ...f, dob: e.target.value }));
                              setCreateErrors(er => ({ ...er, dob: undefined }));
                            }}
                            className={`w-full px-3 py-2 text-sm border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary ${createErrors.dob ? 'border-red-400' : 'border-border'}`}
                          />
                          {createErrors.dob && <p className="text-xs text-red-500 mt-1">{createErrors.dob}</p>}
                        </div>

                        {/* Gender */}
                        <div>
                          <label className="block text-xs font-medium mb-1">الجنس</label>
                          <select value={createForm.gender} onChange={e => setCreateForm(f => ({ ...f, gender: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                            <option value="">اختر</option>
                            <option value="male">ذكر</option>
                            <option value="female">أنثى</option>
                          </select>
                        </div>

                        {/* Blood type */}
                        <div>
                          <label className="block text-xs font-medium mb-1">فصيلة الدم</label>
                          <select value={createForm.bloodType} onChange={e => setCreateForm(f => ({ ...f, bloodType: e.target.value }))}
                            className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                            <option value="">اختر</option>
                            {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                        </div>
                      </div>

                      <button
                        onClick={createPatient}
                        disabled={!!searching || !createForm.name.trim() || !createForm.phoneLocal.trim()}
                        className="w-full py-2.5 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50"
                      >
                        {searching === 'creating' ? 'جاري الإنشاء...' : 'إنشاء الملف'}
                      </button>
                    </div>
                  )}

                  {bookError && <p className="text-sm text-red-600">{bookError}</p>}
                </>
              )}

              {/* ── Step 2: Service + Slot ── */}
              {bookStep === 2 && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Clinic */}
                    <div>
                      <label className="block text-xs font-medium mb-1">العيادة</label>
                      <select value={selectedClinic} onChange={e => setSelectedClinic(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                        {clinics.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                      </select>
                    </div>

                    {/* Branch */}
                    <div>
                      <label className="block text-xs font-medium mb-1">الفرع</label>
                      <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                        {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                      </select>
                    </div>

                    {/* Service — selected first */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium mb-1">الخدمة *</label>
                      {services.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-muted-foreground border border-border rounded-xl">جاري التحميل...</p>
                      ) : (
                        <select
                          value={selectedService}
                          onChange={e => {
                            setSelectedService(e.target.value);
                            setSelectedSlot('');
                          }}
                          className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="">— اختر الخدمة —</option>
                          {services.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                        </select>
                      )}
                    </div>

                    {/* Doctor */}
                    <div>
                      <label className="block text-xs font-medium mb-1">الطبيب</label>
                      {doctors.length === 0 ? (
                        <p className="px-3 py-2 text-sm text-amber-600 border border-amber-200 dark:border-amber-800 rounded-xl bg-amber-50 dark:bg-amber-900/10">
                          لا يوجد أطباء متاحون في هذا الفرع
                        </p>
                      ) : (
                        <select
                          value={selectedDoctor}
                          onChange={e => { setSelectedDoctor(e.target.value); setSelectedSlot(''); }}
                          className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        >
                          {doctors.map(d => <option key={d.id} value={String(d.id)}>{d.user.name} — {d.specialization}</option>)}
                        </select>
                      )}
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-xs font-medium mb-1">التاريخ</label>
                      <input type="date" value={selectedDate} min={todayStr} onChange={e => setSelectedDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                    </div>
                  </div>

                  {/* Available slots — appear after service + doctor selected */}
                  {selectedService && selectedDoctor && (
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
                  )}

                  {bookError && <p className="text-sm text-red-600">{bookError}</p>}
                </>
              )}

              {/* ── Step 3: Notes + Confirm ── */}
              {bookStep === 3 && (
                <>
                  {/* Summary */}
                  <div className="bg-secondary/40 rounded-xl p-4 text-sm space-y-2">
                    <p><span className="text-muted-foreground">المريض: </span><strong>{foundPatient?.user.name}</strong></p>
                    <p><span className="text-muted-foreground">الخدمة: </span>{services.find(s => String(s.id) === selectedService)?.name}</p>
                    <p><span className="text-muted-foreground">الطبيب: </span>{doctors.find(d => String(d.id) === selectedDoctor)?.user.name}</p>
                    <p><span className="text-muted-foreground">الموعد: </span><span dir="ltr">{selectedDate} — {slots.find(s => String(s.id) === selectedSlot)?.time}</span></p>
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
              {bookStep === 1 ? (
                <button onClick={() => setShowBook(false)} className="flex-1 py-2.5 text-sm border border-border rounded-xl hover:bg-secondary">
                  إلغاء
                </button>
              ) : (
                <button
                  onClick={() => { setBookError(''); setBookStep(s => (s - 1) as BookStep); }}
                  className="flex-1 py-2.5 text-sm border border-border rounded-xl hover:bg-secondary flex items-center justify-center gap-1"
                >
                  <span>→</span> السابق
                </button>
              )}
              {bookStep < 3 ? (
                <button
                  onClick={() => { setBookError(''); setBookStep(s => (s + 1) as BookStep); }}
                  disabled={
                    (bookStep === 1 && !foundPatient) ||
                    (bookStep === 2 && (!selectedService || !selectedSlot || !selectedDoctor || doctors.length === 0))
                  }
                  className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50"
                >
                  التالي
                </button>
              ) : (
                <button onClick={confirmBooking} disabled={booking}
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
