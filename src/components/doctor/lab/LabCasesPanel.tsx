'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LabCase {
  id:            number;
  labName:       string;
  caseType:      string;
  status:        LabCaseStatus;
  cost:          number | null;
  sentDate:      string | null;
  deliveryDate:  string | null;
  notesPublic:   string | null;
  notesInternal: string | null;
  createdAt:     string;
  treatment: {
    id:        number;
    diagnosis: string | null;
    appointment: {
      id:              string;
      appointmentDate: string;
      appointmentTime: string;
      patient: { id: number; user: { name: string; phoneNumber: string } };
      doctor:  { id: number; user: { name: string } };
      service: { name: string };
    };
  };
}

type LabCaseStatus = 'PENDING' | 'SENT' | 'IN_PROGRESS' | 'READY' | 'DELIVERED' | 'CANCELLED';

interface Pagination { page: number; pageSize: number; total: number; pages: number }

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<LabCaseStatus, string> = {
  PENDING:     'قيد الانتظار',
  SENT:        'أُرسل للمختبر',
  IN_PROGRESS: 'قيد التصنيع',
  READY:       'جاهز للاستلام',
  DELIVERED:   'تم التسليم',
  CANCELLED:   'ملغى',
};

const STATUS_COLORS: Record<LabCaseStatus, string> = {
  PENDING:     'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
  SENT:        'bg-blue-100   dark:bg-blue-900/20   text-blue-700   dark:text-blue-300',
  IN_PROGRESS: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
  READY:       'bg-green-100  dark:bg-green-900/20  text-green-700  dark:text-green-300',
  DELIVERED:   'bg-teal-100   dark:bg-teal-900/20   text-teal-700   dark:text-teal-300',
  CANCELLED:   'bg-red-100    dark:bg-red-900/20    text-red-700    dark:text-red-300',
};

const STATUS_FLOW: Partial<Record<LabCaseStatus, LabCaseStatus>> = {
  PENDING:     'SENT',
  SENT:        'IN_PROGRESS',
  IN_PROGRESS: 'READY',
  READY:       'DELIVERED',
};

const STATUS_NEXT_LABEL: Partial<Record<LabCaseStatus, string>> = {
  PENDING:     'إرسال للمختبر',
  SENT:        'بدء التصنيع',
  IN_PROGRESS: 'جاهز',
  READY:       'تسليم',
};

// Button color matches the NEXT status color
const STATUS_NEXT_BTN: Partial<Record<LabCaseStatus, string>> = {
  PENDING:     'bg-blue-600   hover:bg-blue-700   text-white',
  SENT:        'bg-purple-600 hover:bg-purple-700 text-white',
  IN_PROGRESS: 'bg-green-600  hover:bg-green-700  text-white',
  READY:       'bg-teal-600   hover:bg-teal-700   text-white',
};

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  const local  = digits.startsWith('970') && digits.length === 12 ? digits.slice(3)
               : digits.startsWith('0')   && digits.length === 10 ? digits.slice(1)
               : digits;
  return local.length === 9
    ? `+970-${local.slice(0,3)}-${local.slice(3,6)}-${local.slice(6,9)}`
    : phone;
}

type SortField = 'createdAt' | 'labName' | 'cost' | 'deliveryDate';

// ── Modal: Add Lab Case ────────────────────────────────────────────────────────

interface AddModalProps {
  treatmentId: number;
  labNames:    string[];
  caseTypes:   string[];
  onClose: () => void;
  onSaved: () => void;
}

