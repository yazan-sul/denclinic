'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { XIcon, CheckCircleIcon, SearchIcon } from '@/components/Icons';
import { getToothNumberFromMesh, getMeshFromToothNumber } from '@/components/model3D/toothMapping';

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

// Dental arc order (FDI) — used for bridge consecutive validation
const UPPER_ARC = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
const LOWER_ARC = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];

function areConsecutiveInArc(teeth: number[]): boolean {
  const isUpper = teeth.every(t => t >= 11 && t <= 28);
  const isLower = teeth.every(t => t >= 31 && t <= 48);
  if (!isUpper && !isLower) return false;
  const arc = isUpper ? UPPER_ARC : LOWER_ARC;
  const indices = teeth.map(t => arc.indexOf(t)).filter(i => i !== -1);
  if (indices.length !== teeth.length) return false;
  const sorted = [...indices].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length - 1; i++)
    if (sorted[i + 1] !== sorted[i] + 1) return false;
  return true;
}

// Work types that need jaw selection instead of individual teeth
const JAW_SELECTOR_TYPES = new Set([
  'COMPLETE_DENTURE', 'ORTHODONTIC_RETAINER', 'NIGHT_GUARD', 'CLEAR_ALIGNERS', 'STUDY_MODEL',
]);

const JAW_TEETH: Record<string, number[]> = {
  upper: [11,12,13,14,15,16,17,18,21,22,23,24,25,26,27,28],
  lower: [31,32,33,34,35,36,37,38,41,42,43,44,45,46,47,48],
  both:  [11,12,13,14,15,16,17,18,21,22,23,24,25,26,27,28,
          31,32,33,34,35,36,37,38,41,42,43,44,45,46,47,48],
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
  cost:         string;
}

interface EditableOrder {
  id:             string;
  clinicId:       number;
  branchId:       number;
  labId:          number;
  patientId:      number;
  impressionType: string;
  orderDate:      string;
  sentDate:       string | null;
  expectedDate:   string | null;
  notes:          string | null;
  lab:            { id: number; name: string };
  patient:        { id: number; user: { name: string; phoneNumber: string } };
  branch:         { id: number; name: string };
  orderAppointment: { id: string } | null;
  items: {
    category: string; workType: string; toothNumbers: number[];
    material: string | null; shade: string | null; stumpShade: string | null;
    notes: string | null; cost?: number;
  }[];
}

