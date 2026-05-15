'use client';

import { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { XIcon, CheckCircleIcon, SearchIcon } from '@/components/Icons';
import { getToothNumberFromMesh } from '@/components/model3D/toothMapping';

const EnhancedTeethViewer = dynamic(
  () => import('@/components/model3D/DentalChart'),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-full text-muted-foreground text-sm">جاري تحميل النموذج...</div> }
);

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'FIXED_PROSTHODONTICS',    label: 'تركيبات ثابتة' },
  { value: 'REMOVABLE_PROSTHODONTICS',label: 'تركيبات متحركة (طارة)' },
  { value: 'ORTHO_APPLIANCES',        label: 'أجهزة تقويم وأطباق' },
] as const;

type Category = typeof CATEGORIES[number]['value'];

const WORK_TYPES: Record<Category, { value: string; label: string }[]> = {
  FIXED_PROSTHODONTICS: [
    { value: 'SINGLE_CROWN',   label: 'تاج' },
    { value: 'DENTAL_BRIDGE',  label: 'جسر' },
    { value: 'VENEER_EMAX',    label: 'قشرة / إيماكس' },
    { value: 'INLAY_ONLAY',    label: 'حشوة مختبر' },
    { value: 'IMPLANT_CROWN',  label: 'تاج زرعة' },
  ],
  REMOVABLE_PROSTHODONTICS: [
    { value: 'COMPLETE_DENTURE',        label: 'طقم كامل (طارة)' },
    { value: 'PARTIAL_ACRYLIC_DENTURE', label: 'طقم جزئي أكريل (طارة)' },
    { value: 'CAST_PARTIAL_DENTURE',    label: 'طقم كروم كوبلت (طارة)' },
    { value: 'FLEXIBLE_DENTURE',        label: 'طقم مرن (طارة)' },
  ],
  ORTHO_APPLIANCES: [
    { value: 'ORTHODONTIC_RETAINER', label: 'ريتينر' },
    { value: 'NIGHT_GUARD',          label: 'جبيرة ليلية' },
    { value: 'CLEAR_ALIGNERS',       label: 'تقويم شفاف' },
    { value: 'STUDY_MODEL',          label: 'موديل دراسي' },
  ],
};

const MATERIALS: Record<Category, { value: string; label: string }[]> = {
  FIXED_PROSTHODONTICS: [
    { value: 'ZIRCONIA_SOLID',    label: 'زيركون مصمت' },
    { value: 'ZIRCONIA_LAYERED',  label: 'زيركون متدرج' },
    { value: 'EMAX',              label: 'إيماكس' },
    { value: 'PFM',               label: 'PFM (خزف على معدن)' },
    { value: 'FULL_METAL_GOLD',   label: 'معدن / ذهب' },
    { value: 'TEMPORARY_ACRYLIC', label: 'أكريل مؤقت' },
  ],
  REMOVABLE_PROSTHODONTICS: [
    { value: 'ACRYLIC_RESIN',          label: 'أكريل' },
    { value: 'COBALT_CHROMIUM',         label: 'كروم كوبلت' },
    { value: 'THERMOPLASTIC_FLEXIBLE',  label: 'مرن (Valplast)' },
  ],
  ORTHO_APPLIANCES: [
    { value: 'HARD_ACRYLIC', label: 'أكريل صلب' },
    { value: 'SOFT_EVA',     label: 'EVA مرن' },
  ],
};

const VITA_SHADES = [
  'A1','A2','A3','A3.5','A4',
  'B1','B2','B3','B4',
  'C1','C2','C3','C4',
  'D2','D3','D4',
  'BL1','BL2','BL3','BL4',
];
const STUMP_SHADES = ['ND1','ND2','ND3','ND4','ND5','ND6','ND7','ND8'];

// ── Types ─────────────────────────────────────────────────────────────────────

interface Lab      { id: number; name: string }
interface Patient  { id: number; user: { name: string; phoneNumber: string } }
interface Appointment {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  service: { name: string };
}

interface OrderItemDraft {
  category:     string;
  workType:     string;
  toothNumbers: number[];
  material:     string;
  shade:        string;
  stumpShade:   string;
  notes:        string;
}

