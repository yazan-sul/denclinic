'use client';

import { useState, useEffect, useCallback, useContext } from 'react';
import { SearchIcon, XIcon, CheckCircleIcon } from '@/components/Icons';
import { AuthContext } from '@/context/AuthContext';
import {
  PHONE_PREFIXES, buildPhone, splitPhone,
  validateNationalId, validateLocalPhone, validateFullName,
} from '@/lib/patientValidation';
import { formatPhone } from '@/lib/format';

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

interface FamilySearchResult { id: number; nationalId: string; dateOfBirth: string | null; user: { name: string; phoneNumber: string } }

/* ─── Component ──────────────────────────────────────────── */
export default function StaffPatientsPanel() {
  useContext(AuthContext);

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

  // Full profile panel
  const [profileData,   setProfileData]   = useState<Record<string, unknown> | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileTab,    setProfileTab]    = useState<'info' | 'appointments' | 'family'>('info');

  // Edit mode
  const [editMode,  setEditMode]  = useState(false);
  const [editForm,  setEditForm]  = useState({ name: '', dob: '', gender: '', bloodType: '', allergies: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [editError,  setEditError]  = useState('');

  // Add family member
  const [familyNid,           setFamilyNid]           = useState('');
  const [familyRel,           setFamilyRel]           = useState('CHILD');
  const [familyDir,           setFamilyDir]           = useState<'guardian-of' | 'dependent-of'>('guardian-of');
  const [addingFamily,        setAddingFamily]        = useState(false);
  const [familyError,         setFamilyError]         = useState('');
  const [showFamilyForm,      setShowFamilyForm]      = useState(false);
  const [familySearch,        setFamilySearch]        = useState('');
  const [familySearchResults, setFamilySearchResults] = useState<FamilySearchResult[]>([]);
  const [familySearching,     setFamilySearching]     = useState(false);
  const [familySelectedName,  setFamilySelectedName]  = useState('');
  const [familySelectedDob,   setFamilySelectedDob]   = useState<string | null>(null);
  const [showFamilyDropdown,  setShowFamilyDropdown]  = useState(false);

  // Book appointment from patient profile
  const [showPatientBook,    setShowPatientBook]    = useState(false);
  const [ptBookClinics,      setPtBookClinics]      = useState<{id:number;name:string}[]>([]);
  const [ptBookBranches,     setPtBookBranches]     = useState<{id:number;name:string}[]>([]);
  const [ptBookDoctors,      setPtBookDoctors]      = useState<{id:number;specialization:string;user:{name:string}}[]>([]);
  const [ptBookSlots,        setPtBookSlots]        = useState<{id:number;time:string}[]>([]);
  const [ptBookServices,     setPtBookServices]     = useState<{id:number;name:string}[]>([]);
  const [ptBookClinic,       setPtBookClinic]       = useState('');
  const [ptBookBranch,       setPtBookBranch]       = useState('');
  const [ptBookDoctor,       setPtBookDoctor]       = useState('');
  const [ptBookDate,         setPtBookDate]         = useState(new Date().toISOString().split('T')[0]);
  const [ptBookSlot,         setPtBookSlot]         = useState('');
  const [ptBookService,      setPtBookService]      = useState('');
  const [ptBookNotes,        setPtBookNotes]        = useState('');
  const [ptBookLoadingSlots, setPtBookLoadingSlots] = useState(false);
  const [ptBooking,          setPtBooking]          = useState(false);
  const [ptBookError,        setPtBookError]        = useState('');

  // Add patient — national ID based
  const [showAddModal, setShowAddModal] = useState(false);
  const [addNid,       setAddNid]       = useState('');
  const [addSearching, setAddSearching] = useState(false);
  const [addFoundPt,   setAddFoundPt]   = useState<Record<string, unknown> | null>(null);
  const [showAddForm,  setShowAddForm]  = useState(false);
  const [addPhonePrefix, setAddPhonePrefix] = useState(PHONE_PREFIXES[0].code);
  const [addPhoneLocal,  setAddPhoneLocal]  = useState('');
  const [addForm, setAddForm] = useState({ name: '', email: '', gender: 'male', birthDate: '', bloodType: '' });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError]     = useState('');

  // Edit form phone split
  const [editPhonePrefix, setEditPhonePrefix] = useState(PHONE_PREFIXES[0].code);
  const [editPhoneLocal,  setEditPhoneLocal]  = useState('');

  const showSuccess = (msg: string) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 3000); };

  /* ── Load clinics ── */
  useEffect(() => {
    fetch('/api/doctor/clinics?activeRole=STAFF', { credentials: 'include' })
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

  /* ── Add patient — national ID flow ── */
  const resetAddModal = () => {
    setAddNid(''); setAddFoundPt(null); setShowAddForm(false); setAddError('');
    setAddPhonePrefix(PHONE_PREFIXES[0].code); setAddPhoneLocal('');
    setAddForm({ name: '', email: '', gender: 'male', birthDate: '', bloodType: '' });
  };

  const searchAddNid = async () => {
    if (!addNid.trim()) return;
    setAddSearching(true); setAddFoundPt(null); setShowAddForm(false); setAddError('');
    try {
      const res  = await fetch(`/api/clinic/staff-patients?nationalId=${encodeURIComponent(addNid.trim())}&activeRole=STAFF`, { credentials: 'include' });
      const json = await res.json();
      if (json.success && json.found) { setAddFoundPt(json.data); }
      else { setShowAddForm(true); }
    } catch { setAddError('تعذر البحث'); }
    finally { setAddSearching(false); }
  };

  const handleAddPatient = async () => {
    // Client-side validation
    const nidErr  = validateNationalId(addNid);
    const nameErr = validateFullName(addForm.name);
    const telErr  = validateLocalPhone(addPhoneLocal);
    if (nidErr)  { setAddError(nidErr);  return; }
    if (nameErr) { setAddError(nameErr); return; }
    if (telErr)  { setAddError(telErr);  return; }

    setAddLoading(true); setAddError('');
    try {
      const res = await fetch('/api/clinic/staff-patients?activeRole=STAFF', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          nationalId:  addNid.trim(),
          name:        addForm.name.trim(),
          phoneNumber: buildPhone(addPhonePrefix, addPhoneLocal),
          dateOfBirth: addForm.birthDate || undefined,
          gender:      addForm.gender    || undefined,
          bloodType:   addForm.bloodType || undefined,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'فشل إنشاء الملف');
      setShowAddModal(false);
      resetAddModal();
      showSuccess('تم تسجيل المريض بنجاح');
      fetchPatients();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : 'حدث خطأ');
    } finally {
      setAddLoading(false);
    }
  };

  /* ── Open full patient profile ── */
  const openProfile = async (p: Patient) => {
    setViewPatient(p); setProfileTab('info'); setEditMode(false); setFamilyError(''); setShowFamilyForm(false);
    setProfileLoading(true);
    try {
      const res  = await fetch(`/api/clinic/staff-patients/${p.id}?activeRole=STAFF`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setProfileData(json.data);
        const d = json.data as Record<string, unknown> & { user: { name: string; phoneNumber: string }; dateOfBirth?: string; gender?: string; bloodType?: string; allergies?: string };
        const { prefix, local } = splitPhone(d.user?.phoneNumber ?? '');
        setEditPhonePrefix(prefix); setEditPhoneLocal(local);
        setEditForm({ name: d.user?.name ?? '', dob: d.dateOfBirth ? String(d.dateOfBirth).split('T')[0] : '', gender: d.gender ?? '', bloodType: d.bloodType ?? '', allergies: d.allergies ?? '' });
      }
    } catch { /* silent */ }
    finally { setProfileLoading(false); }
  };

  /* ── Save profile edit ── */
  const saveEdit = async () => {
    if (!viewPatient) return;
    const nameErr = validateFullName(editForm.name);
    const telErr  = validateLocalPhone(editPhoneLocal);
    if (nameErr || telErr) { setEditError(nameErr ?? telErr ?? ''); return; }
    setEditError('');
    setEditSaving(true);
    try {
      const res  = await fetch('/api/clinic/staff-patients?activeRole=STAFF', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: viewPatient.id, name: editForm.name, phoneNumber: buildPhone(editPhonePrefix, editPhoneLocal), dateOfBirth: editForm.dob || undefined, gender: editForm.gender || undefined, bloodType: editForm.bloodType || undefined, allergies: editForm.allergies || undefined }),
      });
      const json = await res.json();
      if (json.success) {
        setEditMode(false);
        setProfileData(json.data);
        showSuccess('تم حفظ التعديلات');
        fetchPatients();
      }
    } catch { /* silent */ }
    finally { setEditSaving(false); }
  };

  /* ── Add family member ── */
  const addFamilyMember = async () => {
    if (!viewPatient || !familyNid.trim()) return;
    setAddingFamily(true); setFamilyError('');
    try {
      const res  = await fetch(`/api/clinic/staff-patients/${viewPatient.id}?activeRole=STAFF`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dependentNationalId: familyNid.trim(), relationship: familyRel, direction: familyDir }),
      });
      const json = await res.json();
      if (json.success) {
        setFamilyNid(''); setShowFamilyForm(false);
        await openProfile(viewPatient);
        showSuccess('تمت إضافة فرد العائلة');
      } else {
        setFamilyError(json.error?.message ?? 'تعذرت الإضافة');
      }
    } catch { setFamilyError('تعذر الاتصال بالخادم'); }
    finally { setAddingFamily(false); }
  };

  /* ── Patient booking: load clinics when form opens ── */
  useEffect(() => {
    if (!showPatientBook) return;
    fetch('/api/doctor/clinics?activeRole=STAFF', { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success && j.data.length) { setPtBookClinics(j.data); setPtBookClinic(String(j.data[0].id)); } })
      .catch(() => {});
  }, [showPatientBook]);

  useEffect(() => {
    if (!ptBookClinic) return;
    setPtBookBranch('');
    setPtBookBranches([]);
    setPtBookDoctors([]);
    let cancelled = false;
    fetch(`/api/clinic/branches?clinicId=${ptBookClinic}&activeRole=STAFF`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (!cancelled && j.success && j.data.length) { setPtBookBranches(j.data); setPtBookBranch(String(j.data[0].id)); } })
      .catch(() => {});
    fetch(`/api/clinic/services?clinicId=${ptBookClinic}&activeRole=STAFF`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (!cancelled && j.success && j.data.length) { setPtBookServices(j.data); setPtBookService(String(j.data[0].id)); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [ptBookClinic]);

  useEffect(() => {
    if (!ptBookClinic || !ptBookBranch) return;
    let cancelled = false;
    fetch(`/api/clinic/doctors?clinicId=${ptBookClinic}&branchId=${ptBookBranch}&activeRole=STAFF`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (!cancelled && j.success && j.data.length) { setPtBookDoctors(j.data); setPtBookDoctor(String(j.data[0].id)); } })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [ptBookClinic, ptBookBranch]);

  useEffect(() => {
    if (!ptBookBranch || !ptBookDoctor || !ptBookDate) { setPtBookSlots([]); return; }
    setPtBookLoadingSlots(true); setPtBookSlot('');
    fetch(`/api/time-slots?branchId=${ptBookBranch}&doctorId=${ptBookDoctor}&date=${ptBookDate}`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success) setPtBookSlots((j.data ?? []).map((s: {id:number;time:string}) => ({ id: s.id, time: s.time }))); })
      .catch(() => {})
      .finally(() => setPtBookLoadingSlots(false));
  }, [ptBookBranch, ptBookDoctor, ptBookDate]);

  const confirmPatientBooking = async () => {
    if (!viewPatient || !ptBookSlot || !ptBookService) return;
    setPtBooking(true); setPtBookError('');
    try {
      const res  = await fetch('/api/clinic/staff-bookings?activeRole=STAFF', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: viewPatient.id, slotId: Number(ptBookSlot), serviceId: Number(ptBookService), notes: ptBookNotes }),
      });
      const json = await res.json();
      if (json.success) {
        setShowPatientBook(false);
        setPtBookSlot(''); setPtBookNotes('');
        await openProfile(viewPatient);
        showSuccess('تم حجز الموعد بنجاح');
      } else {
        setPtBookError(json.error?.message ?? 'تعذر الحجز');
      }
    } catch { setPtBookError('تعذر الاتصال'); }
    finally { setPtBooking(false); }
  };

  /* ── Family search debounce ── */
  useEffect(() => {
    const q = familySearch.trim();
    if (q.length < 2) { setFamilySearchResults([]); setShowFamilyDropdown(false); return; }
    const t = setTimeout(async () => {
      setFamilySearching(true);
      try {
        const res  = await fetch(`/api/clinic/staff-patients?search=${encodeURIComponent(q)}&activeRole=STAFF`, { credentials: 'include' });
        const json = await res.json();
        if (json.success) { setFamilySearchResults(json.data ?? []); setShowFamilyDropdown(true); }
      } catch { /* silent */ }
      finally { setFamilySearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [familySearch]);

  /* ── Remove family link ── */
  const removeFamilyLink = async (linkId: number) => {
    if (!viewPatient) return;
    try {
      await fetch(`/api/clinic/staff-patients/${viewPatient.id}?linkId=${linkId}&activeRole=STAFF`, { method: 'DELETE', credentials: 'include' });
      await openProfile(viewPatient);
      showSuccess('تم حذف العلاقة');
    } catch { /* silent */ }
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
                          <p className="text-xs text-muted-foreground text-right" dir="rtl">{formatPhone(p.user.phoneNumber)}</p>
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
                      <button onClick={() => openProfile(p)} className="text-xs text-primary hover:underline">ملف</button>
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

      {/* ── Full Patient Profile Modal ── */}
      {viewPatient && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl border border-border max-h-[92vh] flex flex-col" dir="rtl">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold flex-shrink-0 ${viewPatient.gender === 'male' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'bg-pink-100 dark:bg-pink-900/30 text-pink-600'}`}>
                  {viewPatient.user.name.charAt(0)}
                </div>
                <div>
                  <h2 className="font-bold text-base leading-tight">{viewPatient.user.name}</h2>
                  <p className="text-xs text-muted-foreground">
                    {viewPatient.gender === 'male' ? 'ذكر' : viewPatient.gender === 'female' ? 'أنثى' : ''}
                    {calcAge(viewPatient.dateOfBirth) != null ? ` · ${calcAge(viewPatient.dateOfBirth)} سنة` : ''}
                  </p>
                </div>
              </div>
              <button onClick={() => { setViewPatient(null); setProfileData(null); setEditMode(false); }}>
                <XIcon className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-border flex-shrink-0">
              {(['info', 'appointments', 'family'] as const).map(t => (
                <button key={t} onClick={() => setProfileTab(t)}
                  className={`flex-1 py-2.5 text-sm font-medium transition-colors ${profileTab === t ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  {t === 'info' ? 'البيانات' : t === 'appointments' ? 'المواعيد' : 'العائلة'}
                </button>
              ))}
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              {profileLoading ? (
                <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
              ) : (
                <>
                  {/* ── Info Tab ── */}
                  {profileTab === 'info' && (
                    <div className="space-y-4">
                      {!editMode ? (
                        <>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                            {[
                              ['الهوية', (profileData as Record<string,unknown> | null)?.nationalId as string ?? viewPatient.user.id],
                              ['الهاتف', formatPhone(viewPatient.user.phoneNumber)],
                              ['تاريخ الميلاد', viewPatient.dateOfBirth ? viewPatient.dateOfBirth.split('T')[0] : '—'],
                              ['الجنس', viewPatient.gender === 'male' ? 'ذكر' : viewPatient.gender === 'female' ? 'أنثى' : '—'],
                              ['فصيلة الدم', ((profileData as Record<string,unknown> | null)?.bloodType as string) || '—'],
                              ['الحساسية', ((profileData as Record<string,unknown> | null)?.allergies as string) || '—'],
                            ].map(([label, val]) => (
                              <div key={label} className="bg-secondary/30 rounded-xl px-4 py-3">
                                <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
                                <p className="font-medium">{String(val)}</p>
                              </div>
                            ))}
                          </div>
                          <button onClick={() => setEditMode(true)}
                            className="w-full py-2.5 border border-border rounded-xl text-sm hover:bg-secondary transition-colors">
                            تعديل البيانات
                          </button>
                        </>
                      ) : (
                        <div className="space-y-3">
                          {editError && (
                            <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{editError}</div>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-medium mb-1">الاسم الكامل (رباعي)</label>
                              <input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                                className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-medium mb-1">رقم الهاتف</label>
                              <div className="flex gap-1">
                                <select value={editPhonePrefix} onChange={e => setEditPhonePrefix(e.target.value)}
                                  className="w-36 px-2 py-2 text-xs border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                                  {PHONE_PREFIXES.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
                                </select>
                                <input value={editPhoneLocal} onChange={e => setEditPhoneLocal(e.target.value.replace(/\D/g,''))}
                                  placeholder="xxxxxxxx" dir="ltr" maxLength={10}
                                  className="flex-1 px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">تاريخ الميلاد</label>
                              <input type="date" value={editForm.dob} onChange={e => setEditForm(f => ({ ...f, dob: e.target.value }))}
                                className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">الجنس</label>
                              <select value={editForm.gender} onChange={e => setEditForm(f => ({ ...f, gender: e.target.value }))}
                                className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                                <option value="">اختر</option>
                                <option value="male">ذكر</option>
                                <option value="female">أنثى</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">فصيلة الدم</label>
                              <select value={editForm.bloodType} onChange={e => setEditForm(f => ({ ...f, bloodType: e.target.value }))}
                                className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                                <option value="">اختر</option>
                                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b} value={b}>{b}</option>)}
                              </select>
                            </div>
                            <div className="sm:col-span-2">
                              <label className="block text-xs font-medium mb-1">الحساسية</label>
                              <input value={editForm.allergies} onChange={e => setEditForm(f => ({ ...f, allergies: e.target.value }))} placeholder="أدخل الحساسية..."
                                className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button onClick={() => setEditMode(false)} className="flex-1 py-2 text-sm border border-border rounded-xl hover:bg-secondary">إلغاء</button>
                            <button onClick={saveEdit} disabled={editSaving} className="flex-1 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50">
                              {editSaving ? 'جاري الحفظ...' : 'حفظ'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Appointments Tab ── */}
                  {profileTab === 'appointments' && (
                    <div className="space-y-3">
                      {/* Existing appointments */}
                      {viewPatient.appointments.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">لا توجد مواعيد سابقة</p>
                      ) : viewPatient.appointments.map(a => (
                        <div key={a.id} className="flex items-center justify-between bg-secondary/30 rounded-xl p-3 text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-muted-foreground text-xs flex-shrink-0" dir="ltr">{fmtDate(a.appointmentDate)}</span>
                            <span className="font-medium truncate">{a.service?.name ?? '—'}</span>
                          </div>
                          <span className="text-xs text-muted-foreground flex-shrink-0">{apptStatusLabel[a.status] ?? a.status}</span>
                        </div>
                      ))}

                      {/* Book new appointment */}
                      {!showPatientBook ? (
                        <button onClick={() => { setShowPatientBook(true); setPtBookError(''); }}
                          className="w-full py-2.5 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                          + حجز موعد جديد
                        </button>
                      ) : (
                        <div className="border border-border rounded-xl p-4 space-y-3 bg-secondary/20">
                          <p className="text-xs font-semibold">حجز موعد جديد</p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs font-medium mb-1">العيادة</label>
                              <select value={ptBookClinic} onChange={e => setPtBookClinic(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                                {ptBookClinics.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">الفرع</label>
                              <select value={ptBookBranch} onChange={e => setPtBookBranch(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                                {ptBookBranches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">الطبيب</label>
                              <select value={ptBookDoctor} onChange={e => setPtBookDoctor(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                                {ptBookDoctors.map(d => <option key={d.id} value={String(d.id)}>{d.user.name}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1">التاريخ</label>
                              <input type="date" value={ptBookDate} min={new Date().toISOString().split('T')[0]}
                                onChange={e => setPtBookDate(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                            </div>
                          </div>

                          {/* Slots */}
                          <div>
                            <label className="block text-xs font-medium mb-2">المواعيد المتاحة</label>
                            {ptBookLoadingSlots ? (
                              <div className="flex justify-center py-3"><div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>
                            ) : ptBookSlots.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-2 border border-border rounded-xl">لا توجد مواعيد متاحة</p>
                            ) : (
                              <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5">
                                {ptBookSlots.map(s => (
                                  <button key={s.id} onClick={() => setPtBookSlot(String(s.id))}
                                    className={`py-2 rounded-lg text-xs font-mono font-medium border transition-all ${ptBookSlot === String(s.id) ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/50 bg-background'}`}>
                                    {s.time}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Service */}
                          <div>
                            <label className="block text-xs font-medium mb-1">الخدمة</label>
                            <select value={ptBookService} onChange={e => setPtBookService(e.target.value)}
                              className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                              {ptBookServices.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                            </select>
                          </div>

                          {/* Notes */}
                          <div>
                            <label className="block text-xs font-medium mb-1">ملاحظات</label>
                            <textarea value={ptBookNotes} onChange={e => setPtBookNotes(e.target.value)} rows={2} placeholder="اختياري..."
                              className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                          </div>

                          {ptBookError && <p className="text-xs text-red-600">{ptBookError}</p>}

                          <div className="flex gap-2">
                            <button onClick={() => { setShowPatientBook(false); setPtBookError(''); }}
                              className="flex-1 py-2 text-sm border border-border rounded-xl hover:bg-secondary">إلغاء</button>
                            <button onClick={confirmPatientBooking} disabled={ptBooking || !ptBookSlot || !ptBookService}
                              className="flex-1 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50">
                              {ptBooking ? 'جاري الحجز...' : 'تأكيد الحجز'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Family Tab ── */}
                  {profileTab === 'family' && (
                    <div className="space-y-4">
                      {(() => {
                        const pd = profileData as Record<string,unknown> | null;
                        const guardians   = (pd?.guardians   as unknown[]) ?? [];
                        const asGuardian  = (pd?.asGuardian  as unknown[]) ?? [];
                        const relLabel: Record<string, string> = {
                          CHILD: 'ابن / ابنة', PARENT: 'والد / والدة', SPOUSE: 'زوج / زوجة',
                          SIBLING: 'أخ / أخت', GRANDPARENT: 'جد / جدة', OTHER: 'أخرى',
                        };
                        const FamilyCard = ({ name, rel, status, onRemove }: { name: string; rel: string; status: string; onRemove: () => void }) => (
                          <div className="flex items-center justify-between bg-secondary/40 rounded-xl px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                                {name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium text-sm">{name}</p>
                                <p className="text-xs text-muted-foreground">{relLabel[rel] ?? rel}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status === 'APPROVED' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}`}>
                                {status === 'APPROVED' ? 'مفعّل' : 'معلّق'}
                              </span>
                              <button onClick={onRemove} className="text-xs text-red-500 hover:text-red-700 transition-colors">حذف</button>
                            </div>
                          </div>
                        );
                        return (
                          <>
                            {guardians.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-2">أولياء الأمر</p>
                                <div className="space-y-2">
                                  {guardians.map((g: unknown) => {
                                    const guardian = g as { id: number; relationship: string; status: string; guardianUser: { name: string } };
                                    return <FamilyCard key={guardian.id} name={guardian.guardianUser.name} rel={guardian.relationship} status={guardian.status} onRemove={() => removeFamilyLink(guardian.id)} />;
                                  })}
                                </div>
                              </div>
                            )}
                            {asGuardian.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-muted-foreground mb-2">تحت رعايته</p>
                                <div className="space-y-2">
                                  {asGuardian.map((g: unknown) => {
                                    const dep = g as { id: number; relationship: string; status: string; dependentPatient: { user: { name: string } } };
                                    return <FamilyCard key={dep.id} name={dep.dependentPatient.user.name} rel={dep.relationship} status={dep.status} onRemove={() => removeFamilyLink(dep.id)} />;
                                  })}
                                </div>
                              </div>
                            )}
                            {guardians.length === 0 && asGuardian.length === 0 && !showFamilyForm && (
                              <div className="text-center py-6">
                                <div className="w-12 h-12 rounded-full bg-secondary mx-auto mb-3 flex items-center justify-center text-xl select-none">👨‍👩‍👧</div>
                                <p className="text-sm font-medium text-foreground mb-1">لا توجد علاقات عائلية</p>
                                <p className="text-xs text-muted-foreground">يمكنك ربط أفراد العائلة لتسهيل إدارة المواعيد</p>
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {/* Add family form */}
                      {!showFamilyForm ? (
                        <button onClick={() => setShowFamilyForm(true)}
                          className="w-full py-2.5 border border-dashed border-border rounded-xl text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                          + إضافة فرد عائلة
                        </button>
                      ) : (
                        <div className="border border-border rounded-xl overflow-hidden">
                          <div className="px-4 py-3 bg-secondary/30 border-b border-border">
                            <p className="text-sm font-semibold">إضافة فرد عائلة</p>
                          </div>
                          <div className="p-4 space-y-4">
                            <div className="relative">
                              <label className="block text-xs font-medium mb-1.5">
                                ابحث عن الشخص <span className="text-red-500">*</span>
                                <span className="font-normal text-muted-foreground"> (اسم، هاتف، أو رقم هوية)</span>
                              </label>
                              {familySelectedName ? (
                                <div className="flex items-center justify-between px-3 py-2.5 border border-primary bg-primary/5 rounded-xl text-sm">
                                  <div>
                                    <span className="font-medium">{familySelectedName}</span>
                                    <span className="text-xs text-muted-foreground mr-2" dir="ltr">{familyNid}</span>
                                  </div>
                                  <button type="button" onClick={() => { setFamilySelectedName(''); setFamilyNid(''); setFamilySelectedDob(null); setFamilySearch(''); setFamilySearchResults([]); }}
                                    className="text-xs text-red-500 hover:text-red-700 transition-colors">تغيير</button>
                                </div>
                              ) : (
                                <>
                                  <div className="relative">
                                    <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                                    <input
                                      value={familySearch}
                                      onChange={e => { setFamilySearch(e.target.value); setFamilySelectedName(''); setFamilyNid(''); }}
                                      placeholder="اكتب الاسم أو رقم الهوية..."
                                      className="w-full pr-9 pl-4 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    {familySearching && (
                                      <div className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    )}
                                  </div>
                                  {showFamilyDropdown && familySearchResults.filter(pt => pt.id !== viewPatient?.id).length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
                                      {familySearchResults.filter(pt => pt.id !== viewPatient?.id).map(pt => (
                                        <button key={pt.id} type="button"
                                          onMouseDown={() => { setFamilySelectedName(pt.user.name); setFamilyNid(pt.nationalId); setFamilySelectedDob(pt.dateOfBirth ?? null); setFamilySearch(''); setShowFamilyDropdown(false); }}
                                          className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-secondary/50 transition-colors text-right">
                                          <div>
                                            <p className="font-medium">{pt.user.name}</p>
                                            <p className="text-xs text-muted-foreground" dir="ltr">{formatPhone(pt.user.phoneNumber)}</p>
                                          </div>
                                          <span className="text-xs text-muted-foreground font-mono">{pt.nationalId}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  {showFamilyDropdown && familySearchResults.filter(pt => pt.id !== viewPatient?.id).length === 0 && !familySearching && (
                                    <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-xl shadow-lg px-4 py-3 text-sm text-muted-foreground text-center">
                                      لا توجد نتائج
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                            <div>
                              <label className="block text-xs font-medium mb-1.5">صلة القرابة بالمريض</label>
                              <select value={familyRel} onChange={e => setFamilyRel(e.target.value)}
                                className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                                <option value="PARENT">والد / والدة</option>
                                <option value="CHILD">ابن / ابنة</option>
                                <option value="SPOUSE">زوج / زوجة</option>
                                <option value="SIBLING">أخ / أخت</option>
                                <option value="GRANDPARENT">جد / جدة</option>
                                <option value="OTHER">علاقة أخرى</option>
                              </select>
                            </div>
                            {(() => {
                              const addedAge = familySelectedDob
                                ? Math.floor((Date.now() - new Date(familySelectedDob).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
                                : null;
                              const canBeGuardian = addedAge === null || addedAge >= 18;
                              return (
                                <div>
                                  <label className="block text-xs font-medium mb-2">من المسؤول عن الآخر؟</label>
                                  <div className="space-y-2">
                                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${familyDir === 'guardian-of' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                                      <input type="radio" name="familyDir" value="guardian-of" checked={familyDir === 'guardian-of'} onChange={() => setFamilyDir('guardian-of')} className="mt-0.5 accent-primary flex-shrink-0" />
                                      <div>
                                        <p className="text-sm font-medium">{viewPatient?.user.name} هو الوصي</p>
                                        <p className="text-xs text-muted-foreground">المريض مسؤول عن الشخص المُضاف — مثل: المريض والد الطفل</p>
                                      </div>
                                    </label>
                                    <label className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${!canBeGuardian ? 'opacity-40 cursor-not-allowed' : `cursor-pointer ${familyDir === 'dependent-of' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}`}>
                                      <input type="radio" name="familyDir" value="dependent-of" checked={familyDir === 'dependent-of'} onChange={() => setFamilyDir('dependent-of')} disabled={!canBeGuardian} className="mt-0.5 accent-primary flex-shrink-0" />
                                      <div>
                                        <p className="text-sm font-medium">الشخص المُضاف هو الوصي</p>
                                        {!canBeGuardian
                                          ? <p className="text-xs text-amber-600 dark:text-amber-400">لا ينطبق — عمر الشخص المُضاف {addedAge} سنة (أقل من 18)</p>
                                          : <p className="text-xs text-muted-foreground">الشخص المُضاف مسؤول عن {viewPatient?.user.name} — مثل: الشخص المُضاف والد المريض</p>
                                        }
                                      </div>
                                    </label>
                                  </div>
                                </div>
                              );
                            })()}
                            {familyError && (
                              <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-xl">{familyError}</div>
                            )}
                          </div>
                          <div className="flex gap-2 px-4 py-3 border-t border-border bg-secondary/20">
                            <button onClick={() => { setShowFamilyForm(false); setFamilyNid(''); setFamilySearch(''); setFamilySelectedName(''); setFamilySelectedDob(null); setFamilySearchResults([]); setFamilyError(''); }}
                              className="flex-1 py-2 text-sm border border-border rounded-xl hover:bg-secondary transition-colors">إلغاء</button>
                            <button onClick={addFamilyMember} disabled={addingFamily || !familyNid.trim()}
                              className="flex-1 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors">
                              {addingFamily ? 'جاري الإضافة...' : 'إضافة'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex justify-end px-5 py-4 border-t border-border flex-shrink-0">
              <button onClick={() => { setViewPatient(null); setProfileData(null); setEditMode(false); }}
                className="px-4 py-2 text-sm border border-border rounded-xl hover:bg-secondary">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Patient Modal (National ID based) ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4">
          <div className="bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md border border-border max-h-[92vh] flex flex-col" dir="rtl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <h2 className="font-bold text-base">تسجيل مريض</h2>
              <button onClick={() => { setShowAddModal(false); resetAddModal(); }}><XIcon className="w-5 h-5 text-muted-foreground" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* Step 1: NID search */}
              <div>
                <label className="block text-sm font-medium mb-1">رقم الهوية *</label>
                <div className="flex gap-2">
                  <input value={addNid} onChange={e => { setAddNid(e.target.value); setAddFoundPt(null); setShowAddForm(false); }}
                    onKeyDown={e => e.key === 'Enter' && searchAddNid()}
                    placeholder="أدخل رقم الهوية..."
                    className="flex-1 px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                  <button onClick={searchAddNid} disabled={addSearching || !addNid.trim()}
                    className="px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl disabled:opacity-50">
                    {addSearching ? '...' : 'بحث'}
                  </button>
                </div>
              </div>

              {/* Found existing patient */}
              {addFoundPt && (
                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 text-sm space-y-1">
                  <p className="text-amber-700 dark:text-amber-400 font-medium text-xs mb-2">⚠ هذا الرقم مسجّل مسبقاً</p>
                  <p><span className="text-muted-foreground">الاسم: </span><strong>{(addFoundPt as Record<string,unknown> & { user: { name: string } }).user?.name}</strong></p>
                  <p><span className="text-muted-foreground">الهاتف: </span>{formatPhone(String((addFoundPt as Record<string,unknown> & { user: { phoneNumber: string } }).user?.phoneNumber ?? ''))}</p>
                  <p className="text-xs text-muted-foreground mt-1">يمكنك البحث عنه في القائمة وتعديل بياناته من هناك.</p>
                </div>
              )}

              {/* Create new patient form */}
              {showAddForm && !addFoundPt && (
                <>
                  {addError && <div className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-xl">{addError}</div>}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium mb-1">الاسم الكامل *</label>
                      <input value={addForm.name} onChange={e => setAddForm(f => ({...f, name: e.target.value}))} placeholder="الاسم الرباعي" className={inp} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-medium mb-1">رقم الهاتف *</label>
                      <div className="flex gap-1">
                        <select value={addPhonePrefix} onChange={e => setAddPhonePrefix(e.target.value)}
                          className="w-36 px-2 py-2 text-xs border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                          {PHONE_PREFIXES.map(p => <option key={p.code} value={p.code}>{p.label}</option>)}
                        </select>
                        <input value={addPhoneLocal} onChange={e => setAddPhoneLocal(e.target.value.replace(/\D/g,''))}
                          placeholder="xxxxxxxx" dir="ltr" maxLength={10}
                          className="flex-1 px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">تاريخ الميلاد</label>
                      <input type="date" value={addForm.birthDate} onChange={e => setAddForm(f => ({...f, birthDate: e.target.value}))} className={inp} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">الجنس</label>
                      <select value={addForm.gender} onChange={e => setAddForm(f => ({...f, gender: e.target.value}))} className={inp}>
                        <option value="male">ذكر</option>
                        <option value="female">أنثى</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">فصيلة الدم</label>
                      <select value={addForm.bloodType} onChange={e => setAddForm(f => ({...f, bloodType: e.target.value}))} className={inp}>
                        <option value="">اختر</option>
                        {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1">البريد الإلكتروني</label>
                      <input type="email" value={addForm.email} onChange={e => setAddForm(f => ({...f, email: e.target.value}))} dir="ltr" className={inp} />
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-border flex-shrink-0">
              <button onClick={() => { setShowAddModal(false); resetAddModal(); }} className="flex-1 py-2.5 text-sm border border-border rounded-xl hover:bg-secondary">إلغاء</button>
              {showAddForm && !addFoundPt && (
                <button onClick={handleAddPatient} disabled={!addForm.name.trim() || !addPhoneLocal.trim() || addLoading}
                  className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 disabled:opacity-50">
                  {addLoading ? 'جاري التسجيل...' : 'تسجيل المريض'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}