'use client';

import { useState, useEffect, useCallback, useContext } from 'react';
import { SearchIcon, XIcon, CheckCircleIcon } from '@/components/Icons';
import { AuthContext } from '@/context/AuthContext';

/* ─── Types ─────────────────────────────────────────────── */
interface Clinic  { id: number; name: string }
interface Branch  { id: number; name: string }

interface LastAppointment {
  id: number;
  appointmentDate: string;
  appointmentTime: string;
  status: string;
  service: { name: string } | null;
}

interface Patient {
  id: number;
  dateOfBirth: string | null;
  gender: string | null;
  user: { id: number; name: string; phoneNumber: string; email: string | null };
  appointments: LastAppointment[];
}

/* ─── Helpers ────────────────────────────────────────────── */
const calcAge = (dob: string | null) => {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
};

const fmtDate = (d: string) => new Date(d).toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' });

const apptStatusLabel: Record<string, string> = {
  PENDING: 'قادم', CONFIRMED: 'مؤكد', COMPLETED: 'مكتمل',
  CANCELLED: 'ملغي', NO_SHOW: 'لم يحضر', RESCHEDULED: 'معاد جدولته',
};

/* ─── Component ──────────────────────────────────────────── */
export default function StaffPatientsPanel() {
  const authContext = useContext(AuthContext);
  const user = authContext?.user as any;

  // Data
  const [patients, setPatients]   = useState<Patient[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  // Filters
  const [search, setSearch]               = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage]                   = useState(1);
  const PAGE_SIZE = 20;

  // Clinic / Branch filters
  const [clinics, setClinics]                 = useState<Clinic[]>([]);
  const [branches, setBranches]               = useState<Branch[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>('all');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');

  // Modals
  const [viewPatient, setViewPatient] = useState<Patient | null>(null);
  const [successMsg, setSuccessMsg]   = useState('');

  // Add patient form
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', phone: '', nationalId: '', email: '', gender: 'male', birthDate: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError]     = useState('');

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  /* ── Load clinics ── */
  useEffect(() => {
    fetch('/api/doctor/clinics', { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success) setClinics(j.data); })
      .catch(() => {});
  }, []);

  /* ── Load branches when clinic changes ── */
  useEffect(() => {
    setBranches([]); setSelectedBranchId('all');
    if (selectedClinicId === 'all') return;
    fetch(`/api/clinic/branches?clinicId=${selectedClinicId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success) setBranches(j.data); })
      .catch(() => {});
  }, [selectedClinicId]);

  /* ── Debounce search ── */
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  /* ── Fetch patients ── */
  const fetchPatients = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
      if (debouncedSearch)       params.set('search',   debouncedSearch);
      if (selectedClinicId !== 'all') params.set('clinicId', selectedClinicId);
      if (selectedBranchId !== 'all') params.set('branchId', selectedBranchId);

      const res  = await fetch(`/api/clinic/patients?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('فشل تحميل المرضى');
      const json = await res.json();
      setPatients(json.data ?? []);
      setTotal(json.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch, selectedClinicId, selectedBranchId]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  /* ── Add patient ── */
  const handleAddPatient = async () => {
    if (!addForm.name.trim() || !addForm.phone.trim()) return;
    setAddLoading(true); setAddError('');
    try {
      const res = await fetch('/api/clinic/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(addForm),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || json.error?.message || 'فشل إنشاء الملف');
      setShowAddModal(false);
      setAddForm({ name: '', phone: '', nationalId: '', email: '', gender: 'male', birthDate: '' });
      showSuccess('تم تسجيل المريض بنجاح');
      fetchPatients();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'حدث خطأ');
    } finally {
      setAddLoading(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const inp = 'w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <div className="space-y-6" dir="rtl">

      {/* Success toast */}
      {successMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">إجمالي المرضى</p>
          <p className="text-2xl font-bold text-primary">{loading ? '—' : total}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">العيادة</p>
          <p className="text-sm font-semibold text-foreground truncate">
            {selectedClinicId === 'all' ? 'جميع العيادات' : clinics.find(c => String(c.id) === selectedClinicId)?.name ?? '—'}
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">الفرع</p>
          <p className="text-sm font-semibold text-foreground truncate">
            {selectedBranchId === 'all' ? 'جميع الفروع' : branches.find(b => String(b.id) === selectedBranchId)?.name ?? '—'}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          {/* Search */}
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="ابحث (اسم أو هاتف)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-9 pl-4 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Clinic filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">العيادة:</span>
            <select
              value={selectedClinicId}
              onChange={(e) => { setSelectedClinicId(e.target.value); setPage(1); }}
              className="text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">جميع العيادات</option>
              {clinics.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
          </div>

          {/* Branch filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground whitespace-nowrap">الفرع:</span>
            <select
              value={selectedBranchId}
              onChange={(e) => { setSelectedBranchId(e.target.value); setPage(1); }}
              disabled={selectedClinicId === 'all'}
              className="text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
            >
              <option value="all">جميع الفروع</option>
              {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
            </select>
          </div>
        </div>

        <button
          onClick={() => { setShowAddModal(true); setAddError(''); }}
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
                <th className="text-right px-4 py-3 font-semibold text-foreground hidden sm:table-cell">الجنس / العمر</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground hidden md:table-cell">آخر موعد</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground hidden lg:table-cell">الخدمة</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground hidden lg:table-cell">الحالة</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">جاري التحميل...</td></tr>
              ) : error ? (
                <tr><td colSpan={6} className="text-center py-12 text-destructive">{error}</td></tr>
              ) : patients.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">لا توجد نتائج</td></tr>
              ) : patients.map((p) => {
                const last = p.appointments[0];
                const age  = calcAge(p.dateOfBirth);
                const isMale = p.gender === 'male';
                return (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${isMale ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-pink-100 dark:bg-pink-900/30 text-pink-600'}`}>
                          {p.user.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{p.user.name}</p>
                          <p className="text-xs text-muted-foreground" dir="ltr">{p.user.phoneNumber}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell text-xs">
                      {isMale ? 'ذكر' : 'أنثى'}{age != null ? ` — ${age} سنة` : ''}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs" dir="ltr">
                      {last ? fmtDate(last.appointmentDate) : '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs">
                      {last?.service?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      {last ? (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-secondary text-foreground">
                          {apptStatusLabel[last.status] ?? last.status}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => setViewPatient(p)} className="text-xs text-primary hover:underline">ملف</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm text-muted-foreground">
            <span>صفحة {page} من {totalPages} — {total} مريض</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded-lg border border-border hover:bg-secondary disabled:opacity-40">السابق</button>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded-lg border border-border hover:bg-secondary disabled:opacity-40">التالي</button>
            </div>
          </div>
        )}
      </div>

      {/* ── Patient File Modal (no clinical notes) ── */}
      {viewPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-lg font-bold text-foreground">ملف المريض</h2>
              <button onClick={() => setViewPatient(null)}><XIcon className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${viewPatient.gender === 'male' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-pink-100 dark:bg-pink-900/30 text-pink-600'}`}>
                  {viewPatient.user.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">{viewPatient.user.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {viewPatient.gender === 'male' ? 'ذكر' : viewPatient.gender === 'female' ? 'أنثى' : ''}
                    {calcAge(viewPatient.dateOfBirth) != null ? ` — ${calcAge(viewPatient.dateOfBirth)} سنة` : ''}
                  </p>
                </div>
              </div>

              {/* Basic info */}
              <div className="grid grid-cols-2 gap-3 text-sm bg-secondary/30 rounded-xl p-4">
                <div><span className="text-muted-foreground">الهاتف: </span><span className="font-medium" dir="ltr">{viewPatient.user.phoneNumber}</span></div>
                <div><span className="text-muted-foreground">البريد: </span><span className="font-medium" dir="ltr">{viewPatient.user.email || '—'}</span></div>
                {viewPatient.dateOfBirth && (
                  <div><span className="text-muted-foreground">تاريخ الميلاد: </span><span className="font-medium" dir="ltr">{viewPatient.dateOfBirth.split('T')[0]}</span></div>
                )}
              </div>

              {/* Appointments history — dates & services only, no clinical notes */}
              <div>
                <h4 className="font-bold text-foreground mb-3">سجل المواعيد</h4>
                {viewPatient.appointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">لا توجد مواعيد</p>
                ) : (
                  <div className="space-y-2">
                    {viewPatient.appointments.map((a) => (
                      <div key={a.id} className="flex items-center justify-between bg-secondary/30 rounded-xl p-3 text-sm">
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground text-xs" dir="ltr">{fmtDate(a.appointmentDate)}</span>
                          <span className="font-medium text-foreground">{a.service?.name ?? '—'}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">{apptStatusLabel[a.status] ?? a.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end px-5 py-4 border-t border-border sticky bottom-0 bg-card">
              <button onClick={() => setViewPatient(null)} className="px-4 py-2 text-sm border border-border rounded-xl hover:bg-secondary transition-colors">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Patient Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md border border-border max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-lg font-bold text-foreground">تسجيل مريض جديد</h2>
              <button onClick={() => setShowAddModal(false)}><XIcon className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="p-5 space-y-4">
              {addError && <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{addError}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">الاسم الكامل *</label>
                  <input value={addForm.name} onChange={e => setAddForm({...addForm, name: e.target.value})} className={inp} placeholder="الاسم الرباعي" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">رقم الهاتف *</label>
                  <input value={addForm.phone} onChange={e => setAddForm({...addForm, phone: e.target.value})} className={inp} placeholder="05xxxxxxxx" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">رقم الهوية</label>
                  <input value={addForm.nationalId} onChange={e => setAddForm({...addForm, nationalId: e.target.value})} className={inp} dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">البريد الإلكتروني</label>
                  <input type="email" value={addForm.email} onChange={e => setAddForm({...addForm, email: e.target.value})} className={inp} dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">الجنس</label>
                  <select value={addForm.gender} onChange={e => setAddForm({...addForm, gender: e.target.value})} className={inp}>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-foreground mb-1">تاريخ الميلاد</label>
                  <input type="date" value={addForm.birthDate} onChange={e => setAddForm({...addForm, birthDate: e.target.value})} className={inp} />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border sticky bottom-0 bg-card">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm border border-border rounded-xl hover:bg-secondary transition-colors">إلغاء</button>
              <button onClick={handleAddPatient} disabled={!addForm.name.trim() || !addForm.phone.trim() || addLoading}
                className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50">
                {addLoading ? 'جاري التسجيل...' : 'تسجيل المريض'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}