interface Props {
  onClose:  () => void;
  onSaved:  () => void;
  defaultPatientId?: number;
  defaultAppointmentId?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toothLabel(nums: number[]) {
  if (!nums.length) return '—';
  return nums.slice().sort((a, b) => a - b).join('، ');
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CreateLabOrderModal({ onClose, onSaved, defaultPatientId, defaultAppointmentId }: Props) {

  // ── Order fields
  const [labId,          setLabId]          = useState('');
  const [patientId,      setPatientId]      = useState(defaultPatientId ? String(defaultPatientId) : '');
  const [appointmentId,  setAppointmentId]  = useState(defaultAppointmentId ?? '');
  const [impressionType, setImpressionType] = useState<'PHYSICAL'|'DIGITAL'>('PHYSICAL');
  const [totalCost,      setTotalCost]      = useState('');
  const [orderDate,      setOrderDate]      = useState(() => new Date().toISOString().split('T')[0]);
  const [sentDate,       setSentDate]       = useState('');
  const [expectedDate,   setExpectedDate]   = useState('');
  const [orderNotes,     setOrderNotes]     = useState('');

  // ── 3D expand
  const [expanded3D, setExpanded3D] = useState(false);

  // ── Data lists
  const [labs,          setLabs]          = useState<Lab[]>([]);
  const [patients,      setPatients]      = useState<Patient[]>([]);
  const [patientSearch, setPatientSearch] = useState('');
  const [appointments,  setAppointments]  = useState<Appointment[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // ── Item builder
  const [selectedMeshes, setSelectedMeshes] = useState<string[]>([]);   // mesh names for 3D
  const [itemCategory,   setItemCategory]   = useState<Category | ''>('');
  const [itemWorkType,   setItemWorkType]   = useState('');
  const [itemMaterial,   setItemMaterial]   = useState('');
  const [itemShade,      setItemShade]      = useState('');
  const [itemStumpShade, setItemStumpShade] = useState('');
  const [itemNotes,      setItemNotes]      = useState('');

  // ── Items list
  const [items, setItems] = useState<OrderItemDraft[]>([]);

  // ── UI state
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [successMsg,  setSuccessMsg]  = useState('');

  // Derived: tooth numbers from selected meshes
  const selectedTeethNumbers = selectedMeshes
    .map(m => getToothNumberFromMesh(m))
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);

  // ── Load labs on mount
  useEffect(() => {
    fetch('/api/clinic/labs', { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success) setLabs(j.data); })
      .catch(() => {});
  }, []);

  // ── Patient search debounce
  useEffect(() => {
    if (!patientSearch.trim()) { setPatients([]); return; }
    const t = window.setTimeout(async () => {
      try {
        const res  = await fetch(`/api/clinic/staff-patients?search=${encodeURIComponent(patientSearch)}&pageSize=8`, { credentials: 'include' });
        const json = await res.json();
        if (json.success) setPatients(json.data ?? json.patients ?? []);
      } catch { /* silent */ }
    }, 300);
    return () => window.clearTimeout(t);
  }, [patientSearch]);

  // ── Load appointments when patient selected
  useEffect(() => {
    if (!patientId) { setAppointments([]); return; }
    fetch(`/api/clinic/records?patientId=${patientId}&pageSize=10&statuses=COMPLETED,IN_PROGRESS,CONFIRMED,PENDING`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success) setAppointments(j.data ?? j.appointments ?? []); })
      .catch(() => {});
  }, [patientId]);

  // ── Tooth click handler
  const handleToothClick = useCallback((tooth: { name: string }) => {
    setSelectedMeshes(prev =>
      prev.includes(tooth.name)
        ? prev.filter(m => m !== tooth.name)
        : [...prev, tooth.name]
    );
  }, []);

  // ── Add item to list
  const addItem = () => {
    if (!selectedTeethNumbers.length) { setError('حدد سناً واحداً على الأقل من النموذج'); return; }
    if (!itemCategory)                { setError('اختر فئة العمل'); return; }
    if (!itemWorkType)                { setError('اختر نوع العمل'); return; }
    setError(null);

    setItems(prev => [...prev, {
      category:     itemCategory,
      workType:     itemWorkType,
      toothNumbers: selectedTeethNumbers,
      material:     itemMaterial,
      shade:        itemShade,
      stumpShade:   itemStumpShade,
      notes:        itemNotes,
    }]);

    // Reset item builder
    setSelectedMeshes([]);
    setItemCategory('');
    setItemWorkType('');
    setItemMaterial('');
    setItemShade('');
    setItemStumpShade('');
    setItemNotes('');
  };

  const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));

  // ── Submit order
  const submit = async () => {
    if (!labId)     { setError('اختر المختبر'); return; }
    if (!patientId) { setError('اختر المريض'); return; }
    if (!items.length) { setError('أضف عنصراً واحداً على الأقل'); return; }
    setSaving(true); setError(null);
    try {
      const res  = await fetch('/api/clinic/lab-orders', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labId:              parseInt(labId),
          patientId:          parseInt(patientId),
          orderAppointmentId: appointmentId || null,
          impressionType,
          totalCost:          totalCost    ? parseFloat(totalCost) : 0,
          orderDate:          orderDate    || null,
          sentDate:           sentDate     || null,
          expectedDate:       expectedDate || null,
          notes:              orderNotes   || null,
          items,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'حدث خطأ');
      setSuccessMsg('تم إنشاء الطلب بنجاح');
      setTimeout(() => { onSaved(); }, 1200);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const workTypeLabel = (wt: string) =>
    Object.values(WORK_TYPES).flat().find(w => w.value === wt)?.label ?? wt;

  const materialLabel = (m: string) =>
    Object.values(MATERIALS).flat().find(x => x.value === m)?.label ?? m;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 sm:p-4">
      <div className="w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-5xl bg-card sm:rounded-2xl shadow-2xl flex flex-col" dir="rtl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="font-bold text-base md:text-lg">إنشاء طلب مختبر جديد</h2>
            <p className="text-xs text-muted-foreground">حدد الأسنان ثم أضف تفاصيل كل عنصر</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Success */}
          {successMsg && (
            <div className="m-4 flex items-center gap-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300 rounded-xl px-4 py-3 text-sm">
              <CheckCircleIcon className="w-4 h-4 flex-shrink-0" /> {successMsg}
            </div>
          )}
          {error && (
            <div className="mx-4 mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* ── Section 1: بيانات الطلب ── */}
          <div className="px-4 md:px-6 py-4 border-b border-border/50 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">بيانات الطلب</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

              {/* Lab */}
              <div>
                <label className="text-xs font-medium block mb-1">المختبر <span className="text-red-500">*</span></label>
                <select value={labId} onChange={e => setLabId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">-- اختر مختبراً --</option>
                  {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              {/* Patient */}
              <div className="relative">
                <label className="text-xs font-medium block mb-1">المريض <span className="text-red-500">*</span></label>
                {selectedPatient ? (
                  <div className="flex items-center gap-2 px-3 py-2.5 border border-primary/40 rounded-xl bg-primary/5 text-sm">
                    <span className="flex-1 font-medium">{selectedPatient.user.name}</span>
                    <button onClick={() => { setSelectedPatient(null); setPatientId(''); setPatientSearch(''); setAppointments([]); }}
                      className="text-muted-foreground hover:text-red-500 transition-colors">
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <input
                        value={patientSearch}
                        onChange={e => setPatientSearch(e.target.value)}
                        placeholder="ابحث باسم المريض..."
                        className="w-full pr-9 pl-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                    {patients.length > 0 && (
                      <div className="absolute z-20 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg max-h-40 overflow-y-auto">
                        {patients.map(p => (
                          <button key={p.id} onClick={() => { setSelectedPatient(p); setPatientId(String(p.id)); setPatientSearch(''); setPatients([]); }}
                            className="w-full text-right px-3 py-2 text-sm hover:bg-secondary transition-colors border-b border-border/50 last:border-0">
                            <span className="font-medium">{p.user.name}</span>
                            <span className="text-xs text-muted-foreground mr-2" dir="ltr">{p.user.phoneNumber}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Appointment */}
              <div>
                <label className="text-xs font-medium block mb-1">الموعد المرتبط</label>
                <select value={appointmentId} onChange={e => setAppointmentId(e.target.value)}
                  disabled={!patientId}
                  className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40">
                  <option value="">-- اختياري --</option>
                  {appointments.map(a => (
                    <option key={a.id} value={a.id}>
                      {new Date(a.appointmentDate).toLocaleDateString('ar')} — {a.service.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Impression type */}
              <div>
                <label className="text-xs font-medium block mb-1">نوع البصمة</label>
                <div className="flex gap-2">
                  {(['PHYSICAL', 'DIGITAL'] as const).map(t => (
                    <button key={t} onClick={() => setImpressionType(t)}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-colors ${
                        impressionType === t
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-background border-border text-muted-foreground hover:text-foreground'
                      }`}>
                      {t === 'PHYSICAL' ? 'مادية' : 'رقمية'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Order date */}
              <div>
                <label className="text-xs font-medium block mb-1">تاريخ إنشاء الطلب</label>
                <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)}
                  className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              {/* Sent date */}
              <div>
                <label className="text-xs font-medium block mb-1">تاريخ التسليم للمختبر</label>
                <input type="date" value={sentDate} onChange={e => setSentDate(e.target.value)}
                  min={orderDate}
                  className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              {/* Expected receive date */}
              <div>
                <label className="text-xs font-medium block mb-1">تاريخ الاستلام من المختبر</label>
                <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)}
                  min={sentDate || orderDate}
                  className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>

              {/* Total cost */}
              <div>
                <label className="text-xs font-medium block mb-1">التكلفة (₪)</label>
                <input type="number" value={totalCost} onChange={e => setTotalCost(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  dir="ltr" />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-medium block mb-1">ملاحظات عامة</label>
              <textarea value={orderNotes} onChange={e => setOrderNotes(e.target.value)} rows={2}
                placeholder="تعليمات خاصة للمختبر..."
                className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          </div>

          {/* ── Section 2: إضافة عنصر ── */}
          <div className="px-4 md:px-6 py-4 border-b border-border/50 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground">
              إضافة عنصر
              {selectedTeethNumbers.length > 0 && (
                <span className="mr-2 text-primary font-bold">
                  — الأسنان: {toothLabel(selectedTeethNumbers)}
                </span>
              )}
            </h3>

            <div className="flex flex-col lg:flex-row gap-4">

              {/* 3D Tooth Selector */}
              <div className="w-full lg:w-2/5 flex-shrink-0">
                <div className="relative bg-secondary/30 rounded-xl overflow-hidden" style={{ height: '340px' }}>
                  <EnhancedTeethViewer
                    selectedTeeth={selectedMeshes}
                    onToothClick={handleToothClick}
                  />
                  {/* Expand button */}
                  <button
                    onClick={() => setExpanded3D(true)}
                    className="absolute top-2 left-2 bg-black/50 hover:bg-black/70 text-white rounded-lg p-1.5 transition-colors"
                    title="تكبير النموذج"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-center text-muted-foreground mt-2">
                  اضغط على سن لتحديده · اضغط مرة أخرى لإلغائه
                </p>
                {selectedTeethNumbers.length > 0 && (
                  <button onClick={() => setSelectedMeshes([])}
                    className="w-full mt-2 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-secondary transition-colors">
                    مسح الاختيار ({selectedTeethNumbers.length} سن)
                  </button>
                )}
              </div>

              {/* Expanded 3D overlay */}
              {expanded3D && (
                <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col" dir="rtl">
                  <div className="flex items-center justify-between px-4 py-3 flex-shrink-0">
                    <div>
                      <p className="text-white font-semibold">اختيار الأسنان</p>
                      {selectedTeethNumbers.length > 0 && (
                        <p className="text-green-400 text-sm">محدد: {toothLabel(selectedTeethNumbers)}</p>
                      )}
                    </div>
                    <div className="flex gap-3">
                      {selectedTeethNumbers.length > 0 && (
                        <button onClick={() => setSelectedMeshes([])}
                          className="px-3 py-1.5 rounded-lg bg-red-600/80 text-white text-sm hover:bg-red-600 transition-colors">
                          مسح الاختيار
                        </button>
                      )}
                      <button onClick={() => setExpanded3D(false)}
                        className="px-4 py-1.5 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors">
                        تأكيد الاختيار
                      </button>
                    </div>
                  </div>
                  <div className="flex-1">
                    <EnhancedTeethViewer
                      selectedTeeth={selectedMeshes}
                      onToothClick={handleToothClick}
                    />
                  </div>
                </div>
              )}

              {/* Item Details Form */}
              <div className="flex-1 space-y-3">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Category */}
                  <div>
                    <label className="text-xs font-medium block mb-1">الفئة <span className="text-red-500">*</span></label>
                    <select value={itemCategory}
                      onChange={e => { setItemCategory(e.target.value as Category | ''); setItemWorkType(''); setItemMaterial(''); }}
                      className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option value="">-- اختر الفئة --</option>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>

                  {/* Work type */}
                  <div>
                    <label className="text-xs font-medium block mb-1">نوع العمل <span className="text-red-500">*</span></label>
                    <select value={itemWorkType} onChange={e => setItemWorkType(e.target.value)}
                      disabled={!itemCategory}
                      className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40">
                      <option value="">-- اختر النوع --</option>
                      {itemCategory && WORK_TYPES[itemCategory].map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                    </select>
                  </div>

                  {/* Material */}
                  <div>
                    <label className="text-xs font-medium block mb-1">المادة</label>
                    <select value={itemMaterial} onChange={e => setItemMaterial(e.target.value)}
                      disabled={!itemCategory}
                      className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40">
                      <option value="">-- اختياري --</option>
                      {itemCategory && MATERIALS[itemCategory].map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </div>

                  {/* Shade */}
                  <div>
                    <label className="text-xs font-medium block mb-1">اللون (Shade)</label>
                    <select value={itemShade} onChange={e => setItemShade(e.target.value)}
                      className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option value="">-- اختياري --</option>
                      {VITA_SHADES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  {/* Stump shade — for E-max/Veneer */}
                  {(itemWorkType === 'VENEER_EMAX' || itemMaterial === 'EMAX') && (
                    <div>
                      <label className="text-xs font-medium block mb-1">Stump Shade</label>
                      <select value={itemStumpShade} onChange={e => setItemStumpShade(e.target.value)}
                        className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                        <option value="">-- اختياري --</option>
                        {STUMP_SHADES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                {/* Item notes */}
                <div>
                  <label className="text-xs font-medium block mb-1">ملاحظات العنصر</label>
                  <textarea value={itemNotes} onChange={e => setItemNotes(e.target.value)} rows={2}
                    placeholder="ملاحظات خاصة بهذا العنصر..."
                    className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>

                {/* Add button */}
                <button onClick={addItem}
                  disabled={!selectedTeethNumbers.length || !itemCategory || !itemWorkType}
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors">
                  + إضافة هذا العنصر للطلب
                </button>
              </div>
            </div>
          </div>

          {/* ── Section 3: العناصر المضافة ── */}
          {items.length > 0 && (
            <div className="px-4 md:px-6 py-4 space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">
                العناصر المضافة ({items.length})
              </h3>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="flex items-start gap-3 bg-secondary/30 rounded-xl px-3 py-2.5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{workTypeLabel(item.workType)}</span>
                        <span className="text-xs text-muted-foreground font-mono">({toothLabel(item.toothNumbers)})</span>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground flex-wrap mt-0.5">
                        {item.material   && <span>{materialLabel(item.material)}</span>}
                        {item.shade      && <span>اللون: {item.shade}</span>}
                        {item.stumpShade && <span>Stump: {item.stumpShade}</span>}
                        {item.notes      && <span className="text-foreground/60">{item.notes}</span>}
                      </div>
                    </div>
                    <button onClick={() => removeItem(i)}
                      className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0 mt-0.5">
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-t border-border flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            {items.length > 0 ? `${items.length} عنصر جاهز للإرسال` : 'أضف عنصراً واحداً على الأقل'}
          </span>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-secondary text-sm hover:bg-secondary/80 transition-colors">
              إلغاء
            </button>
            <button onClick={submit} disabled={saving || !items.length || !labId || !patientId}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors">
              {saving ? 'جاري الإرسال...' : 'إرسال الطلب'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
