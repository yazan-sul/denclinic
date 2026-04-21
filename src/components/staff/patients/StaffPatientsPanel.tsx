'use client';

import { useState, useMemo } from 'react';
import { SearchIcon, XIcon, CheckCircleIcon } from '@/components/Icons';

/* ─── Types ────────────────────────────────────────────── */
type Gender = 'male' | 'female';
type PatientStatus = 'active' | 'inactive';

interface Visit {
  id: number;
  date: string;
  service: string;
  doctor: string;
  notes: string;
  payment: number;
  status: 'completed' | 'cancelled' | 'no-show';
}

interface Patient {
  id: number;
  name: string;
  phone: string;
  nationalId: string;
  email: string;
  gender: Gender;
  birthDate: string;
  age: number;
  address: string;
  status: PatientStatus;
  registeredAt: string;
  lastVisit: string;
  totalVisits: number;
  balance: number;
  doctor: string;
  notes: string;
  visits: Visit[];
}

/* ─── Mock Data ────────────────────────────────────────── */
const mockPatients: Patient[] = [
  {
    id: 1, name: 'أحمد محمد', phone: '0599000001', nationalId: '900100100', email: 'ahmad@email.com',
    gender: 'male', birthDate: '1990-05-15', age: 35, address: 'رام الله - الماصيون',
    status: 'active', registeredAt: '2025-01-10', lastVisit: '2026-04-18', totalVisits: 12, balance: 0,
    doctor: 'د. عبد اللطيف سليمان', notes: 'حساسية من البنسلين',
    visits: [
      { id: 1, date: '2026-04-18', service: 'مراجعة دورية', doctor: 'د. عبد اللطيف سليمان', notes: 'فحص سليم', payment: 100, status: 'completed' },
      { id: 2, date: '2026-03-15', service: 'تنظيف أسنان', doctor: 'د. عبد اللطيف سليمان', notes: '', payment: 150, status: 'completed' },
      { id: 3, date: '2026-02-01', service: 'حشو سن', doctor: 'د. خالد عبد الله', notes: 'سن رقم 6', payment: 250, status: 'completed' },
    ],
  },
  {
    id: 2, name: 'فاطمة علي', phone: '0599000002', nationalId: '920200200', email: 'fatima@email.com',
    gender: 'female', birthDate: '1992-08-20', age: 33, address: 'نابلس - رفيديا',
    status: 'active', registeredAt: '2025-03-05', lastVisit: '2026-04-18', totalVisits: 8, balance: 150,
    doctor: 'د. خالد عبد الله', notes: '',
    visits: [
      { id: 1, date: '2026-04-18', service: 'تنظيف أسنان', doctor: 'د. خالد عبد الله', notes: '', payment: 150, status: 'completed' },
      { id: 2, date: '2026-01-20', service: 'مراجعة دورية', doctor: 'د. خالد عبد الله', notes: '', payment: 100, status: 'completed' },
    ],
  },
  {
    id: 3, name: 'محمود حسن', phone: '0599000003', nationalId: '880300300', email: 'mahmoud@email.com',
    gender: 'male', birthDate: '1988-11-03', age: 37, address: 'رام الله - البالوع',
    status: 'active', registeredAt: '2025-06-12', lastVisit: '2026-04-18', totalVisits: 3, balance: 80,
    doctor: 'د. عبد اللطيف سليمان', notes: 'مريض جديد نسبياً',
    visits: [
      { id: 1, date: '2026-04-18', service: 'استشارة جديدة', doctor: 'د. عبد اللطيف سليمان', notes: 'تحويل لزراعة', payment: 80, status: 'completed' },
    ],
  },
  {
    id: 4, name: 'نور عبدالله', phone: '0599000004', nationalId: '950400400', email: 'nour@email.com',
    gender: 'female', birthDate: '1995-02-14', age: 31, address: 'الخليل - عين سارة',
    status: 'active', registeredAt: '2024-12-01', lastVisit: '2026-04-17', totalVisits: 15, balance: 0,
    doctor: 'د. خالد عبد الله', notes: 'تقويم أسنان — جلسة كل شهر',
    visits: [
      { id: 1, date: '2026-04-17', service: 'حشو سن', doctor: 'د. خالد عبد الله', notes: 'سن رقم 4', payment: 250, status: 'completed' },
      { id: 2, date: '2026-03-17', service: 'تقويم أسنان', doctor: 'د. خالد عبد الله', notes: 'جلسة شهرية', payment: 200, status: 'completed' },
    ],
  },
  {
    id: 5, name: 'سارة محمود', phone: '0599000005', nationalId: '980500500', email: 'sara@email.com',
    gender: 'female', birthDate: '1998-07-22', age: 27, address: 'رام الله - المصيون',
    status: 'active', registeredAt: '2025-09-20', lastVisit: '2026-04-18', totalVisits: 5, balance: 200,
    doctor: 'د. عبد اللطيف سليمان', notes: '',
    visits: [
      { id: 1, date: '2026-04-18', service: 'خلع سن', doctor: 'د. عبد اللطيف سليمان', notes: 'سن عقل', payment: 200, status: 'completed' },
    ],
  },
  {
    id: 6, name: 'عمر ياسين', phone: '0599000006', nationalId: '870600600', email: 'omar@email.com',
    gender: 'male', birthDate: '1987-04-10', age: 39, address: 'نابلس - المخفية',
    status: 'active', registeredAt: '2025-05-14', lastVisit: '2026-04-18', totalVisits: 7, balance: 0,
    doctor: 'د. خالد عبد الله', notes: '',
    visits: [
      { id: 1, date: '2026-04-18', service: 'تبييض أسنان', doctor: 'د. خالد عبد الله', notes: '', payment: 300, status: 'completed' },
    ],
  },
  {
    id: 7, name: 'ليلى أحمد', phone: '0599000007', nationalId: '930700700', email: 'layla@email.com',
    gender: 'female', birthDate: '1993-12-30', age: 32, address: 'رام الله - الطيرة',
    status: 'active', registeredAt: '2025-02-28', lastVisit: '2026-04-18', totalVisits: 10, balance: 0,
    doctor: 'د. عبد اللطيف سليمان', notes: 'تقويم — متابعة شهرية',
    visits: [
      { id: 1, date: '2026-04-18', service: 'تقويم أسنان', doctor: 'د. عبد اللطيف سليمان', notes: 'جلسة 10', payment: 500, status: 'completed' },
    ],
  },
  {
    id: 8, name: 'خالد عبدالله', phone: '0599000008', nationalId: '850800800', email: 'khaled@email.com',
    gender: 'male', birthDate: '1985-09-05', age: 40, address: 'الخليل - راس الجورة',
    status: 'inactive', registeredAt: '2024-08-15', lastVisit: '2026-02-10', totalVisits: 4, balance: 0,
    doctor: 'د. خالد عبد الله', notes: '',
    visits: [
      { id: 1, date: '2026-02-10', service: 'زراعة سن', doctor: 'د. خالد عبد الله', notes: 'جلسة أولى', payment: 1200, status: 'completed' },
    ],
  },
  {
    id: 9, name: 'ريم حسين', phone: '0599000009', nationalId: '910900900', email: 'reem@email.com',
    gender: 'female', birthDate: '1991-03-17', age: 35, address: 'رام الله - البيرة',
    status: 'active', registeredAt: '2025-04-22', lastVisit: '2026-04-17', totalVisits: 6, balance: 0,
    doctor: 'د. عبد اللطيف سليمان', notes: '',
    visits: [
      { id: 1, date: '2026-04-17', service: 'مراجعة دورية', doctor: 'د. عبد اللطيف سليمان', notes: '', payment: 100, status: 'completed' },
    ],
  },
  {
    id: 10, name: 'يوسف كمال', phone: '0599000010', nationalId: '891001000', email: '',
    gender: 'male', birthDate: '1989-06-25', age: 36, address: 'نابلس - العين',
    status: 'inactive', registeredAt: '2024-10-05', lastVisit: '2026-01-15', totalVisits: 2, balance: 0,
    doctor: 'د. خالد عبد الله', notes: 'ألغى آخر موعدين',
    visits: [
      { id: 1, date: '2026-01-15', service: 'حشو سن', doctor: 'د. خالد عبد الله', notes: '', payment: 250, status: 'cancelled' },
    ],
  },
  {
    id: 11, name: 'دانا علي', phone: '0599000011', nationalId: '961101100', email: 'dana@email.com',
    gender: 'female', birthDate: '1996-01-08', age: 30, address: 'رام الله - الإرسال',
    status: 'active', registeredAt: '2025-07-30', lastVisit: '2026-04-17', totalVisits: 9, balance: 100,
    doctor: 'د. عبد اللطيف سليمان', notes: '',
    visits: [
      { id: 1, date: '2026-04-17', service: 'تنظيف أسنان', doctor: 'د. عبد اللطيف سليمان', notes: '', payment: 150, status: 'no-show' },
    ],
  },
];

