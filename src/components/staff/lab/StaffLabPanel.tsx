'use client';

import { useState, useMemo } from 'react';
import { SearchIcon, XIcon, CheckCircleIcon } from '@/components/Icons';

/* ─── Types ────────────────────────────────────────────── */
type CaseStatus = 'pending' | 'sent' | 'in-progress' | 'completed' | 'delivered';
type FilterStatus = 'ALL' | CaseStatus;

interface LabCase {
  id: number;
  caseNo: string;
  patient: string;
  phone: string;
  doctor: string;
  type: string;
  lab: string;
  teeth: string;
  shade: string;
  material: string;
  notes: string;
  status: CaseStatus;
  createdAt: string;
  dueDate: string;
  completedAt: string;
  deliveredAt: string;
  cost: number;
}

/* ─── Mock Data ────────────────────────────────────────── */
const initialLabs = ['مختبر الأسنان الحديث', 'مختبر نابلس لطب الأسنان', 'مختبر البيرة'];
const mockTypes = ['تاج زيركون', 'جسر زيركون', 'تاج PFM', 'جسر PFM', 'طقم أسنان كامل', 'طقم أسنان جزئي', 'حافظ مسافة', 'تقويم شفاف', 'واقي أسنان رياضي', 'تلبيسة مؤقتة'];
const mockMaterials = ['زيركون', 'PFM', 'إيماكس', 'أكريل', 'كروم كوبلت', 'سيليكون'];
const mockShades = ['A1', 'A2', 'A3', 'A3.5', 'B1', 'B2', 'B3', 'C1', 'C2', 'D2', 'D3'];

const mockCases: LabCase[] = [
  {
    id: 1, caseNo: 'LAB-2026-001', patient: 'أحمد محمد', phone: '0599000001', doctor: 'د. عبد اللطيف سليمان',
    type: 'تاج زيركون', lab: 'مختبر الأسنان الحديث', teeth: '14, 15', shade: 'A2', material: 'زيركون',
    notes: 'تجهيز خلال 5 أيام', status: 'completed', createdAt: '2026-04-10', dueDate: '2026-04-15',
    completedAt: '2026-04-14', deliveredAt: '', cost: 350,
  },
  {
    id: 2, caseNo: 'LAB-2026-002', patient: 'فاطمة علي', phone: '0599000002', doctor: 'د. خالد عبد الله',
    type: 'جسر زيركون', lab: 'مختبر الأسنان الحديث', teeth: '21, 22, 23', shade: 'A3', material: 'زيركون',
    notes: '', status: 'in-progress', createdAt: '2026-04-12', dueDate: '2026-04-19',
    completedAt: '', deliveredAt: '', cost: 600,
  },
  {
    id: 3, caseNo: 'LAB-2026-003', patient: 'نور عبدالله', phone: '0599000004', doctor: 'د. خالد عبد الله',
    type: 'تاج PFM', lab: 'مختبر نابلس لطب الأسنان', teeth: '36', shade: 'B2', material: 'PFM',
    notes: 'المريضة حامل — تجنب الأشعة', status: 'sent', createdAt: '2026-04-16', dueDate: '2026-04-22',
    completedAt: '', deliveredAt: '', cost: 250,
  },
  {
    id: 4, caseNo: 'LAB-2026-004', patient: 'محمود حسن', phone: '0599000003', doctor: 'د. عبد اللطيف سليمان',
    type: 'طقم أسنان جزئي', lab: 'مختبر البيرة', teeth: 'فك علوي', shade: 'A3.5', material: 'كروم كوبلت',
    notes: 'طبعة ألجينات مرسلة', status: 'pending', createdAt: '2026-04-18', dueDate: '2026-04-28',
    completedAt: '', deliveredAt: '', cost: 800,
  },
  {
    id: 5, caseNo: 'LAB-2026-005', patient: 'ليلى أحمد', phone: '0599000007', doctor: 'د. عبد اللطيف سليمان',
    type: 'تقويم شفاف', lab: 'مختبر الأسنان الحديث', teeth: 'فك علوي وسفلي', shade: '-', material: 'سيليكون',
    notes: 'مرحلة 3 من 12', status: 'delivered', createdAt: '2026-03-20', dueDate: '2026-04-01',
    completedAt: '2026-03-30', deliveredAt: '2026-04-02', cost: 450,
  },
  {
    id: 6, caseNo: 'LAB-2026-006', patient: 'عمر ياسين', phone: '0599000006', doctor: 'د. خالد عبد الله',
    type: 'واقي أسنان رياضي', lab: 'مختبر نابلس لطب الأسنان', teeth: 'فك علوي', shade: '-', material: 'سيليكون',
    notes: 'لون أزرق حسب طلب المريض', status: 'delivered', createdAt: '2026-04-05', dueDate: '2026-04-10',
    completedAt: '2026-04-09', deliveredAt: '2026-04-11', cost: 150,
  },
  {
    id: 7, caseNo: 'LAB-2026-007', patient: 'خالد عبدالله', phone: '0599000008', doctor: 'د. خالد عبد الله',
    type: 'تاج زيركون', lab: 'مختبر الأسنان الحديث', teeth: '46', shade: 'A2', material: 'زيركون',
    notes: 'حالة زراعة — abutment مرفق', status: 'in-progress', createdAt: '2026-04-15', dueDate: '2026-04-22',
    completedAt: '', deliveredAt: '', cost: 400,
  },
  {
    id: 8, caseNo: 'LAB-2026-008', patient: 'ريم حسين', phone: '0599000009', doctor: 'د. عبد اللطيف سليمان',
    type: 'جسر PFM', lab: 'مختبر البيرة', teeth: '11, 12, 13', shade: 'B1', material: 'PFM',
    notes: '', status: 'sent', createdAt: '2026-04-17', dueDate: '2026-04-24',
    completedAt: '', deliveredAt: '', cost: 500,
  },
];