interface Props {
  onClose:  () => void;
  onSaved:  () => void;
  defaultClinicId?:      string;
  defaultBranchId?:      string;
  defaultPatient?:       { id: number; name: string; phoneNumber: string };
  defaultAppointmentId?: string;
  editOrder?:            EditableOrder;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function toothLabel(nums: number[]) {
  if (!nums.length) return '—';
  return nums.slice().sort((a, b) => a - b).join('، ');
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function CreateLabOrderModal({ onClose, onSaved, defaultClinicId, defaultBranchId, defaultPatient, defaultAppointmentId, editOrder }: Props) {
  const isEdit = !!editOrder;

  // ── Clinic / Branch selection
  const [clinics,          setClinics]          = useState<{id:number;name:string}[]>([]);
  const [branches,         setBranches]         = useState<{id:number;name:string}[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState(editOrder ? String(editOrder.clinicId) : '');
  const [selectedBranchId, setSelectedBranchId] = useState(editOrder ? String(editOrder.branchId) : '');

  // ── Order fields
  const [labId,          setLabId]          = useState(editOrder ? String(editOrder.labId) : '');
  const [patientId,      setPatientId]      = useState(editOrder ? String(editOrder.patientId) : defaultPatient ? String(defaultPatient.id) : '');
  const [appointmentId,  setAppointmentId]  = useState(editOrder ? (editOrder.orderAppointment?.id ?? '') : defaultAppointmentId ?? '');
  const [impressionType, setImpressionType] = useState<'PHYSICAL'|'DIGITAL'>(
    (editOrder?.impressionType as 'PHYSICAL'|'DIGITAL') ?? 'PHYSICAL'
  );
  const [orderDate,      setOrderDate]      = useState(() =>
    editOrder ? editOrder.orderDate.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [sentDate,       setSentDate]       = useState(editOrder?.sentDate?.split('T')[0] ?? '');
  const [expectedDate,   setExpectedDate]   = useState(editOrder?.expectedDate?.split('T')[0] ?? '');
  const [orderNotes,     setOrderNotes]     = useState(editOrder?.notes ?? '');
  const [patientPrice,   setPatientPrice]   = useState(
    editOrder ? String((editOrder as any).patientPrice ?? '') : ''
  );

  // ── 3D expand
  const [expanded3D, setExpanded3D] = useState(false);

  // ── Data lists
  const [labs,            setLabs]            = useState<Lab[]>([]);
  const [patients,        setPatients]        = useState<Patient[]>([]);
  const [patientSearch,   setPatientSearch]   = useState('');
  const [appointments,    setAppointments]    = useState<Appointment[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  // ── Item builder
  const [selectedMeshes, setSelectedMeshes] = useState<string[]>([]);
  const [itemCategory,   setItemCategory]   = useState<Category | ''>('');
  const [itemWorkType,   setItemWorkType]   = useState('');
  const [itemMaterial,   setItemMaterial]   = useState('');
  const [itemShade,      setItemShade]      = useState('');
  const [itemStumpShade, setItemStumpShade] = useState('');
  const [itemNotes,      setItemNotes]      = useState('');
  const [itemCost,       setItemCost]       = useState('');
  const [jawSelection,   setJawSelection]   = useState<'upper'|'lower'|'both'|''>('');

  // Derived: use jaw teeth or 3D selection depending on work type
  const isJawMode = JAW_SELECTOR_TYPES.has(itemWorkType);

  // ── Items list
  const [items, setItems] = useState<OrderItemDraft[]>(() =>
    editOrder ? editOrder.items.map(i => ({
      category:    i.category,
      workType:    i.workType,
      toothNumbers:i.toothNumbers,
      material:    i.material    ?? '',
      shade:       i.shade       ?? '',
      stumpShade:  i.stumpShade  ?? '',
      notes:       i.notes       ?? '',
      cost:        i.cost != null ? String(i.cost) : '',
    })) : []
  );

  // ── UI state
  const [saving,           setSaving]          = useState(false);
  const [error,            setError]           = useState<string | null>(null);
  const [successMsg,       setSuccessMsg]      = useState('');
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);

  // Derived: tooth numbers from selected meshes
  const selectedTeethNumbers = selectedMeshes
    .map(m => getToothNumberFromMesh(m))
    .filter((n): n is number => n !== null)
    .sort((a, b) => a - b);

  // Amber highlight for teeth already used in previous items
  const usedTeethStatuses = useMemo(() => {
    const s: Record<number, 'CROWN'> = {};
    items.forEach(item => item.toothNumbers.forEach(n => { s[n] = 'CROWN'; }));
    return s;
  }, [items]);

  // Real-time selection warning
  const selectionWarning = useMemo(() => {
    if (!itemWorkType || isJawMode || selectedTeethNumbers.length === 0) return null;
    const SINGLE_TOOTH = new Set(['SINGLE_CROWN', 'VENEER_EMAX', 'INLAY_ONLAY', 'IMPLANT_CROWN']);
    if (SINGLE_TOOTH.has(itemWorkType) && selectedTeethNumbers.length > 1)
      return 'هذا النوع يتطلب سن واحد فقط — قم بإلغاء الأسنان الزائدة';
    if (itemWorkType === 'DENTAL_BRIDGE' && selectedTeethNumbers.length > 1) {
      const isUpper = selectedTeethNumbers.every(t => t >= 11 && t <= 28);
      const isLower = selectedTeethNumbers.every(t => t >= 31 && t <= 48);
      if (!isUpper && !isLower)
        return 'أسنان الجسر يجب أن تكون كلها في نفس الفك';
      if (!areConsecutiveInArc(selectedTeethNumbers))
        return 'أسنان الجسر غير متتالية على القوس السني';
    }
    const existingTeeth = new Set(items.flatMap(it => it.toothNumbers));
    const dup = selectedTeethNumbers.find(t => existingTeeth.has(t));
    if (dup) return `السن ${dup} مستخدم في عنصر سابق`;
    return null;
  }, [itemWorkType, selectedTeethNumbers, items, isJawMode]);

  // Auto-calculated total from item costs
  const itemsTotal = useMemo(
    () => items.reduce((s, i) => s + (parseFloat(i.cost) || 0), 0),
    [items]
  );

  // ── 0. Pre-fill patient (from editOrder or defaultPatient prop)
  useEffect(() => {
    if (editOrder) {
      setSelectedPatient({ id: editOrder.patient.id, user: { name: editOrder.patient.user.name, phoneNumber: editOrder.patient.user.phoneNumber } });
    } else if (defaultPatient) {
      setSelectedPatient({ id: defaultPatient.id, user: { name: defaultPatient.name, phoneNumber: defaultPatient.phoneNumber } });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 1. Load clinics on mount
  useEffect(() => {
    fetch('/api/doctor/clinics', { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        if (!j.success) return;
        setClinics(j.data ?? []);
        // In edit mode, clinicId already set from editOrder — don't override
        if (!isEdit) {
          if (defaultClinicId) setSelectedClinicId(defaultClinicId);
          else if ((j.data ?? []).length === 1) setSelectedClinicId(String(j.data[0].id));
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 2. Load branches + labs when clinic changes → auto-select if only one branch
  useEffect(() => {
    if (!selectedClinicId) { setBranches([]); setLabs([]); return; }
    Promise.all([
      fetch(`/api/clinic/branches?clinicId=${selectedClinicId}`, { credentials: 'include' }).then(r => r.json()),
      fetch(`/api/clinic/labs?clinicId=${selectedClinicId}`, { credentials: 'include' }).then(r => r.json()),
    ]).then(([bRes, lRes]) => {
      const bData = bRes.data ?? [];
      setBranches(bData);
      if (isEdit) {
        // In edit mode: keep branch from editOrder, don't override
        setSelectedBranchId(String(editOrder!.branchId));
      } else if (defaultBranchId && bData.some((b: {id: number}) => String(b.id) === defaultBranchId)) {
        setSelectedBranchId(defaultBranchId);
      } else if (bData.length === 1) {
        setSelectedBranchId(String(bData[0].id));
      } else {
        setSelectedBranchId('');
      }
      if (lRes.success) setLabs(lRes.data ?? []);
    }).catch(() => {});
    // Reset patient/appointment on clinic change (skip in edit mode)
    if (!isEdit) {
      setSelectedPatient(null); setPatientId(''); setPatientSearch(''); setAppointments([]);
    }
  }, [selectedClinicId]);

  // ── 3. Patient search — filtered by selected clinic
  useEffect(() => {
    if (!patientSearch.trim() || !selectedClinicId) { setPatients([]); return; }
    const t = window.setTimeout(async () => {
      try {
        const res  = await fetch(
          `/api/clinic/patients?search=${encodeURIComponent(patientSearch)}&clinicId=${selectedClinicId}&pageSize=8`,
          { credentials: 'include' }
        );
        const json = await res.json();
        if (json.success) setPatients(json.data ?? []);
      } catch { /* silent */ }
    }, 300);
    return () => window.clearTimeout(t);
  }, [patientSearch, selectedClinicId]);

  // ── 4. Load appointments — only when patient + clinic + branch all selected
  useEffect(() => {
    if (!patientId || !selectedClinicId || !selectedBranchId) { setAppointments([]); return; }
    setAppointments([]); // clear while loading
    const params = new URLSearchParams({
      patientId,
      clinicId:    selectedClinicId,
      branchId:    selectedBranchId,
      activeRole:  'STAFF', // bypass doctor-level filter so all patient appointments show
      pageSize:    '20',
    });
    fetch(`/api/clinic/records?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success) setAppointments(j.data ?? []); })
      .catch(() => {});
  }, [patientId, selectedClinicId, selectedBranchId]);

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
    if (!labId)        { setError('اختر المختبر أولاً قبل إضافة العناصر'); return; }
    if (!itemCategory) { setError('اختر فئة العمل'); return; }
    if (!itemWorkType) { setError('اختر نوع العمل'); return; }

    const teethForItem = isJawMode
      ? (jawSelection ? JAW_TEETH[jawSelection] : [])
      : selectedTeethNumbers;

    if (isJawMode && !jawSelection) {
      setError('حدد الفك (علوي / سفلي / كلاهما)'); return;
    }
    if (!isJawMode && !teethForItem.length) {
      setError('حدد سناً واحداً على الأقل من النموذج'); return;
    }

    // Fix 3: single-tooth types
    const SINGLE_TOOTH = new Set(['SINGLE_CROWN','VENEER_EMAX','INLAY_ONLAY','IMPLANT_CROWN']);
    if (SINGLE_TOOTH.has(itemWorkType) && teethForItem.length !== 1) {
      setError('هذا النوع يتطلب تحديد سن واحد فقط'); return;
    }

    // Fix 4: bridge consecutive validation (dental arc order, allows crossing midline)
    if (itemWorkType === 'DENTAL_BRIDGE') {
      if (teethForItem.length < 2) {
        setError('الجسر يتطلب سنين متتاليين على الأقل'); return;
      }
      const isUpper = teethForItem.every(t => t >= 11 && t <= 28);
      const isLower = teethForItem.every(t => t >= 31 && t <= 48);
      if (!isUpper && !isLower) {
        setError('أسنان الجسر يجب أن تكون كلها في الفك العلوي أو كلها في الفك السفلي'); return;
      }
      if (!areConsecutiveInArc(teethForItem)) {
        setError('أسنان الجسر يجب أن تكون متتالية على القوس السني'); return;
      }
    }

    // Fix 2: no duplicate teeth across existing items (exclude current item when editing)
    const existingTeeth = new Set(
      items.flatMap((it, i) => editingItemIndex !== null && i === editingItemIndex ? [] : it.toothNumbers)
    );
    const duplicate = teethForItem.find(t => existingTeeth.has(t));
    if (duplicate) {
      setError(`السن ${duplicate} موجود في عنصر آخر`); return;
    }

    setError(null);

    const newItem = {
      category:     itemCategory,
      workType:     itemWorkType,
      toothNumbers: teethForItem,
      material:     itemMaterial,
      shade:        itemShade,
      stumpShade:   itemStumpShade,
      notes:        itemNotes,
      cost:         itemCost,
    };

    if (editingItemIndex !== null) {
      setItems(prev => prev.map((it, i) => i === editingItemIndex ? newItem : it));
      setEditingItemIndex(null);
    } else {
      setItems(prev => [...prev, newItem]);
    }

    setSelectedMeshes([]);
    setJawSelection('');
    setItemCategory('');
    setItemWorkType('');
    setItemMaterial('');
    setItemShade('');
    setItemCost('');
    setItemStumpShade('');
    setItemNotes('');
  };

  const removeItem = (index: number) => setItems(prev => prev.filter((_, i) => i !== index));

  // ── Submit order
  const submit = async () => {
    if (!selectedClinicId) { setError('اختر العيادة'); return; }
    if (!selectedBranchId) { setError('اختر الفرع'); return; }
    if (!labId)     { setError('اختر المختبر'); return; }
    if (!patientId) { setError('اختر المريض'); return; }
    if (!items.length) { setError('أضف عنصراً واحداً على الأقل'); return; }
    setSaving(true); setError(null);
    try {
      const url    = isEdit ? `/api/clinic/lab-orders/${editOrder!.id}` : '/api/clinic/lab-orders';
      const method = isEdit ? 'PATCH' : 'POST';
      const body   = isEdit
        ? {
            labId:              parseInt(labId),
            orderAppointmentId: appointmentId || null,
            impressionType,
            patientPrice:       patientPrice ? parseFloat(patientPrice) : 0,
            orderDate:          orderDate    || null,
            sentDate:           sentDate     || null,
            expectedDate:       expectedDate || null,
            notes:              orderNotes   || null,
            items,
          }
        : {
            clinicId:           parseInt(selectedClinicId),
            branchId:           parseInt(selectedBranchId),
            labId:              parseInt(labId),
            patientId:          parseInt(patientId),
            orderAppointmentId: appointmentId || null,
            impressionType,
            totalCost:          itemsTotal,
            patientPrice:       patientPrice ? parseFloat(patientPrice) : 0,
            orderDate:          orderDate    || null,
            sentDate:           sentDate     || null,
            expectedDate:       expectedDate || null,
            notes:              orderNotes   || null,
            items,
          };
      const res  = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'حدث خطأ');
      setSuccessMsg(isEdit ? 'تم حفظ التعديلات' : 'تم إنشاء الطلب بنجاح');
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
            <h2 className="font-bold text-base md:text-lg">
              {isEdit ? `تعديل طلب المختبر` : 'إنشاء طلب مختبر جديد'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {isEdit ? `المريض: ${editOrder!.patient.user.name}` : 'حدد الأسنان ثم أضف تفاصيل كل عنصر'}
            </p>
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

              {/* Clinic */}
              <div>
                <label className="text-xs font-medium block mb-1">العيادة <span className="text-red-500">*</span></label>
                <select value={selectedClinicId}
                  onChange={e => { setSelectedClinicId(e.target.value); setLabId(''); }}
                  className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <option value="">-- اختر العيادة --</option>
                  {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              {/* Branch */}
              <div>
                <label className="text-xs font-medium block mb-1">الفرع <span className="text-red-500">*</span></label>
                <select value={selectedBranchId}
                  onChange={e => { setSelectedBranchId(e.target.value); setSelectedPatient(null); setPatientId(''); setAppointments([]); }}
                  disabled={!selectedClinicId}
                  className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40">
                  <option value="">-- اختر الفرع --</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              {/* Lab */}
              <div>
                <label className="text-xs font-medium block mb-1">المختبر <span className="text-red-500">*</span></label>
                <select value={labId} onChange={e => setLabId(e.target.value)}
                  disabled={!selectedClinicId}
                  className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40">
                  <option value="">-- اختر مختبراً --</option>
                  {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>

              {/* Patient */}
              <div className="relative">
                <label className="text-xs font-medium block mb-1">المريض <span className="text-red-500">*</span></label>
                {!selectedBranchId ? (
                  <div className="px-3 py-2.5 border border-border rounded-xl bg-secondary/30 text-sm text-muted-foreground">
                    اختر الفرع أولاً
                  </div>
                ) : selectedPatient ? (
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
                          <button key={p.id} onClick={() => { setSelectedPatient(p); setPatientId(String(p.id)); setPatientSearch(''); setPatients([]); setAppointmentId(''); setAppointments([]); }}
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

              {/* Lab cost — read-only */}
              <div>
                <label className="text-xs font-medium block mb-1">تكلفة المختبر <span className="text-muted-foreground font-normal">(شيكل ₪)</span></label>
                <div className="w-full px-3 py-2.5 border border-border/50 rounded-xl bg-secondary/40 text-sm font-mono select-none" dir="ltr">
                  {itemsTotal > 0 ? itemsTotal.toLocaleString() : '0'}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">محسوبة تلقائياً من تكلفة كل عنصر</p>
              </div>

              {/* Patient price */}
              <div>
                <label className="text-xs font-medium block mb-1">سعر المريض <span className="text-muted-foreground font-normal">(شيكل ₪)</span></label>
                <input type="number" value={patientPrice} onChange={e => setPatientPrice(e.target.value)}
                  placeholder="0" min="0" dir="ltr"
                  className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                {patientPrice && parseFloat(patientPrice) > 0 && (
                  <p className={`text-[11px] mt-1 font-medium ${parseFloat(patientPrice) - itemsTotal >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                    الربح الصافي: {(parseFloat(patientPrice) - itemsTotal).toLocaleString()} ₪
                  </p>
                )}
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

          {/* ── Section 2: إضافة/تعديل عنصر ── */}
          <div id="item-builder" className="px-4 md:px-6 py-4 border-b border-border/50 space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              {editingItemIndex !== null ? (
                <><span className="text-amber-600">✎ تعديل عنصر</span>
                  <button onClick={() => { setEditingItemIndex(null); setItemCategory(''); setItemWorkType(''); setItemMaterial(''); setItemShade(''); setItemStumpShade(''); setItemNotes(''); setItemCost(''); setSelectedMeshes([]); setJawSelection(''); }}
                    className="text-[10px] text-muted-foreground hover:text-red-500 underline">إلغاء</button>
                </>
              ) : 'إضافة عنصر'}
              {isJawMode && jawSelection && (
                <span className="mr-2 text-primary font-bold">
                  — {jawSelection === 'upper' ? 'فك علوي' : jawSelection === 'lower' ? 'فك سفلي' : 'كلا الفكين'}
                  {' '}({JAW_TEETH[jawSelection]?.length} سن)
                </span>
              )}
              {!isJawMode && selectedTeethNumbers.length > 0 && (
                <span className="mr-2 text-primary font-bold">
                  — الأسنان: {toothLabel(selectedTeethNumbers)}
                </span>
              )}
            </h3>

            <div className="flex flex-col lg:flex-row gap-4">

              {/* 3D Tooth Selector — hidden in jaw mode */}
              <div className={`w-full lg:w-2/5 flex-shrink-0 ${isJawMode ? 'hidden lg:flex lg:flex-col opacity-30 pointer-events-none' : ''}`}>
                <div className="relative bg-secondary/30 rounded-xl overflow-hidden" style={{ height: '340px' }}>
                  {/* Only render inline viewer when NOT expanded — avoids dual WebGL context */}
                  {!expanded3D && (
                    <EnhancedTeethViewer
                      selectedTeeth={selectedMeshes}
                      toothStatuses={usedTeethStatuses}
                      onToothClick={handleToothClick}
                    />
                  )}
                  {/* Placeholder shown while expanded overlay is open */}
                  {expanded3D && (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                      <svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                      <p className="text-xs">النموذج مفتوح في وضع التكبير</p>
                      {selectedTeethNumbers.length > 0 && (
                        <p className="text-xs text-primary font-medium">محدد: {toothLabel(selectedTeethNumbers)}</p>
                      )}
                    </div>
                  )}
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
                  {items.length > 0 && <span className="mr-1 text-amber-600">· البرتقالي = مستخدم</span>}
                </p>
                {selectionWarning && (
                  <p className="mt-1.5 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                    ⚠ {selectionWarning}
                  </p>
                )}
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
                  {selectionWarning && (
                    <div className="px-4 pb-2 flex-shrink-0">
                      <p className="text-xs text-amber-400 bg-amber-900/30 border border-amber-700 rounded-lg px-3 py-2">
                        ⚠ {selectionWarning}
                      </p>
                    </div>
                  )}
                  <div className="flex-1">
                    <EnhancedTeethViewer
                      selectedTeeth={selectedMeshes}
                      toothStatuses={usedTeethStatuses}
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
                      onChange={e => { setItemCategory(e.target.value as Category | ''); setItemWorkType(''); setItemMaterial(''); setJawSelection(''); setSelectedMeshes([]); }}
                      className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option value="">-- اختر الفئة --</option>
                      {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>

                  {/* Work type */}
                  <div>
                    <label className="text-xs font-medium block mb-1">نوع العمل <span className="text-red-500">*</span></label>
                    <select value={itemWorkType}
                      onChange={e => { setItemWorkType(e.target.value); setJawSelection(''); setSelectedMeshes([]); }}
                      disabled={!itemCategory}
                      className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40">
                      <option value="">-- اختر النوع --</option>
                      {itemCategory && WORK_TYPES[itemCategory].map(w => <option key={w.value} value={w.value}>{w.label}</option>)}
                    </select>
                  </div>

                  {/* Jaw selector — for complete denture & appliances */}
                  {isJawMode && (
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium block mb-2">الفك <span className="text-red-500">*</span></label>
                      <div className="flex gap-2">
                        {[
                          { value: 'upper', label: 'فك علوي',   sub: '(11–28)' },
                          { value: 'lower', label: 'فك سفلي',   sub: '(31–48)' },
                          { value: 'both',  label: 'كلا الفكين', sub: '(32 سن)' },
                        ].map(j => (
                          <button key={j.value} type="button"
                            onClick={() => setJawSelection(j.value as 'upper'|'lower'|'both')}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-medium border transition-colors flex flex-col items-center gap-0.5 ${
                              jawSelection === j.value
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background border-border text-muted-foreground hover:text-foreground'
                            }`}>
                            <span>{j.label}</span>
                            <span className="opacity-60">{j.sub}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

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

                {/* Item cost */}
                <div>
                  <label className="text-xs font-medium block mb-1">تكلفة العنصر (₪)</label>
                  <input type="number" value={itemCost} onChange={e => setItemCost(e.target.value)}
                    placeholder="0" min="0" dir="ltr"
                    className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
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
                  disabled={
                    !itemCategory || !itemWorkType ||
                    (isJawMode ? !jawSelection : !selectedTeethNumbers.length)
                  }
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors">
                  {editingItemIndex !== null ? '✓ حفظ التعديلات' : '+ إضافة هذا العنصر للطلب'}
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
                  <div key={i} className={`flex items-start gap-3 rounded-xl px-3 py-2.5 border transition-colors ${
                    editingItemIndex === i
                      ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-400 dark:border-amber-600'
                      : 'bg-secondary/30 border-transparent'
                  }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{workTypeLabel(item.workType)}</span>
                          <span className="text-xs text-muted-foreground font-mono">({toothLabel(item.toothNumbers)})</span>
                        </div>
                        {parseFloat(item.cost) > 0 && (
                          <span className="text-sm font-semibold text-primary font-mono flex-shrink-0">
                            {parseFloat(item.cost).toLocaleString()} ₪
                          </span>
                        )}
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground flex-wrap mt-0.5">
                        {item.material   && <span>{materialLabel(item.material)}</span>}
                        {item.shade      && <span>اللون: {item.shade}</span>}
                        {item.stumpShade && <span>Stump: {item.stumpShade}</span>}
                        {item.notes      && <span className="text-foreground/60">{item.notes}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0 mt-0.5">
                      <button
                        onClick={() => {
                          // Load item into builder for editing
                          setEditingItemIndex(i);
                          setItemCategory(item.category as any);
                          setItemWorkType(item.workType);
                          setItemMaterial(item.material);
                          setItemShade(item.shade);
                          setItemStumpShade(item.stumpShade);
                          setItemNotes(item.notes);
                          setItemCost(item.cost);
                          if (JAW_SELECTOR_TYPES.has(item.workType)) {
                            const upper = item.toothNumbers.every((t: number) => t >= 11 && t <= 28);
                            const lower = item.toothNumbers.every((t: number) => t >= 31 && t <= 48);
                            setJawSelection(upper && lower ? 'both' : upper ? 'upper' : 'lower');
                            setSelectedMeshes([]);
                          } else {
                            setJawSelection('');
                            setSelectedMeshes(item.toothNumbers.map((n: number) => getMeshFromToothNumber(n)).filter(Boolean) as string[]);
                          }
                          // Scroll to item builder
                          window.setTimeout(() => document.getElementById('item-builder')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                        }}
                        className="text-muted-foreground hover:text-blue-500 transition-colors p-1"
                        title="تعديل"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => { removeItem(i); if (editingItemIndex === i) setEditingItemIndex(null); }}
                        className="text-muted-foreground hover:text-red-500 transition-colors p-1">
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {itemsTotal > 0 && (
                  <div className="flex justify-end pt-1 border-t border-border/50">
                    <span className="text-sm font-bold">المجموع: {itemsTotal.toLocaleString()} ₪</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between gap-3 px-4 md:px-6 py-4 border-t border-border flex-shrink-0">
          <div className="flex flex-col gap-1">
            {editingItemIndex !== null ? (
              <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                ⚠ أنت تعدّل عنصراً — احفظه أولاً قبل إرسال الطلب
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">
                {items.length > 0 ? `${items.length} عنصر` : 'أضف عنصراً واحداً على الأقل'}
              </span>
            )}
            {items.length > 0 && itemsTotal === 0 && editingItemIndex === null && (
              <span className="text-xs text-amber-600 dark:text-amber-400">
                ⚠ التكلفة 0 — أضف تكلفة لكل عنصر
              </span>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-secondary text-sm hover:bg-secondary/80 transition-colors">
              إلغاء
            </button>
            <button
              onClick={submit}
              disabled={saving || !items.length || !labId || !patientId || editingItemIndex !== null}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 hover:bg-primary/90 transition-colors">
              {saving ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إرسال الطلب'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
