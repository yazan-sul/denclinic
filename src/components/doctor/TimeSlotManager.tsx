'use client';

import { useState, useEffect, useCallback } from 'react';
import { ClockIcon, CalendarIcon, CheckCircleIcon } from '@/components/Icons';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Clinic  { id: number; name: string }
interface Branch  { id: number; name: string; address: string }
interface Service { id: number; name: string; estimatedDuration: number | null }

interface Period { id: number; startTime: string; endTime: string }

interface ExistingSlot {
  id: number;
  slotDate: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  branch: { id: number; name: string; clinic: { id: number; name: string } };
  appointment: { id: string; status: string } | null;
}

type Mode = 'single' | 'range' | 'weekly';

const WEEKDAY_LABELS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

const todayStr = new Date().toISOString().split('T')[0];

// ─── Component ────────────────────────────────────────────────────────────────

export default function TimeSlotManager() {
  // Clinic / Branch
  const [clinics,           setClinics]           = useState<Clinic[]>([]);
  const [selectedClinicId,  setSelectedClinicId]  = useState<string>('');
  const [branches,          setBranches]           = useState<Branch[]>([]);
  const [selectedBranchId,  setSelectedBranchId]  = useState<string>('');

  // Services
  const [clinicServices,   setClinicServices]    = useState<Service[]>([]);
  const [offeredServiceIds,setOfferedServiceIds] = useState<Set<number>>(new Set());
  const [savingServices,   setSavingServices]    = useState(false);
  const [servicesSaved,    setServicesSaved]     = useState(false);

  // Schedule form
  const [mode,       setMode]       = useState<Mode>('single');
  const [startDate,  setStartDate]  = useState(todayStr);
  const [endDate,    setEndDate]    = useState(todayStr);
  const [weekdays,   setWeekdays]   = useState<Set<number>>(new Set([0, 1, 2, 3, 4]));
  const [periods,    setPeriods]    = useState<Period[]>([{ id: 1, startTime: '09:00', endTime: '12:00' }]);
  const [apptDur,    setApptDur]    = useState<number>(30);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg,  setSubmitMsg]  = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Existing slots calendar
  const [calendarDate,   setCalendarDate]   = useState(new Date());
  const [existingSlots,  setExistingSlots]  = useState<ExistingSlot[]>([]);
  const [viewDate,       setViewDate]       = useState<string | null>(null);
  const [deletingId,     setDeletingId]     = useState<number | null>(null);
  const [cancelFrom,     setCancelFrom]     = useState('');
  const [cancelTo,       setCancelTo]       = useState('');
  const [cancelling,     setCancelling]     = useState(false);
  const [cancelMsg,      setCancelMsg]      = useState<string | null>(null);

  // ── Load clinics ────────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/doctor/clinics', { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data.length > 0) {
          setClinics(json.data);
          setSelectedClinicId(String(json.data[0].id));
        }
      }).catch(() => {});
  }, []);

  // ── Load branches when clinic changes ───────────────────────────────────────
  useEffect(() => {
    if (!selectedClinicId) return;
    setBranches([]);
    setSelectedBranchId('');
    fetch(`/api/clinic/branches?clinicId=${selectedClinicId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data.length > 0) {
          setBranches(json.data);
          setSelectedBranchId(String(json.data[0].id));
        }
      }).catch(() => {});
  }, [selectedClinicId]);

  // ── Load clinic services + doctor's current offered services ────────────────
  useEffect(() => {
    if (!selectedClinicId) return;
    Promise.all([
      fetch('/api/clinic/services', { credentials: 'include' }).then(r => r.json()),
      fetch('/api/doctor/services', { credentials: 'include' }).then(r => r.json()),
    ]).then(([allSvcs, offeredSvcs]) => {
      if (allSvcs.success)     setClinicServices(allSvcs.data);
      if (offeredSvcs.success) setOfferedServiceIds(new Set(offeredSvcs.data.map((s: Service) => s.id)));
    }).catch(() => {});
  }, [selectedClinicId]);

  // ── Load existing slots for calendar month ──────────────────────────────────
  const fetchSlots = useCallback(async () => {
    const y = calendarDate.getFullYear();
    const m = String(calendarDate.getMonth() + 1).padStart(2, '0');
    const from = `${y}-${m}-01`;
    const lastDay = new Date(y, calendarDate.getMonth() + 1, 0).getDate();
    const to = `${y}-${m}-${String(lastDay).padStart(2, '0')}`;
    try {
      const res = await fetch(`/api/doctor/slots?from=${from}&to=${to}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) setExistingSlots(json.data);
    } catch { /* silent */ }
  }, [calendarDate]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const toggleWeekday = (day: number) => {
    setWeekdays(prev => {
      const next = new Set(prev);
      next.has(day) ? next.delete(day) : next.add(day);
      return next;
    });
  };

  const addPeriod = () => {
    setPeriods(prev => [...prev, { id: Date.now(), startTime: '13:00', endTime: '17:00' }]);
  };

  const updatePeriod = (id: number, field: 'startTime' | 'endTime', value: string) => {
    setPeriods(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const removePeriod = (id: number) => {
    setPeriods(prev => prev.filter(p => p.id !== id));
  };

  const toggleService = (id: number) => {
    setOfferedServiceIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Save offered services ───────────────────────────────────────────────────
  const saveServices = async () => {
    setSavingServices(true);
    try {
      const res = await fetch('/api/doctor/services', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceIds: [...offeredServiceIds] }),
      });
      const json = await res.json();
      if (json.success) { setServicesSaved(true); setTimeout(() => setServicesSaved(false), 3000); }
    } catch { /* silent */ } finally { setSavingServices(false); }
  };

  // ── Submit schedule ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedBranchId) { setSubmitMsg({ type: 'error', text: 'يرجى اختيار الفرع' }); return; }
    if (periods.length === 0) { setSubmitMsg({ type: 'error', text: 'يرجى إضافة فترة عمل واحدة على الأقل' }); return; }
    if (mode === 'weekly' && weekdays.size === 0) { setSubmitMsg({ type: 'error', text: 'يرجى اختيار أيام الأسبوع' }); return; }

    setSubmitting(true);
    setSubmitMsg(null);
    try {
      const res = await fetch('/api/doctor/slots', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: Number(selectedBranchId),
          mode,
          startDate,
          endDate: mode === 'single' ? startDate : endDate,
          weekdays: mode === 'weekly' ? [...weekdays] : undefined,
          periods: periods.map(p => ({ startTime: p.startTime, endTime: p.endTime })),
          appointmentDuration: apptDur,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSubmitMsg({ type: 'success', text: json.message });
        fetchSlots();
      } else {
        setSubmitMsg({ type: 'error', text: json.error?.message || 'حدث خطأ' });
      }
    } catch { setSubmitMsg({ type: 'error', text: 'تعذر الاتصال بالخادم' }); }
    finally { setSubmitting(false); }
  };

  // ── Bulk cancel unbooked slots in a time range ──────────────────────────────
  const cancelPeriod = async () => {
    if (!viewDate) return;
    setCancelling(true);
    setCancelMsg(null);
    try {
      const res = await fetch('/api/doctor/slots', {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: viewDate, fromTime: cancelFrom || undefined, toTime: cancelTo || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        setCancelMsg(json.message);
        fetchSlots();
        setExistingSlots(prev => prev.filter(s => {
          const t = s.startTime;
          const inRange = (!cancelFrom || t >= cancelFrom) && (!cancelTo || t < cancelTo);
          return !(s.slotDate.split('T')[0] === viewDate && inRange && !s.appointment);
        }));
      } else {
        setCancelMsg(json.error?.message || 'حدث خطأ');
      }
    } catch { setCancelMsg('تعذر الاتصال بالخادم'); }
    finally { setCancelling(false); }
  };

  // ── Delete slot ─────────────────────────────────────────────────────────────
  const deleteSlot = async (id: number) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/doctor/slots/${id}`, { method: 'DELETE', credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setExistingSlots(prev => prev.filter(s => s.id !== id));
      } else {
        alert(json.error?.message || 'تعذر الحذف');
      }
    } catch { alert('تعذر الاتصال بالخادم'); }
    finally { setDeletingId(null); }
  };

  // ── Calendar helpers ────────────────────────────────────────────────────────
  const daysInMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1).getDay();

  const slotsByDate = existingSlots.reduce<Record<string, ExistingSlot[]>>((acc, s) => {
    const d = s.slotDate.split('T')[0];
    (acc[d] ||= []).push(s);
    return acc;
  }, {});

  const formatCalDay = (day: number) => {
    const y = calendarDate.getFullYear();
    const m = String(calendarDate.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}-${String(day).padStart(2, '0')}`;
  };

  const viewSlots = viewDate ? (slotsByDate[viewDate] ?? []) : [];

  // ── Slot count preview ──────────────────────────────────────────────────────
  function countExpectedSlots(): number {
    let count = 0;
    for (const p of periods) {
      const [sh, sm] = p.startTime.split(':').map(Number);
      const [eh, em] = p.endTime.split(':').map(Number);
      const mins = (eh * 60 + em) - (sh * 60 + sm);
      if (mins > 0) count += Math.floor(mins / apptDur);
    }
    return count;
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" dir="rtl">

      {/* ── Clinic & Branch ── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">١</span>
          العيادة والفرع
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">العيادة</label>
            <select
              value={selectedClinicId}
              onChange={e => setSelectedClinicId(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {clinics.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">الفرع</label>
            <select
              value={selectedBranchId}
              onChange={e => setSelectedBranchId(e.target.value)}
              disabled={!branches.length}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50"
            >
              <option value="">اختر الفرع</option>
              {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* ── Services ── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">٢</span>
          الخدمات المقدَّمة
          <span className="text-xs text-muted-foreground font-normal">(المريض يرى الأطباء بناءً على هذه الخدمات)</span>
        </h3>

        {clinicServices.length === 0 ? (
          <p className="text-sm text-muted-foreground">لا توجد خدمات في هذه العيادة</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {clinicServices.map(svc => {
              const checked = offeredServiceIds.has(svc.id);
              return (
                <button
                  key={svc.id}
                  onClick={() => toggleService(svc.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                    checked
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:border-primary/50'
                  }`}
                >
                  {checked && <span className="ml-1">✓</span>}
                  {svc.name}
                  {svc.estimatedDuration && <span className="opacity-70 mr-1">({svc.estimatedDuration} د)</span>}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-3 pt-1">
          <button
            onClick={saveServices}
            disabled={savingServices}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {savingServices ? 'جاري الحفظ...' : 'حفظ الخدمات'}
          </button>
          {servicesSaved && (
            <span className="text-sm text-green-600 flex items-center gap-1">
              <CheckCircleIcon className="w-4 h-4" /> تم الحفظ
            </span>
          )}
        </div>
      </div>

      {/* ── Schedule Form ── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-5">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">٣</span>
          إضافة مواعيد عمل
        </h3>

        {/* Mode tabs */}
        <div className="flex bg-secondary/50 rounded-lg p-1 gap-1">
          {([
            ['single',  'يوم واحد'],
            ['range',   'نطاق تواريخ'],
            ['weekly',  'أيام أسبوعية'],
          ] as [Mode, string][]).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 py-2 text-sm rounded-md font-medium transition-all ${
                mode === m ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1">
              {mode === 'single' ? 'التاريخ' : 'من تاريخ'}
            </label>
            <input
              type="date"
              value={startDate}
              min={todayStr}
              onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          {mode !== 'single' && (
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1">إلى تاريخ</label>
              <input
                type="date"
                value={endDate}
                min={startDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}
        </div>

        {/* Weekday picker */}
        {mode === 'weekly' && (
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-2">أيام الأسبوع</label>
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  onClick={() => toggleWeekday(i)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    weekdays.has(i)
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:border-primary/50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Work periods */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-muted-foreground">فترات العمل</label>
            <button onClick={addPeriod} className="text-xs text-primary hover:underline">+ إضافة فترة</button>
          </div>
          <div className="space-y-2">
            {periods.map(p => (
              <div key={p.id} className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg border border-border/50">
                <ClockIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <input
                  type="time"
                  value={p.startTime}
                  onChange={e => updatePeriod(p.id, 'startTime', e.target.value)}
                  className="px-2 py-1 border border-border rounded text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 w-28"
                />
                <span className="text-muted-foreground text-sm">حتى</span>
                <input
                  type="time"
                  value={p.endTime}
                  onChange={e => updatePeriod(p.id, 'endTime', e.target.value)}
                  className="px-2 py-1 border border-border rounded text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 w-28"
                />
                {periods.length > 1 && (
                  <button onClick={() => removePeriod(p.id)} className="text-red-500 text-xs hover:underline mr-auto">حذف</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Appointment duration */}
        <div>
          <label className="text-sm font-medium text-muted-foreground block mb-1">مدة كل موعد (دقيقة)</label>
          <div className="flex items-center gap-3">
            <select
              value={apptDur}
              onChange={e => setApptDur(Number(e.target.value))}
              className="px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {[10, 15, 20, 30, 45, 60, 90].map(d => (
                <option key={d} value={d}>{d} دقيقة</option>
              ))}
            </select>
            <span className="text-sm text-muted-foreground">
              ≈ <strong className="text-foreground">{countExpectedSlots()}</strong> موعد في اليوم الواحد
            </span>
          </div>
        </div>

        {/* Submit */}
        {submitMsg && (
          <div className={`p-3 rounded-lg text-sm ${
            submitMsg.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
          }`}>
            {submitMsg.text}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={submitting || !selectedBranchId}
          className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'جاري الإنشاء...' : 'إنشاء المواعيد'}
        </button>
      </div>

      {/* ── Existing Slots Calendar ── */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 className="font-semibold text-base flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-primary" />
          المواعيد الحالية
        </h3>

        {/* Calendar nav */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() - 1))}
            className="px-3 py-1.5 text-sm bg-secondary rounded hover:bg-secondary/80"
          >←</button>
          <span className="font-semibold">{MONTHS[calendarDate.getMonth()]} {calendarDate.getFullYear()}</span>
          <button
            onClick={() => setCalendarDate(d => new Date(d.getFullYear(), d.getMonth() + 1))}
            className="px-3 py-1.5 text-sm bg-secondary rounded hover:bg-secondary/80"
          >→</button>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAY_LABELS.map(d => (
            <div key={d} className="text-[11px] font-medium text-muted-foreground py-1">{d.slice(0, 2)}</div>
          ))}
          {Array(firstDayOfMonth).fill(null).map((_, i) => <div key={`e-${i}`} />)}
          {Array.from({ length: daysInMonth }, (_, i) => {
            const day = i + 1;
            const dateStr = formatCalDay(day);
            const slots = slotsByDate[dateStr] ?? [];
            const isToday = dateStr === todayStr;
            const isPast = dateStr < todayStr;
            const isSelected = viewDate === dateStr;
            const booked = slots.filter(s => s.appointment).length;
            const free = slots.filter(s => !s.appointment).length;
            return (
              <button
                key={dateStr}
                onClick={() => setViewDate(isSelected ? null : dateStr)}
                className={`py-1.5 rounded-lg text-xs border transition-all ${
                  isPast ? 'opacity-40 cursor-default border-transparent'
                  : isSelected ? 'border-primary bg-primary/10'
                  : slots.length ? 'border-green-400/60 bg-green-50/50 dark:bg-green-900/10 hover:border-green-500'
                  : 'border-border hover:border-primary/40 cursor-pointer'
                } ${isToday ? 'ring-2 ring-blue-400' : ''}`}
              >
                <p className={`font-semibold ${isToday ? 'text-blue-600' : ''}`}>{day}</p>
                {slots.length > 0 && (
                  <div className="flex justify-center gap-0.5 mt-0.5">
                    {free > 0 && <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" title={`${free} متاح`} />}
                    {booked > 0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" title={`${booked} محجوز`} />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> متاح</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" /> محجوز</span>
        </div>

        {/* Day detail panel */}
        {viewDate && (
          <div className="border border-border rounded-xl p-4 space-y-2 mt-2">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-sm">{viewDate} — {viewSlots.length} موعد</h4>
              <button onClick={() => setViewDate(null)} className="text-xs text-muted-foreground hover:text-foreground">إغلاق</button>
            </div>
            {/* Cancel period section */}
            <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-red-700 dark:text-red-400">إلغاء المواعيد المتاحة (غير المحجوزة)</p>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">من</span>
                  <input
                    type="time"
                    value={cancelFrom}
                    onChange={e => setCancelFrom(e.target.value)}
                    className="px-2 py-1 border border-border rounded text-xs bg-background w-24 focus:outline-none focus:ring-1 focus:ring-red-400"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">حتى</span>
                  <input
                    type="time"
                    value={cancelTo}
                    onChange={e => setCancelTo(e.target.value)}
                    className="px-2 py-1 border border-border rounded text-xs bg-background w-24 focus:outline-none focus:ring-1 focus:ring-red-400"
                  />
                </div>
                <button
                  onClick={cancelPeriod}
                  disabled={cancelling}
                  className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {cancelling ? 'جاري الإلغاء...' : 'إلغاء الفترة'}
                </button>
                <span className="text-[10px] text-muted-foreground">(اتركها فارغة لإلغاء كل اليوم)</span>
              </div>
              {cancelMsg && (
                <p className="text-xs text-red-700 dark:text-red-400">{cancelMsg}</p>
              )}
            </div>

            {viewSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد مواعيد</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {viewSlots.map(slot => (
                  <div
                    key={slot.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs ${
                      slot.appointment
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                        : 'bg-secondary/30 border-border/50'
                    }`}
                  >
                    <span className="font-mono font-medium">{slot.startTime}</span>
                    {slot.appointment ? (
                      <span className="text-blue-600 dark:text-blue-400 text-[10px] mr-1">محجوز</span>
                    ) : (
                      <button
                        onClick={() => deleteSlot(slot.id)}
                        disabled={deletingId === slot.id}
                        className="text-red-500 hover:text-red-700 text-[10px] mr-1 disabled:opacity-50"
                      >
                        {deletingId === slot.id ? '...' : 'حذف'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}