function AddLabCaseModal({ treatmentId, labNames, caseTypes, onClose, onSaved }: AddModalProps) {
  const [form, setForm] = useState({
    labName: '', caseType: '', cost: '', deliveryDate: '', notesPublic: '', notesInternal: '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.labName || !form.caseType) { setError('اسم المختبر ونوع الحالة مطلوبان'); return; }
    setSaving(true); setError(null);
    try {
      const res = await fetch('/api/clinic/lab-cases', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ treatmentId, ...form }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'حدث خطأ');
      onSaved();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-xl" dir="rtl">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-bold text-lg">إضافة حالة مختبر</h3>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">اسم المختبر *</label>
              <select value={form.labName} onChange={e => set('labName', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">-- اختر مختبراً --</option>
                {labNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">نوع الحالة *</label>
              <select value={form.caseType} onChange={e => set('caseType', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">-- اختر النوع --</option>
                {caseTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">التكلفة (₪)</label>
              <input type="number" value={form.cost} onChange={e => set('cost', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm" placeholder="0" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">موعد التسليم المتوقع</label>
              <input type="date" value={form.deliveryDate} onChange={e => set('deliveryDate', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">ملاحظات (للمريض)</label>
            <textarea value={form.notesPublic} onChange={e => set('notesPublic', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">ملاحظات داخلية</label>
            <textarea value={form.notesInternal} onChange={e => set('notesInternal', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none" />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary text-sm">إلغاء</button>
          <button onClick={submit} disabled={saving}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50">
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: Edit Lab Case ───────────────────────────────────────────────────────

interface EditModalProps {
  labCase:   LabCase;
  labNames:  string[];
  caseTypes: string[];
  onClose:   () => void;
  onSaved:   () => void;
}

function EditLabCaseModal({ labCase, labNames, caseTypes, onClose, onSaved }: EditModalProps) {
  const [form, setForm] = useState({
    labName:       labCase.labName,
    caseType:      labCase.caseType,
    cost:          labCase.cost?.toString()     || '',
    deliveryDate:  labCase.deliveryDate?.split('T')[0] || '',
    notesPublic:   labCase.notesPublic   || '',
    notesInternal: labCase.notesInternal || '',
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      const res = await fetch(`/api/clinic/lab-cases/${labCase.id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'حدث خطأ');
      onSaved();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-xl" dir="rtl">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-bold text-lg">تعديل حالة المختبر</h3>
          <p className="text-sm text-muted-foreground">{labCase.labName}</p>
        </div>
        <div className="p-5 space-y-4">
          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">اسم المختبر</label>
              <select value={form.labName} onChange={e => set('labName', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {labNames.map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">نوع الحالة</label>
              <select value={form.caseType} onChange={e => set('caseType', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {caseTypes.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">التكلفة (₪)</label>
              <input type="number" value={form.cost} onChange={e => set('cost', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">موعد التسليم المتوقع</label>
              <input type="date" value={form.deliveryDate} onChange={e => set('deliveryDate', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">ملاحظات (للمريض)</label>
            <textarea value={form.notesPublic} onChange={e => set('notesPublic', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">ملاحظات داخلية</label>
            <textarea value={form.notesInternal} onChange={e => set('notesInternal', e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm resize-none" />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-secondary text-sm">إلغاء</button>
          <button onClick={submit} disabled={saving}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm disabled:opacity-50">
            {saving ? 'جاري الحفظ...' : 'حفظ'}
          </button>
        </div>
      </div>
    </div>
  );
}

interface Clinic { id: number; name: string }
interface Branch { id: number; name: string }

// ── Main Component ─────────────────────────────────────────────────────────────

export default function LabCasesPanel() {
  const [labCases,   setLabCases]   = useState<LabCase[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, pages: 1 });
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [page,       setPage]       = useState(1);

  // Clinic / Branch
  const [clinics,          setClinics]          = useState<Clinic[]>([]);
  const [branches,         setBranches]         = useState<Branch[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState('all');
  const [selectedBranchId, setSelectedBranchId] = useState('all');

  // Filters
  const [searchInput,   setSearchInput]   = useState('');
  const [search,        setSearch]        = useState('');
  const [statusFilter,  setStatusFilter]  = useState('ALL');
  const [caseTypeFilter,setCaseTypeFilter]= useState('ALL');
  const [sortBy,        setSortBy]        = useState<SortField>('createdAt');
  const [sortDir,       setSortDir]       = useState<'asc'|'desc'>('desc');
  const [caseTypes,     setCaseTypes]     = useState<string[]>([]);
  const [labNames,      setLabNames]      = useState<string[]>([]);
  const [labNameFilter, setLabNameFilter] = useState('ALL');
  const [fromDate,      setFromDate]      = useState('');
  const [toDate,        setToDate]        = useState('');

  // Modals
  const [addForTreatmentId, setAddForTreatmentId] = useState<number | null>(null);
  const [editingCase,       setEditingCase]        = useState<LabCase | null>(null);
  const [updatingId,        setUpdatingId]         = useState<number | null>(null);

  // Load clinics
  useEffect(() => {
    fetch('/api/doctor/clinics', { credentials: 'include' })
      .then(r => r.json())
      .then(json => { if (json.success) setClinics(json.data); })
      .catch(() => {});
  }, []);

  // Load branches when clinic changes — reset branch only
  useEffect(() => {
    setBranches([]);
    setSelectedBranchId('all');
    setPage(1);
    if (selectedClinicId === 'all') return;
    fetch(`/api/clinic/branches?clinicId=${selectedClinicId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => { if (json.success) setBranches(json.data); })
      .catch(() => {});
  }, [selectedClinicId]);

  // Debounce search
  useEffect(() => {
    const t = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const queryString = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), pageSize: '20', sortBy, sortDir });
    if (search)                        p.set('search',   search);
    if (statusFilter   !== 'ALL')      p.set('status',   statusFilter);
    if (caseTypeFilter !== 'ALL')      p.set('caseType', caseTypeFilter);
    if (labNameFilter  !== 'ALL')      p.set('labName',  labNameFilter);
    if (fromDate)                      p.set('from',     fromDate);
    if (toDate)                        p.set('to',       toDate);
    if (selectedClinicId !== 'all')    p.set('clinicId', selectedClinicId);
    if (selectedBranchId !== 'all')    p.set('branchId', selectedBranchId);
    return p.toString();
  }, [page, search, statusFilter, caseTypeFilter, labNameFilter, fromDate, toDate, sortBy, sortDir, selectedClinicId, selectedBranchId]);

  const fetchLabCases = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const res  = await fetch(`/api/clinic/lab-cases?${queryString}`, { credentials: 'include' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'تعذر التحميل');
      setLabCases(json.data);
      setPagination(json.pagination);
      if (json.caseTypes) setCaseTypes(json.caseTypes);
      if (json.labNames)  setLabNames(json.labNames);
    } catch (e: any) { setError(e.message); }
    finally { setIsLoading(false); }
  }, [queryString]);

  useEffect(() => { fetchLabCases(); }, [fetchLabCases]);

  // Quick status advance
  const advanceStatus = async (lc: LabCase) => {
    const next = STATUS_FLOW[lc.status];
    if (!next) return;
    setUpdatingId(lc.id);
    try {
      const res  = await fetch(`/api/clinic/lab-cases/${lc.id}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      const json = await res.json();
      if (json.success) setLabCases(prev => prev.map(c => c.id === lc.id ? { ...c, status: next } : c));
    } catch { /* silent */ }
    finally { setUpdatingId(null); }
  };

  return (
    <div className="space-y-4" dir="rtl">
      {/* ── Filters ── */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">

        {/* Row 1: search */}
        <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
          placeholder="بحث باسم المريض أو المختبر أو نوع الحالة..."
          className="w-full px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />

        {/* Row 2: 4-col grid — حالة | نوع | مختبر | عيادة */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">الحالة</label>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="ALL">كل الحالات</option>
              {(Object.entries(STATUS_LABELS) as [LabCaseStatus, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">نوع الحالة</label>
            <select value={caseTypeFilter} onChange={e => { setCaseTypeFilter(e.target.value); setPage(1); }}
              className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="ALL">كل الأنواع</option>
              {caseTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">المختبر</label>
            <select value={labNameFilter} onChange={e => { setLabNameFilter(e.target.value); setPage(1); }}
              className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="ALL">كل المختبرات</option>
              {labNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">العيادة</label>
            <select value={selectedClinicId} onChange={e => { setSelectedClinicId(e.target.value); setPage(1); }}
              className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="all">جميع العيادات</option>
              {clinics.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
          </div>
        </div>

        {/* Row 3: فرع | من تاريخ | إلى تاريخ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">الفرع</label>
            <select value={selectedBranchId} onChange={e => { setSelectedBranchId(e.target.value); setPage(1); }}
              disabled={selectedClinicId === 'all'}
              className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40 disabled:cursor-not-allowed">
              <option value="all">جميع الفروع</option>
              {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">من تاريخ</label>
            <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }}
              className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">إلى تاريخ</label>
            <input type="date" value={toDate} min={fromDate} onChange={e => { setToDate(e.target.value); setPage(1); }}
              className="w-full px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        {/* Row 4: ترتيب + تنظيف + عدد */}
        <div className="flex items-center gap-2 flex-wrap border-t border-border/50 pt-3">
          <label className="text-[10px] text-muted-foreground">ترتيب:</label>
          <select value={sortBy} onChange={e => { setSortBy(e.target.value as SortField); setPage(1); }}
            className="px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
            <option value="createdAt">تاريخ الإضافة</option>
            <option value="labName">الاسم</option>
            <option value="cost">السعر</option>
            <option value="deliveryDate">تاريخ التسليم</option>
          </select>
          <button onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg bg-background text-sm hover:bg-secondary transition-colors">
            <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
            <span className="text-xs text-muted-foreground">{sortDir === 'asc' ? 'تصاعدي' : 'تنازلي'}</span>
          </button>
          <div className="flex items-center gap-2 mr-auto">
            <span className="text-sm text-muted-foreground">{isLoading ? '...' : `${pagination.total} حالة`}</span>
            <button
              onClick={() => {
                setSearchInput(''); setSearch('');
                setStatusFilter('ALL'); setCaseTypeFilter('ALL'); setLabNameFilter('ALL');
                setFromDate(''); setToDate('');
                setSelectedClinicId('all'); setSelectedBranchId('all');
                setSortBy('createdAt'); setSortDir('desc');
                setPage(1);
              }}
              className="px-3 py-1.5 text-xs border border-border rounded-lg bg-secondary hover:bg-secondary/80 transition-colors"
            >
              تنظيف الفلاتر
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Lab Cases List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-card border border-border rounded-xl animate-pulse" />
          ))
        ) : labCases.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
            <p className="text-4xl mb-3">🔬</p>
            <p className="font-medium">لا توجد حالات مختبر</p>
            <p className="text-sm mt-1">يمكن إضافة حالات من صفحة سجل المواعيد</p>
          </div>
        ) : (
          labCases.map(lc => {
            const apt  = lc.treatment.appointment;
            const next = STATUS_FLOW[lc.status];
            return (
              <div key={lc.id} className="bg-card border border-border rounded-xl p-4 md:p-5 hover:shadow-md transition-all">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">

                  {/* Left: info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Patient + Lab */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-base">{apt.patient.user.name}</h3>
                        <p className="text-sm text-muted-foreground font-mono" dir="ltr">{formatPhone(apt.patient.user.phoneNumber)}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[lc.status]}`}>
                        {STATUS_LABELS[lc.status]}
                      </span>
                    </div>

                    {/* Lab details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">المختبر</p>
                        <p className="font-medium">{lc.labName}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">نوع الحالة</p>
                        <p className="font-medium">{lc.caseType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">موعد التسليم</p>
                        <p className="font-medium">{formatDate(lc.deliveryDate)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">التكلفة</p>
                        <p className="font-medium">{lc.cost ? `${lc.cost} ₪` : '—'}</p>
                      </div>
                    </div>

                    {/* Service + Doctor */}
                    <p className="text-xs text-muted-foreground">
                      {apt.service.name} — {apt.doctor.user.name} — {formatDate(apt.appointmentDate)}
                    </p>

                    {lc.notesPublic && (
                      <p className="text-xs bg-secondary/50 rounded-lg px-3 py-1.5 border border-border/50">
                        <span className="font-medium">ملاحظات: </span>{lc.notesPublic}
                      </p>
                    )}
                  </div>

                  {/* Right: actions */}
                  <div className="flex flex-wrap gap-2 flex-shrink-0">
                    {/* Advance status — color matches next status */}
                    {next && (
                      <button onClick={() => advanceStatus(lc)} disabled={updatingId === lc.id}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors ${STATUS_NEXT_BTN[lc.status] ?? 'bg-primary text-primary-foreground hover:bg-primary/90'}`}>
                        {updatingId === lc.id ? '...' : STATUS_NEXT_LABEL[lc.status]}
                      </button>
                    )}
                    {/* Edit — neutral secondary */}
                    <button onClick={() => setEditingCase(lc)}
                      className="px-3 py-1.5 bg-secondary text-foreground border border-border rounded-lg text-xs hover:bg-secondary/60 transition-colors">
                      تعديل
                    </button>
                    {/* Patient file — primary teal (navigation) */}
                    <Link href={`/doctor/patients?search=${encodeURIComponent(apt.patient.user.name)}`}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs hover:bg-primary/90 transition-colors">
                      ملف المريض
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {!isLoading && pagination.pages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 rounded-lg bg-secondary disabled:opacity-50 text-sm">السابق</button>
          <p className="text-sm text-muted-foreground">صفحة {pagination.page} من {pagination.pages}</p>
          <button disabled={page >= pagination.pages} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 rounded-lg bg-secondary disabled:opacity-50 text-sm">التالي</button>
        </div>
      )}

      {/* Modals */}
      {addForTreatmentId && (
        <AddLabCaseModal
          treatmentId={addForTreatmentId}
          labNames={labNames}
          caseTypes={caseTypes}
          onClose={() => setAddForTreatmentId(null)}
          onSaved={() => { setAddForTreatmentId(null); fetchLabCases(); }}
        />
      )}
      {editingCase && (
        <EditLabCaseModal
          labCase={editingCase}
          labNames={labNames}
          caseTypes={caseTypes}
          onClose={() => setEditingCase(null)}
          onSaved={() => { setEditingCase(null); fetchLabCases(); }}
        />
      )}
    </div>
  );
}