const mockDoctors = ['د. عبد اللطيف سليمان', 'د. خالد عبد الله'];

/* ─── Config ───────────────────────────────────────────── */
const statusConfig: Record<CaseStatus, { label: string; className: string; step: number }> = {
  pending:     { label: 'بانتظار الإرسال', className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300', step: 1 },
  sent:        { label: 'مُرسل للمختبر',  className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300', step: 2 },
  'in-progress': { label: 'قيد التصنيع',  className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300', step: 3 },
  completed:   { label: 'جاهز للاستلام',  className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300', step: 4 },
  delivered:   { label: 'تم التسليم',     className: 'bg-gray-100 dark:bg-gray-800/30 text-gray-600 dark:text-gray-400', step: 5 },
};

const filterStatuses: { id: FilterStatus; label: string }[] = [
  { id: 'ALL', label: 'الكل' },
  { id: 'pending', label: 'بانتظار الإرسال' },
  { id: 'sent', label: 'مُرسل' },
  { id: 'in-progress', label: 'قيد التصنيع' },
  { id: 'completed', label: 'جاهز' },
  { id: 'delivered', label: 'مُسلّم' },
];

const emptyCaseForm = {
  patient: '', phone: '', doctor: mockDoctors[0], type: mockTypes[0], lab: initialLabs[0],
  teeth: '', shade: mockShades[0], material: mockMaterials[0], notes: '', dueDate: '', cost: 0,
};

/* ─── Component ────────────────────────────────────────── */
export default function StaffLabPanel() {
  const [cases, setCases] = useState<LabCase[]>(mockCases);
  const [labs, setLabs] = useState<string[]>(initialLabs);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [filterLab, setFilterLab] = useState('ALL');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState(emptyCaseForm);
  const [viewCase, setViewCase] = useState<LabCase | null>(null);
  const [editCase, setEditCase] = useState<LabCase | null>(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [newLabName, setNewLabName] = useState('');
  const [showNewLabInput, setShowNewLabInput] = useState(false);

  /* ── Filtering ── */
  const filtered = useMemo(() => {
    return cases.filter((c) => {
      const matchSearch = c.patient.includes(search) || c.caseNo.includes(search) || c.phone.includes(search);
      const matchStatus = filterStatus === 'ALL' || c.status === filterStatus;
      const matchLab = filterLab === 'ALL' || c.lab === filterLab;
      return matchSearch && matchStatus && matchLab;
    }).sort((a, b) => b.createdAt > a.createdAt ? 1 : -1);
  }, [cases, search, filterStatus, filterLab]);

  /* ── Add new lab ── */
  const handleAddLab = () => {
    const name = newLabName.trim();
    if (!name || labs.includes(name)) return;
    setLabs((prev) => [...prev, name]);
    setAddForm((f) => ({ ...f, lab: name }));
    setNewLabName('');
    setShowNewLabInput(false);
    showSuccess('تم إضافة المختبر');
  };

  /* ── Stats ── */
  const pendingCount = cases.filter((c) => c.status === 'pending').length;
  const sentCount = cases.filter((c) => c.status === 'sent').length;
  const inProgressCount = cases.filter((c) => c.status === 'in-progress').length;
  const completedCount = cases.filter((c) => c.status === 'completed').length;

  /* ── Handlers ── */
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleAddCase = () => {
    if (!addForm.patient.trim() || !addForm.teeth.trim()) return;
    const newCase: LabCase = {
      id: Date.now(),
      caseNo: `LAB-2026-${String(cases.length + 1).padStart(3, '0')}`,
      patient: addForm.patient,
      phone: addForm.phone,
      doctor: addForm.doctor,
      type: addForm.type,
      lab: addForm.lab,
      teeth: addForm.teeth,
      shade: addForm.shade,
      material: addForm.material,
      notes: addForm.notes,
      status: 'pending',
      createdAt: new Date().toISOString().split('T')[0],
      dueDate: addForm.dueDate,
      completedAt: '',
      deliveredAt: '',
      cost: addForm.cost,
    };
    setCases((prev) => [newCase, ...prev]);
    setShowAddModal(false);
    setAddForm(emptyCaseForm);
    showSuccess('تم إنشاء حالة مختبر جديدة');
  };

  const handleStatusChange = (id: number, newStatus: CaseStatus) => {
    const now = new Date().toISOString().split('T')[0];
    setCases((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const updates: Partial<LabCase> = { status: newStatus };
        if (newStatus === 'completed') updates.completedAt = now;
        if (newStatus === 'delivered') updates.deliveredAt = now;
        return { ...c, ...updates };
      })
    );
    showSuccess('تم تحديث الحالة');
  };

  const handleEditSave = () => {
    if (!editCase) return;
    setCases((prev) => prev.map((c) => (c.id === editCase.id ? editCase : c)));
    setEditCase(null);
    showSuccess('تم تعديل الحالة');
  };

  /* ── Status progress bar ── */
  const StatusProgress = ({ status }: { status: CaseStatus }) => {
    const current = statusConfig[status].step;
    const steps = [
      { step: 1, label: 'إنشاء' },
      { step: 2, label: 'إرسال' },
      { step: 3, label: 'تصنيع' },
      { step: 4, label: 'جاهز' },
      { step: 5, label: 'تسليم' },
    ];
    return (
      <div className="flex items-center gap-1 w-full">
        {steps.map((s, i) => (
          <div key={s.step} className="flex items-center flex-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
              s.step <= current ? 'bg-primary text-white' : 'bg-secondary text-muted-foreground'
            }`}>
              {s.step <= current ? '✓' : s.step}
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-0.5 ${s.step < current ? 'bg-primary' : 'bg-secondary'}`} />
            )}
          </div>
        ))}
      </div>
    );
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
          <p className="text-sm text-muted-foreground mb-1">بانتظار الإرسال</p>
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">مُرسل للمختبر</p>
          <p className="text-2xl font-bold text-blue-600">{sentCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">قيد التصنيع</p>
          <p className="text-2xl font-bold text-purple-600">{inProgressCount}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">جاهز للاستلام</p>
          <p className="text-2xl font-bold text-green-600">{completedCount}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="relative min-w-[200px] max-w-xs flex-1">
            <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="ابحث (مريض، رقم حالة، هاتف)..."
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
            value={filterLab}
            onChange={(e) => setFilterLab(e.target.value)}
            className="px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="ALL">جميع المختبرات</option>
            {labs.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <button
          onClick={() => { setAddForm(emptyCaseForm); setShowAddModal(true); }}
          className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
        >
          + حالة مختبر جديدة
        </button>
      </div>

      {/* Cases Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-right px-4 py-3 font-semibold text-foreground">رقم الحالة</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground">المريض</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground hidden sm:table-cell">النوع</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground hidden md:table-cell">المختبر</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground hidden lg:table-cell">موعد التسليم</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground">الحالة</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-muted-foreground">لا توجد حالات</td>
                </tr>
              ) : (
                filtered.map((c) => {
                  const isOverdue = c.dueDate && c.dueDate < new Date().toISOString().split('T')[0] && c.status !== 'delivered' && c.status !== 'completed';
                  return (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-primary font-medium">{c.caseNo}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">{c.patient}</p>
                          <p className="text-xs text-muted-foreground">{c.doctor}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        <div>
                          <p>{c.type}</p>
                          <p className="text-xs">أسنان: {c.teeth}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell text-xs">{c.lab}</td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={`text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`} dir="ltr">
                          {c.dueDate} {isOverdue && '⚠️'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[c.status].className}`}>
                          {statusConfig[c.status].label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => setViewCase(c)} className="text-xs text-primary hover:underline">تفاصيل</button>
                          {c.status === 'pending' && (
                            <button onClick={() => handleStatusChange(c.id, 'sent')} className="text-xs text-blue-600 hover:underline">إرسال</button>
                          )}
                          {c.status === 'sent' && (
                            <button onClick={() => handleStatusChange(c.id, 'in-progress')} className="text-xs text-purple-600 hover:underline">بدء تصنيع</button>
                          )}
                          {c.status === 'in-progress' && (
                            <button onClick={() => handleStatusChange(c.id, 'completed')} className="text-xs text-green-600 hover:underline">جاهز</button>
                          )}
                          {c.status === 'completed' && (
                            <button onClick={() => handleStatusChange(c.id, 'delivered')} className="text-xs text-gray-600 hover:underline">تسليم</button>
                          )}
                          {c.status !== 'delivered' && (
                            <button onClick={() => setEditCase({ ...c })} className="text-xs text-amber-600 hover:underline">تعديل</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── View Case Modal ── */}
      {viewCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
              <div>
                <h2 className="text-lg font-bold text-foreground">تفاصيل حالة المختبر</h2>
                <span className="font-mono text-xs text-primary">{viewCase.caseNo}</span>
              </div>
              <button onClick={() => setViewCase(null)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-5">

              {/* Progress */}
              <div>
                <p className="text-xs text-muted-foreground mb-2">مراحل الحالة</p>
                <StatusProgress status={viewCase.status} />
                <div className="flex justify-between mt-1">
                  {['إنشاء', 'إرسال', 'تصنيع', 'جاهز', 'تسليم'].map((l) => (
                    <span key={l} className="text-[9px] text-muted-foreground">{l}</span>
                  ))}
                </div>
              </div>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-3 text-sm bg-secondary/30 rounded-xl p-4">
                <div><span className="text-muted-foreground">المريض: </span><span className="font-medium">{viewCase.patient}</span></div>
                <div><span className="text-muted-foreground">الهاتف: </span><span className="font-medium" dir="ltr">{viewCase.phone}</span></div>
                <div><span className="text-muted-foreground">الطبيب: </span><span className="font-medium">{viewCase.doctor}</span></div>
                <div><span className="text-muted-foreground">المختبر: </span><span className="font-medium">{viewCase.lab}</span></div>
                <div><span className="text-muted-foreground">النوع: </span><span className="font-medium">{viewCase.type}</span></div>
                <div><span className="text-muted-foreground">المادة: </span><span className="font-medium">{viewCase.material}</span></div>
                <div><span className="text-muted-foreground">الأسنان: </span><span className="font-medium">{viewCase.teeth}</span></div>
                <div><span className="text-muted-foreground">اللون: </span><span className="font-medium">{viewCase.shade}</span></div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3">
                  <p className="text-xs text-muted-foreground">تاريخ الإنشاء</p>
                  <p className="font-medium text-foreground" dir="ltr">{viewCase.createdAt}</p>
                </div>
                <div className={`rounded-xl p-3 ${viewCase.dueDate && viewCase.dueDate < new Date().toISOString().split('T')[0] && viewCase.status !== 'delivered' ? 'bg-red-50 dark:bg-red-900/20' : 'bg-amber-50 dark:bg-amber-900/20'}`}>
                  <p className="text-xs text-muted-foreground">موعد التسليم</p>
                  <p className="font-medium text-foreground" dir="ltr">{viewCase.dueDate || '-'}</p>
                </div>
                {viewCase.completedAt && (
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">تاريخ الجاهزية</p>
                    <p className="font-medium text-foreground" dir="ltr">{viewCase.completedAt}</p>
                  </div>
                )}
                {viewCase.deliveredAt && (
                  <div className="bg-gray-50 dark:bg-gray-800/20 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">تاريخ التسليم</p>
                    <p className="font-medium text-foreground" dir="ltr">{viewCase.deliveredAt}</p>
                  </div>
                )}
              </div>

              {/* Cost */}
              <div className="flex items-center justify-between bg-secondary/30 rounded-xl p-4">
                <span className="text-sm text-muted-foreground">تكلفة المختبر</span>
                <span className="text-lg font-bold text-foreground">{viewCase.cost}₪</span>
              </div>

              {/* Notes */}
              {viewCase.notes && (
                <div className="text-sm">
                  <span className="text-muted-foreground font-medium">ملاحظات: </span>
                  <span className="text-foreground bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-lg">{viewCase.notes}</span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border sticky bottom-0 bg-card">
              {viewCase.status !== 'delivered' && (
                <button onClick={() => { setViewCase(null); setEditCase({ ...viewCase }); }} className="px-4 py-2 text-sm text-primary border border-primary/30 rounded-xl hover:bg-primary/10 transition-colors">تعديل</button>
              )}
              <button onClick={() => setViewCase(null)} className="px-4 py-2 text-sm border border-border rounded-xl hover:bg-secondary transition-colors">إغلاق</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Case Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-lg font-bold text-foreground">حالة مختبر جديدة</h2>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">اسم المريض *</label>
                  <input
                    value={addForm.patient}
                    onChange={(e) => setAddForm({ ...addForm, patient: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="الاسم الكامل"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">رقم الهاتف</label>
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
                  <label className="block text-sm font-medium text-foreground mb-1">الطبيب</label>
                  <select
                    value={addForm.doctor}
                    onChange={(e) => setAddForm({ ...addForm, doctor: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {mockDoctors.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">المختبر</label>
                  <div className="flex gap-2">
                    <select
                      value={addForm.lab}
                      onChange={(e) => setAddForm({ ...addForm, lab: e.target.value })}
                      className="flex-1 px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {labs.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewLabInput(true)}
                      className="px-3 py-2.5 text-sm bg-secondary text-foreground rounded-xl hover:bg-secondary/80 transition-colors font-medium flex-shrink-0"
                      title="إضافة مختبر جديد"
                    >
                      +
                    </button>
                  </div>
                  {showNewLabInput && (
                    <div className="flex gap-2 mt-2">
                      <input
                        value={newLabName}
                        onChange={(e) => setNewLabName(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="اسم المختبر الجديد"
                        autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddLab(); } }}
                      />
                      <button onClick={handleAddLab} disabled={!newLabName.trim()} className="px-3 py-2 text-sm bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50">إضافة</button>
                      <button onClick={() => { setShowNewLabInput(false); setNewLabName(''); }} className="px-3 py-2 text-sm border border-border rounded-xl hover:bg-secondary transition-colors">إلغاء</button>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">نوع العمل</label>
                  <select
                    value={addForm.type}
                    onChange={(e) => setAddForm({ ...addForm, type: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {mockTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">المادة</label>
                  <select
                    value={addForm.material}
                    onChange={(e) => setAddForm({ ...addForm, material: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {mockMaterials.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">الأسنان / المنطقة *</label>
                  <input
                    value={addForm.teeth}
                    onChange={(e) => setAddForm({ ...addForm, teeth: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="مثال: 14, 15 أو فك علوي"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">اللون (Shade)</label>
                  <select
                    value={addForm.shade}
                    onChange={(e) => setAddForm({ ...addForm, shade: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="-">غير محدد</option>
                    {mockShades.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">موعد التسليم المتوقع</label>
                  <input
                    type="date"
                    value={addForm.dueDate}
                    onChange={(e) => setAddForm({ ...addForm, dueDate: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">التكلفة (₪)</label>
                  <input
                    type="number"
                    value={addForm.cost || ''}
                    onChange={(e) => setAddForm({ ...addForm, cost: Number(e.target.value) })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">ملاحظات</label>
                <textarea
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="ملاحظات خاصة بالمختبر..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border sticky bottom-0 bg-card">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm border border-border rounded-xl hover:bg-secondary transition-colors">إلغاء</button>
              <button
                onClick={handleAddCase}
                disabled={!addForm.patient.trim() || !addForm.teeth.trim()}
                className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                إنشاء الحالة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Case Modal ── */}
      {editCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg border border-border max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
              <h2 className="text-lg font-bold text-foreground">تعديل حالة المختبر</h2>
              <button onClick={() => setEditCase(null)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-secondary/30 rounded-xl p-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">رقم الحالة</span>
                <span className="font-mono text-primary font-medium">{editCase.caseNo}</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">المختبر</label>
                  <select
                    value={editCase.lab}
                    onChange={(e) => setEditCase({ ...editCase, lab: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {labs.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">نوع العمل</label>
                  <select
                    value={editCase.type}
                    onChange={(e) => setEditCase({ ...editCase, type: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {mockTypes.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">المادة</label>
                  <select
                    value={editCase.material}
                    onChange={(e) => setEditCase({ ...editCase, material: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {mockMaterials.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">اللون (Shade)</label>
                  <select
                    value={editCase.shade}
                    onChange={(e) => setEditCase({ ...editCase, shade: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="-">غير محدد</option>
                    {mockShades.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">الأسنان</label>
                  <input
                    value={editCase.teeth}
                    onChange={(e) => setEditCase({ ...editCase, teeth: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">موعد التسليم</label>
                  <input
                    type="date"
                    value={editCase.dueDate}
                    onChange={(e) => setEditCase({ ...editCase, dueDate: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">التكلفة (₪)</label>
                <input
                  type="number"
                  value={editCase.cost || ''}
                  onChange={(e) => setEditCase({ ...editCase, cost: Number(e.target.value) })}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">ملاحظات</label>
                <textarea
                  value={editCase.notes}
                  onChange={(e) => setEditCase({ ...editCase, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border sticky bottom-0 bg-card">
              <button onClick={() => setEditCase(null)} className="px-4 py-2 text-sm border border-border rounded-xl hover:bg-secondary transition-colors">إلغاء</button>
              <button onClick={handleEditSave} className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors">حفظ التعديلات</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
