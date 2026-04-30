'use client';

import { useState, useMemo } from 'react';
import { SearchIcon, XIcon, CheckCircleIcon, CalendarIcon, EditIcon } from '@/components/Icons';

/* ─── Types ────────────────────────────────────────────── */
type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'no-show' | 'walk-in';
type ViewMode = 'list' | 'today';
type FilterStatus = 'ALL' | AppointmentStatus;

interface Appointment {
  id: number;
  patient: string;
  phone: string;
  doctor: string;
  service: string;
  branch: string;
  date: string;
  time: string;
  status: AppointmentStatus;
  payment: 'paid' | 'unpaid';
  notes: string;
  bookedBy: 'patient' | 'staff';
}

/* ─── Mock Data ────────────────────────────────────────── */
const mockDoctors = ['د. عبد اللطيف سليمان', 'د. خالد عبد الله'];
const mockServices = ['مراجعة دورية', 'تنظيف أسنان', 'حشو سن', 'خلع سن', 'استشارة جديدة', 'تبييض أسنان', 'تقويم أسنان', 'زراعة سن'];
const mockBranches = ['الفرع الرئيسي - رام الله', 'فرع نابلس', 'فرع الخليل'];
const mockTimeSlots = ['09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '12:30', '02:00', '02:30', '03:00', '03:30', '04:00', '04:30'];

const mockAppointments: Appointment[] = [
  { id: 1, patient: 'أحمد محمد', phone: '0599000001', doctor: 'د. عبد اللطيف سليمان', service: 'مراجعة دورية', branch: 'الفرع الرئيسي - رام الله', date: '2026-04-18', time: '09:00', status: 'completed', payment: 'paid', notes: '', bookedBy: 'patient' },
  { id: 2, patient: 'فاطمة علي', phone: '0599000002', doctor: 'د. خالد عبد الله', service: 'تنظيف أسنان', branch: 'الفرع الرئيسي - رام الله', date: '2026-04-18', time: '09:30', status: 'completed', payment: 'paid', notes: '', bookedBy: 'patient' },
  { id: 3, patient: 'محمود حسن', phone: '0599000003', doctor: 'د. عبد اللطيف سليمان', service: 'استشارة جديدة', branch: 'الفرع الرئيسي - رام الله', date: '2026-04-18', time: '10:00', status: 'scheduled', payment: 'unpaid', notes: '', bookedBy: 'staff' },
  { id: 4, patient: 'نور عبدالله', phone: '0599000004', doctor: 'د. خالد عبد الله', service: 'حشو سن', branch: 'الفرع الرئيسي - رام الله', date: '2026-04-18', time: '10:30', status: 'scheduled', payment: 'paid', notes: 'مريض يحتاج تخدير', bookedBy: 'patient' },
  { id: 5, patient: 'سارة محمود', phone: '0599000005', doctor: 'د. عبد اللطيف سليمان', service: 'خلع سن', branch: 'الفرع الرئيسي - رام الله', date: '2026-04-18', time: '11:00', status: 'scheduled', payment: 'unpaid', notes: '', bookedBy: 'patient' },
  { id: 6, patient: 'عمر ياسين', phone: '0599000006', doctor: 'د. خالد عبد الله', service: 'تبييض أسنان', branch: 'فرع نابلس', date: '2026-04-18', time: '11:30', status: 'walk-in', payment: 'paid', notes: 'حضر بدون موعد', bookedBy: 'staff' },
  { id: 7, patient: 'ليلى أحمد', phone: '0599000007', doctor: 'د. عبد اللطيف سليمان', service: 'تقويم أسنان', branch: 'الفرع الرئيسي - رام الله', date: '2026-04-18', time: '02:00', status: 'scheduled', payment: 'paid', notes: '', bookedBy: 'patient' },
  { id: 8, patient: 'خالد عبدالله', phone: '0599000008', doctor: 'د. خالد عبد الله', service: 'زراعة سن', branch: 'فرع الخليل', date: '2026-04-19', time: '10:00', status: 'scheduled', payment: 'paid', notes: '', bookedBy: 'patient' },
  { id: 9, patient: 'ريم حسين', phone: '0599000009', doctor: 'د. عبد اللطيف سليمان', service: 'مراجعة دورية', branch: 'الفرع الرئيسي - رام الله', date: '2026-04-17', time: '09:00', status: 'completed', payment: 'paid', notes: '', bookedBy: 'patient' },
  { id: 10, patient: 'يوسف كمال', phone: '0599000010', doctor: 'د. خالد عبد الله', service: 'حشو سن', branch: 'فرع نابلس', date: '2026-04-17', time: '10:30', status: 'cancelled', payment: 'unpaid', notes: 'المريض ألغى', bookedBy: 'patient' },
  { id: 11, patient: 'دانا علي', phone: '0599000011', doctor: 'د. عبد اللطيف سليمان', service: 'تنظيف أسنان', branch: 'الفرع الرئيسي - رام الله', date: '2026-04-17', time: '11:00', status: 'no-show', payment: 'paid', notes: '', bookedBy: 'staff' },
];

/* ─── Config ───────────────────────────────────────────── */
const statusConfig: Record<AppointmentStatus, { label: string; className: string }> = {
  scheduled: { label: 'مجدول', className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  completed: { label: 'مكتمل', className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  cancelled: { label: 'ملغي', className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  'no-show': { label: 'لم يحضر', className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  'walk-in': { label: 'حضور مباشر', className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
};

const filterStatuses: { id: FilterStatus; label: string }[] = [
  { id: 'ALL', label: 'الكل' },
  { id: 'scheduled', label: 'مجدولة' },
  { id: 'completed', label: 'مكتملة' },
  { id: 'cancelled', label: 'ملغاة' },
  { id: 'no-show', label: 'لم يحضر' },
  { id: 'walk-in', label: 'حضور مباشر' },
];

const emptyBookingForm = {
  patient: '',
  phone: '',
  doctor: mockDoctors[0],
  service: mockServices[0],
  branch: mockBranches[0],
  date: '2026-04-18',
  time: mockTimeSlots[0],
  notes: '',
  isWalkIn: false,
};

/* ─── Component ────────────────────────────────────────── */
export default function StaffAppointmentsPanel() {
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [filterDoctor, setFilterDoctor] = useState('ALL');
  const [filterDate, setFilterDate] = useState('2026-04-18');
  const [viewMode, setViewMode] = useState<ViewMode>('today');

  // Modals
  const [showBookModal, setShowBookModal] = useState(false);
  const [bookForm, setBookForm] = useState(emptyBookingForm);
  const [showCancelModal, setShowCancelModal] = useState<Appointment | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [editAppointment, setEditAppointment] = useState<Appointment | null>(null);
  const [viewAppointment, setViewAppointment] = useState<Appointment | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Phone lookup
  const [phoneLookup, setPhoneLookup] = useState('');
  const [lookupResult, setLookupResult] = useState<{ found: boolean; name?: string } | null>(null);

  /* ── Filtering ── */
  const filtered = useMemo(() => {
    return appointments.filter((a) => {
      const matchSearch = a.patient.includes(search) || a.phone.includes(search);
      const matchStatus = filterStatus === 'ALL' || a.status === filterStatus;
      const matchDoctor = filterDoctor === 'ALL' || a.doctor === filterDoctor;
      const matchDate = viewMode === 'list' ? true : a.date === filterDate;
      return matchSearch && matchStatus && matchDoctor && matchDate;
    }).sort((a, b) => {
      if (a.date !== b.date) return a.date > b.date ? 1 : -1;
      return a.time > b.time ? 1 : -1;
    });
  }, [appointments, search, filterStatus, filterDoctor, filterDate, viewMode]);

  /* ── Stats ── */
  const todayAppts = appointments.filter((a) => a.date === filterDate);
  const scheduledCount = todayAppts.filter((a) => a.status === 'scheduled').length;
  const completedCount = todayAppts.filter((a) => a.status === 'completed').length;
  const cancelledCount = todayAppts.filter((a) => a.status === 'cancelled' || a.status === 'no-show').length;
  const walkInCount = todayAppts.filter((a) => a.status === 'walk-in').length;

  /* ── Handlers ── */
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handlePhoneLookup = () => {
    if (!phoneLookup.trim()) return;
    // Mock lookup
    const found = mockAppointments.find((a) => a.phone === phoneLookup);
    if (found) {
      setLookupResult({ found: true, name: found.patient });
      setBookForm((f) => ({ ...f, patient: found.patient, phone: phoneLookup }));
    } else {
      setLookupResult({ found: false });
      setBookForm((f) => ({ ...f, phone: phoneLookup }));
    }
  };

  const handleBook = () => {
    if (!bookForm.patient.trim() || !bookForm.phone.trim()) return;
    const newAppt: Appointment = {
      id: Date.now(),
      patient: bookForm.patient,
      phone: bookForm.phone,
      doctor: bookForm.doctor,
      service: bookForm.service,
      branch: bookForm.branch,
      date: bookForm.date,
      time: bookForm.time,
      status: bookForm.isWalkIn ? 'walk-in' : 'scheduled',
      payment: 'unpaid',
      notes: bookForm.notes,
      bookedBy: 'staff',
    };
    setAppointments((prev) => [newAppt, ...prev]);
    setShowBookModal(false);
    resetBookForm();
    showSuccess(bookForm.isWalkIn ? 'تم تسجيل حضور مباشر' : 'تم حجز الموعد بنجاح');
  };

  const resetBookForm = () => {
    setBookForm(emptyBookingForm);
    setPhoneLookup('');
    setLookupResult(null);
  };

  const handleCancel = () => {
    if (!showCancelModal) return;
    setAppointments((prev) =>
      prev.map((a) => a.id === showCancelModal.id ? { ...a, status: 'cancelled' as AppointmentStatus, notes: cancelReason || a.notes } : a)
    );
    setShowCancelModal(null);
    setCancelReason('');
    showSuccess('تم إلغاء الموعد');
  };

  const handleStatusChange = (id: number, status: AppointmentStatus) => {
    setAppointments((prev) =>
      prev.map((a) => a.id === id ? { ...a, status } : a)
    );
    showSuccess('تم تحديث الحالة');
  };

  const handleEditSave = () => {
    if (!editAppointment) return;
    setAppointments((prev) =>
      prev.map((a) => a.id === editAppointment.id ? editAppointment : a)
    );
    setEditAppointment(null);
    showSuccess('تم تعديل الموعد');
  };

  return (
    <div className="space-y-6" dir="rtl">

      {/* Success toast */}
      {successMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">مجدولة</p>
          <p className="text-2xl font-bold text-blue-600">{scheduledCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">مكتملة</p>
          <p className="text-2xl font-bold text-green-600">{completedCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">ملغاة / لم يحضر</p>
          <p className="text-2xl font-bold text-red-600">{cancelledCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">حضور مباشر</p>
          <p className="text-2xl font-bold text-purple-600">{walkInCount}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        {/* Row 1: view toggle + date + actions */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('today')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${viewMode === 'today' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                يوم محدد
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${viewMode === 'list' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                جميع المواعيد
              </button>
            </div>
            {viewMode === 'today' && (
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { resetBookForm(); setBookForm((f) => ({ ...f, isWalkIn: false })); setShowBookModal(true); }}
              className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              + حجز موعد
            </button>
            <button
              onClick={() => { resetBookForm(); setBookForm((f) => ({ ...f, isWalkIn: true })); setShowBookModal(true); }}
              className="px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-colors whitespace-nowrap"
            >
              + حضور مباشر
            </button>
          </div>
        </div>

        {/* Row 2: search + filters */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="ابحث (اسم، هاتف)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-4 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            {filterStatuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <select
            value={filterDoctor}
            onChange={(e) => setFilterDoctor(e.target.value)}
            className="px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">جميع الأطباء</option>
            {mockDoctors.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* Appointments Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-right px-4 py-3 font-semibold text-foreground">المريض</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground">الوقت</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground hidden sm:table-cell">الخدمة</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground hidden md:table-cell">الطبيب</th>
                {viewMode === 'list' && (
                  <th className="text-right px-4 py-3 font-semibold text-foreground hidden lg:table-cell">التاريخ</th>
                )}
                <th className="text-right px-4 py-3 font-semibold text-foreground">الحالة</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground hidden md:table-cell">الدفع</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-muted-foreground">
                    لا توجد مواعيد
                  </td>
                </tr>
              ) : (
                filtered.map((appt) => (
                  <tr key={appt.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                          {appt.patient.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{appt.patient}</p>
                          <p className="text-xs text-muted-foreground" dir="ltr">{appt.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground font-medium" dir="ltr">{appt.time}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{appt.service}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">{appt.doctor}</td>
                    {viewMode === 'list' && (
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell" dir="ltr">{appt.date}</td>
                    )}
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[appt.status].className}`}>
                        {statusConfig[appt.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={`text-xs font-medium ${appt.payment === 'paid' ? 'text-green-600' : 'text-red-500'}`}>
                        {appt.payment === 'paid' ? 'مدفوع' : 'غير مدفوع'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setViewAppointment(appt)} className="text-xs text-primary hover:underline">تفاصيل</button>
                        {appt.status === 'scheduled' && (
                          <>
                            <button onClick={() => handleStatusChange(appt.id, 'completed')} className="text-xs text-green-600 hover:underline">إتمام</button>
                            <button onClick={() => setEditAppointment({ ...appt })} className="text-xs text-blue-600 hover:underline">تعديل</button>
                            <button onClick={() => { setShowCancelModal(appt); setCancelReason(''); }} className="text-xs text-red-500 hover:underline">إلغاء</button>
                          </>
                        )}
                        {appt.status === 'scheduled' && (
                          <button onClick={() => handleStatusChange(appt.id, 'no-show')} className="text-xs text-amber-600 hover:underline">لم يحضر</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Book / Walk-in Modal ── */}
      {showBookModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-lg font-bold text-foreground">
                {bookForm.isWalkIn ? '🚶 تسجيل حضور مباشر' : '📅 حجز موعد جديد'}
              </h2>
              <button onClick={() => setShowBookModal(false)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">

              {/* Phone lookup */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">البحث برقم الهاتف</label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={phoneLookup}
                    onChange={(e) => { setPhoneLookup(e.target.value); setLookupResult(null); }}
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                    className="flex-1 px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={handlePhoneLookup}
                    className="px-4 py-2.5 bg-secondary text-foreground text-sm font-medium rounded-xl hover:bg-secondary/80 transition-colors"
                  >
                    بحث
                  </button>
                </div>
                {lookupResult && (
                  <p className={`text-xs mt-1.5 ${lookupResult.found ? 'text-green-600' : 'text-amber-600'}`}>
                    {lookupResult.found ? `✓ تم العثور على: ${lookupResult.name}` : '✗ مريض جديد — أدخل الاسم يدوياً'}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-foreground mb-1">اسم المريض *</label>
                  <input
                    value={bookForm.patient}
                    onChange={(e) => setBookForm({ ...bookForm, patient: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="الاسم الكامل"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-foreground mb-1">رقم الهاتف *</label>
                  <input
                    value={bookForm.phone}
                    onChange={(e) => setBookForm({ ...bookForm, phone: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">الفرع</label>
                <select
                  value={bookForm.branch}
                  onChange={(e) => setBookForm({ ...bookForm, branch: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {mockBranches.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">الخدمة</label>
                  <select
                    value={bookForm.service}
                    onChange={(e) => setBookForm({ ...bookForm, service: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {mockServices.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">الطبيب</label>
                  <select
                    value={bookForm.doctor}
                    onChange={(e) => setBookForm({ ...bookForm, doctor: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {mockDoctors.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              {!bookForm.isWalkIn && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">التاريخ</label>
                    <input
                      type="date"
                      value={bookForm.date}
                      onChange={(e) => setBookForm({ ...bookForm, date: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">الوقت</label>
                    <select
                      value={bookForm.time}
                      onChange={(e) => setBookForm({ ...bookForm, time: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {mockTimeSlots.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">ملاحظات</label>
                <textarea
                  value={bookForm.notes}
                  onChange={(e) => setBookForm({ ...bookForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="ملاحظات اختيارية..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border sticky bottom-0 bg-card">
              <button onClick={() => setShowBookModal(false)} className="px-4 py-2 text-sm border border-border rounded-xl hover:bg-secondary transition-colors">
                إلغاء
              </button>
              <button
                onClick={handleBook}
                disabled={!bookForm.patient.trim() || !bookForm.phone.trim()}
                className={`px-5 py-2 text-white text-sm font-semibold rounded-xl transition-colors disabled:opacity-50 ${bookForm.isWalkIn ? 'bg-purple-600 hover:bg-purple-700' : 'bg-primary hover:bg-primary/90'}`}
              >
                {bookForm.isWalkIn ? 'تسجيل الحضور' : 'تأكيد الحجز'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Cancel Modal ── */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm border border-border" dir="rtl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">إلغاء الموعد</h2>
              <button onClick={() => setShowCancelModal(null)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-secondary/50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">المريض</span><span className="font-medium">{showCancelModal.patient}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">الموعد</span><span dir="ltr">{showCancelModal.date} — {showCancelModal.time}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">الطبيب</span><span>{showCancelModal.doctor}</span></div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">سبب الإلغاء</label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="أدخل السبب..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
              <button onClick={() => setShowCancelModal(null)} className="px-4 py-2 text-sm border border-border rounded-xl hover:bg-secondary transition-colors">تراجع</button>
              <button onClick={handleCancel} className="px-5 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors">تأكيد الإلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md border border-border max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-lg font-bold text-foreground">تعديل الموعد</h2>
              <button onClick={() => setEditAppointment(null)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">الطبيب</label>
                <select
                  value={editAppointment.doctor}
                  onChange={(e) => setEditAppointment({ ...editAppointment, doctor: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {mockDoctors.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">الخدمة</label>
                <select
                  value={editAppointment.service}
                  onChange={(e) => setEditAppointment({ ...editAppointment, service: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {mockServices.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">التاريخ</label>
                  <input
                    type="date"
                    value={editAppointment.date}
                    onChange={(e) => setEditAppointment({ ...editAppointment, date: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">الوقت</label>
                  <select
                    value={editAppointment.time}
                    onChange={(e) => setEditAppointment({ ...editAppointment, time: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {mockTimeSlots.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">ملاحظات</label>
                <textarea
                  value={editAppointment.notes}
                  onChange={(e) => setEditAppointment({ ...editAppointment, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border sticky bottom-0 bg-card">
              <button onClick={() => setEditAppointment(null)} className="px-4 py-2 text-sm border border-border rounded-xl hover:bg-secondary transition-colors">إلغاء</button>
              <button onClick={handleEditSave} className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors">حفظ التعديلات</button>
            </div>
          </div>
        </div>
      )}

      {/* ── View Details Modal ── */}
      {viewAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm border border-border" dir="rtl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">تفاصيل الموعد</h2>
              <button onClick={() => setViewAppointment(null)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">المريض</span><span className="font-medium text-foreground">{viewAppointment.patient}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">الهاتف</span><span dir="ltr">{viewAppointment.phone}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">الطبيب</span><span>{viewAppointment.doctor}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">الخدمة</span><span>{viewAppointment.service}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">الفرع</span><span>{viewAppointment.branch}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">التاريخ</span><span dir="ltr">{viewAppointment.date}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">الوقت</span><span dir="ltr">{viewAppointment.time}</span></div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">الحالة</span>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[viewAppointment.status].className}`}>
                  {statusConfig[viewAppointment.status].label}
                </span>
              </div>
              <div className="flex justify-between"><span className="text-muted-foreground">الدفع</span><span className={viewAppointment.payment === 'paid' ? 'text-green-600' : 'text-red-500'}>{viewAppointment.payment === 'paid' ? 'مدفوع' : 'غير مدفوع'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">حُجز بواسطة</span><span>{viewAppointment.bookedBy === 'staff' ? 'السكرتير' : 'المريض'}</span></div>
              {viewAppointment.notes && (
                <div className="border-t border-border pt-3">
                  <span className="text-muted-foreground block mb-1">ملاحظات</span>
                  <p className="text-foreground bg-secondary/30 rounded-lg p-3">{viewAppointment.notes}</p>
                </div>
              )}
            </div>
            <div className="flex justify-end px-5 py-4 border-t border-border">
              <button onClick={() => setViewAppointment(null)} className="px-4 py-2 text-sm border border-border rounded-xl hover:bg-secondary transition-colors">إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