const mockDoctors = ['د. عبد اللطيف سليمان', 'د. خالد عبد الله'];

/* ─── Config ───────────────────────────────────────────── */
const statusConfig: Record<PatientStatus, { label: string; className: string }> = {
  active: { label: 'نشط', className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  inactive: { label: 'غير نشط', className: 'bg-gray-100 dark:bg-gray-800/30 text-gray-600 dark:text-gray-400' },
};

const visitStatusConfig: Record<string, { label: string; className: string }> = {
  completed: { label: 'مكتملة', className: 'text-green-600' },
  cancelled: { label: 'ملغاة', className: 'text-red-500' },
  'no-show': { label: 'لم يحضر', className: 'text-amber-600' },
};

const emptyPatientForm = {
  name: '', phone: '', nationalId: '', email: '', gender: 'male' as Gender,
  birthDate: '', address: '', notes: '', doctor: mockDoctors[0],
};

/* ─── Component ────────────────────────────────────────── */
export default function StaffPatientsPanel() {
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | PatientStatus>('ALL');
  const [filterDoctor, setFilterDoctor] = useState('ALL');

  // Modals
  const [viewPatient, setViewPatient] = useState<Patient | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(emptyPatientForm);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [editForm, setEditForm] = useState(emptyPatientForm);
  const [successMsg, setSuccessMsg] = useState('');

  /* ── Filtering ── */
  const filtered = useMemo(() => {
    return patients.filter((p) => {
      const matchSearch = p.name.includes(search) || p.phone.includes(search) || p.nationalId.includes(search);
      const matchStatus = filterStatus === 'ALL' || p.status === filterStatus;
      const matchDoctor = filterDoctor === 'ALL' || p.doctor === filterDoctor;
      return matchSearch && matchStatus && matchDoctor;
    });
  }, [patients, search, filterStatus, filterDoctor]);

  /* ── Stats ── */
  const totalActive = patients.filter((p) => p.status === 'active').length;
  const totalInactive = patients.filter((p) => p.status === 'inactive').length;
  const totalBalance = patients.reduce((sum, p) => sum + p.balance, 0);
  const newThisMonth = patients.filter((p) => p.registeredAt >= '2026-04-01').length;

  /* ── Handlers ── */
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const calcAge = (birthDate: string) => {
    if (!birthDate) return 0;
    const diff = new Date().getTime() - new Date(birthDate).getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  };

  const handleAddPatient = () => {
    if (!addForm.name.trim() || !addForm.phone.trim()) return;
    const newPatient: Patient = {
      id: Date.now(),
      name: addForm.name,
      phone: addForm.phone,
      nationalId: addForm.nationalId,
      email: addForm.email,
      gender: addForm.gender,
      birthDate: addForm.birthDate,
      age: calcAge(addForm.birthDate),
      address: addForm.address,
      status: 'active',
      registeredAt: new Date().toISOString().split('T')[0],
      lastVisit: '-',
      totalVisits: 0,
      balance: 0,
      doctor: addForm.doctor,
      notes: addForm.notes,
      visits: [],
    };
    setPatients((prev) => [newPatient, ...prev]);
    setShowAddModal(false);
    setAddForm(emptyPatientForm);
    showSuccess('تم تسجيل المريض بنجاح');
  };

  const handleEditSave = () => {
    if (!editPatient || !editForm.name.trim() || !editForm.phone.trim()) return;
    setPatients((prev) =>
      prev.map((p) =>
        p.id === editPatient.id
          ? {
              ...p,
              name: editForm.name,
              phone: editForm.phone,
              nationalId: editForm.nationalId,
              email: editForm.email,
              gender: editForm.gender,
              birthDate: editForm.birthDate,
              age: calcAge(editForm.birthDate),
              address: editForm.address,
              doctor: editForm.doctor,
              notes: editForm.notes,
            }
          : p
      )
    );
    setEditPatient(null);
    showSuccess('تم تحديث بيانات المريض');
  };

  const handleToggleStatus = (id: number) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: p.status === 'active' ? 'inactive' as PatientStatus : 'active' as PatientStatus } : p))
    );
    showSuccess('تم تحديث الحالة');
  };

  const openEdit = (p: Patient) => {
    setEditPatient(p);
    setEditForm({
      name: p.name, phone: p.phone, nationalId: p.nationalId, email: p.email,
      gender: p.gender, birthDate: p.birthDate, address: p.address, notes: p.notes, doctor: p.doctor,
    });
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
          <p className="text-sm text-muted-foreground mb-1">مرضى نشطون</p>
          <p className="text-2xl font-bold text-green-600">{totalActive}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">غير نشطين</p>
          <p className="text-2xl font-bold text-gray-500">{totalInactive}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">جدد هذا الشهر</p>
          <p className="text-2xl font-bold text-blue-600">{newThisMonth}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">أرصدة معلّقة</p>
          <p className="text-2xl font-bold text-amber-600">{totalBalance}₪</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="ابحث (اسم، هاتف، رقم هوية)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-4 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'ALL' | PatientStatus)}
            className="px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">جميع الحالات</option>
            <option value="active">نشط</option>
            <option value="inactive">غير نشط</option>
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
        <button
          onClick={() => { setAddForm(emptyPatientForm); setShowAddModal(true); }}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
        >
          + تسجيل مريض جديد
        </button>
      </div>

      {/* Patients Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-right px-4 py-3 font-semibold text-foreground">المريض</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground hidden sm:table-cell">رقم الهوية</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground hidden md:table-cell">الطبيب</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground hidden lg:table-cell">آخر زيارة</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground">الزيارات</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground">الحالة</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-muted-foreground">لا توجد نتائج</td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${p.gender === 'male' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-pink-100 dark:bg-pink-900/30 text-pink-600'}`}>
                          {p.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{p.name}</p>
                          <p className="text-xs text-muted-foreground" dir="ltr">{p.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell" dir="ltr">{p.nationalId}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">{p.doctor}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell" dir="ltr">{p.lastVisit}</td>
                    <td className="px-4 py-3 text-foreground font-medium">{p.totalVisits}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[p.status].className}`}>
                        {statusConfig[p.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setViewPatient(p)} className="text-xs text-primary hover:underline">ملف</button>
                        <button onClick={() => openEdit(p)} className="text-xs text-blue-600 hover:underline">تعديل</button>
                        <button onClick={() => handleToggleStatus(p.id)} className="text-xs text-amber-600 hover:underline">
                          {p.status === 'active' ? 'تعطيل' : 'تفعيل'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Patient File Modal ── */}
      {viewPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl border border-border max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-lg font-bold text-foreground">ملف المريض</h2>
              <button onClick={() => setViewPatient(null)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-5">
              {/* Patient header */}
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold flex-shrink-0 ${viewPatient.gender === 'male' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-pink-100 dark:bg-pink-900/30 text-pink-600'}`}>
                  {viewPatient.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-foreground">{viewPatient.name}</h3>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[viewPatient.status].className}`}>
                      {statusConfig[viewPatient.status].label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{viewPatient.gender === 'male' ? 'ذكر' : 'أنثى'} — {viewPatient.age} سنة</p>
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 text-sm bg-secondary/30 rounded-xl p-4">
                <div><span className="text-muted-foreground">الهاتف: </span><span className="font-medium" dir="ltr">{viewPatient.phone}</span></div>
                <div><span className="text-muted-foreground">رقم الهوية: </span><span className="font-medium" dir="ltr">{viewPatient.nationalId}</span></div>
                <div><span className="text-muted-foreground">البريد: </span><span className="font-medium" dir="ltr">{viewPatient.email || '-'}</span></div>
                <div><span className="text-muted-foreground">تاريخ الميلاد: </span><span className="font-medium" dir="ltr">{viewPatient.birthDate}</span></div>
                <div><span className="text-muted-foreground">العنوان: </span><span className="font-medium">{viewPatient.address}</span></div>
                <div><span className="text-muted-foreground">الطبيب المعالج: </span><span className="font-medium">{viewPatient.doctor}</span></div>
                <div><span className="text-muted-foreground">تاريخ التسجيل: </span><span className="font-medium" dir="ltr">{viewPatient.registeredAt}</span></div>
                <div><span className="text-muted-foreground">الرصيد المعلّق: </span><span className={`font-medium ${viewPatient.balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>{viewPatient.balance}₪</span></div>
              </div>

              {/* Notes */}
              {viewPatient.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground font-medium">ملاحظات: </span>
                  <span className="text-foreground bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">{viewPatient.notes}</span>
                </div>
              )}

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-blue-600">{viewPatient.totalVisits}</p>
                  <p className="text-xs text-muted-foreground">إجمالي الزيارات</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-green-600">{viewPatient.visits.reduce((s, v) => s + v.payment, 0)}₪</p>
                  <p className="text-xs text-muted-foreground">إجمالي المدفوعات</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-purple-600" dir="ltr">{viewPatient.lastVisit}</p>
                  <p className="text-xs text-muted-foreground">آخر زيارة</p>
                </div>
              </div>

              {/* Visits history */}
              <div>
                <h4 className="font-bold text-foreground mb-3">سجل الزيارات</h4>
                {viewPatient.visits.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">لا توجد زيارات</p>
                ) : (
                  <div className="space-y-2">
                    {viewPatient.visits.map((v) => (
                      <div key={v.id} className="flex items-center justify-between bg-secondary/30 rounded-xl p-3 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground text-xs" dir="ltr">{v.date}</span>
                          <span className="font-medium text-foreground">{v.service}</span>
                          <span className="text-xs text-muted-foreground">{v.doctor}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs font-medium ${visitStatusConfig[v.status]?.className || ''}`}>
                            {visitStatusConfig[v.status]?.label || v.status}
                          </span>
                          <span className="text-xs font-medium text-foreground">{v.payment}₪</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border sticky bottom-0 bg-card">
              <button onClick={() => { setViewPatient(null); openEdit(viewPatient); }} className="px-4 py-2 text-sm text-primary border border-primary/30 rounded-xl hover:bg-primary/10 transition-colors">تعديل البيانات</button>
              <button onClick={() => setViewPatient(null)} className="px-4 py-2 text-sm border border-border rounded-xl hover:bg-secondary transition-colors">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Patient Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-lg font-bold text-foreground">تسجيل مريض جديد</h2>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-foreground mb-1">الاسم الكامل *</label>
                  <input
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="الاسم الكامل"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-foreground mb-1">رقم الهاتف *</label>
                  <input
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="05xxxxxxxx"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">رقم الهوية</label>
                  <input
                    value={addForm.nationalId}
                    onChange={(e) => setAddForm({ ...addForm, nationalId: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="رقم الهوية"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="email@example.com"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">الجنس</label>
                  <select
                    value={addForm.gender}
                    onChange={(e) => setAddForm({ ...addForm, gender: e.target.value as Gender })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">تاريخ الميلاد</label>
                  <input
                    type="date"
                    value={addForm.birthDate}
                    onChange={(e) => setAddForm({ ...addForm, birthDate: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">العنوان</label>
                <input
                  value={addForm.address}
                  onChange={(e) => setAddForm({ ...addForm, address: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="المدينة - الحي"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">الطبيب المعالج</label>
                <select
                  value={addForm.doctor}
                  onChange={(e) => setAddForm({ ...addForm, doctor: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {mockDoctors.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">ملاحظات</label>
                <textarea
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="حساسية، ملاحظات طبية..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border sticky bottom-0 bg-card">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm border border-border rounded-xl hover:bg-secondary transition-colors">إلغاء</button>
              <button
                onClick={handleAddPatient}
                disabled={!addForm.name.trim() || !addForm.phone.trim()}
                className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                تسجيل المريض
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Patient Modal ── */}
      {editPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-lg font-bold text-foreground">تعديل بيانات المريض</h2>
              <button onClick={() => setEditPatient(null)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-foreground mb-1">الاسم الكامل *</label>
                  <input
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-foreground mb-1">رقم الهاتف *</label>
                  <input
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">رقم الهوية</label>
                  <input
                    value={editForm.nationalId}
                    onChange={(e) => setEditForm({ ...editForm, nationalId: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">الجنس</label>
                  <select
                    value={editForm.gender}
                    onChange={(e) => setEditForm({ ...editForm, gender: e.target.value as Gender })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">تاريخ الميلاد</label>
                  <input
                    type="date"
                    value={editForm.birthDate}
                    onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">العنوان</label>
                <input
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">الطبيب المعالج</label>
                <select
                  value={editForm.doctor}
                  onChange={(e) => setEditForm({ ...editForm, doctor: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {mockDoctors.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">ملاحظات</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border sticky bottom-0 bg-card">
              <button onClick={() => setEditPatient(null)} className="px-4 py-2 text-sm border border-border rounded-xl hover:bg-secondary transition-colors">إلغاء</button>
              <button
                onClick={handleEditSave}
                disabled={!editForm.name.trim() || !editForm.phone.trim()}
                className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                حفظ التعديلات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
