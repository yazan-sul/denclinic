'use client';

import { useEffect, useState } from 'react';
import { SearchIcon, EditIcon, XIcon } from '@/components/Icons';
import { useBranchScope } from '@/hook/useBranchScope';

type BranchStatus = 'active' | 'inactive';

interface WorkingHours {
  open: string;
  close: string;
  days: string;
}

interface Branch {
  id: number;
  name: string;
  city: string;
  address: string;
  phone: string;
  email: string;
  managerId: number | null;
  managerName: string | null;
  status: BranchStatus;
  doctorsCount: number;
  staffCount: number;
  workingHours: WorkingHours;
  createdAt: string;
}

const mockBranches: Branch[] = [
  {
    id: 1,
    name: 'الفرع الرئيسي - رام الله',
    city: 'رام الله',
    address: 'شارع الإرسال، بناية المنارة، ط2',
    phone: '+970-2-2981234',
    email: 'main@denclinic.ps',
    managerId: 5,
    managerName: 'رنا أبو علي',
    status: 'active',
    doctorsCount: 2,
    staffCount: 2,
    workingHours: { open: '08:00', close: '18:00', days: 'الأحد - الخميس' },
    createdAt: '2024-01-10',
  },
  {
    id: 2,
    name: 'فرع البيرة',
    city: 'البيرة',
    address: 'شارع الوحدة، مجمع النور التجاري',
    phone: '+970-2-2407890',
    email: 'bireh@denclinic.ps',
    managerId: 6,
    managerName: 'أحمد سلمان',
    status: 'active',
    doctorsCount: 1,
    staffCount: 1,
    workingHours: { open: '09:00', close: '17:00', days: 'الأحد - الخميس' },
    createdAt: '2024-06-15',
  },
  {
    id: 3,
    name: 'فرع نابلس',
    city: 'نابلس',
    address: 'شارع فيصل، بجانب المستشفى الوطني',
    phone: '+970-9-2385678',
    email: 'nablus@denclinic.ps',
    managerId: 7,
    managerName: 'نور الدين',
    status: 'active',
    doctorsCount: 1,
    staffCount: 1,
    workingHours: { open: '08:30', close: '16:30', days: 'الأحد - الجمعة' },
    createdAt: '2025-02-01',
  },
  {
    id: 4,
    name: 'فرع الخليل',
    city: 'الخليل',
    address: 'شارع الشهداء، بناية الأمل',
    phone: '+970-2-2221111',
    email: 'hebron@denclinic.ps',
    managerId: null,
    managerName: null,
    status: 'inactive',
    doctorsCount: 0,
    staffCount: 0,
    workingHours: { open: '09:00', close: '17:00', days: 'الأحد - الخميس' },
    createdAt: '2025-09-01',
  },
];

const emptyForm = {
  name: '',
  city: '',
  address: '',
  phone: '',
  email: '',
  workingDays: 'الأحد - الخميس',
  openTime: '08:00',
  closeTime: '17:00',
};

const BRANCHES_STORAGE_KEY = 'denclinic-admin-branches';

export default function BranchesPanel() {
  const [branches, setBranches] = useState<Branch[]>(mockBranches);
  const [hasLoadedSavedBranches, setHasLoadedSavedBranches] = useState(false);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | BranchStatus>('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editBranch, setEditBranch] = useState<Branch | null>(null);
  const [viewBranch, setViewBranch] = useState<Branch | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const branchScope = useBranchScope();

  useEffect(() => {
    try {
      const savedBranches = window.localStorage.getItem(BRANCHES_STORAGE_KEY);
      if (savedBranches) {
        setBranches(JSON.parse(savedBranches) as Branch[]);
      }
    } catch (error) {
      console.error('Failed to load saved branches:', error);
    } finally {
      setHasLoadedSavedBranches(true);
    }
  }, []);

  useEffect(() => {
    if (!hasLoadedSavedBranches) return;

    try {
      window.localStorage.setItem(BRANCHES_STORAGE_KEY, JSON.stringify(branches));
    } catch (error) {
      console.error('Failed to save branches:', error);
    }
  }, [branches, hasLoadedSavedBranches]);

  const scopedBranches = branchScope
    ? branches.filter((b) => b.id === branchScope.branchId)
    : branches;

  const filtered = scopedBranches.filter((b) => {
    const matchSearch = b.name.includes(search) || b.city.includes(search) || b.address.includes(search);
    const matchStatus = filterStatus === 'ALL' || b.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const activeBranches = scopedBranches.filter((b) => b.status === 'active').length;
  const totalDoctors = scopedBranches.reduce((s, b) => s + b.doctorsCount, 0);
  const totalStaff = scopedBranches.reduce((s, b) => s + b.staffCount, 0);

  const handleAdd = () => {
    if (!form.name.trim() || !form.city.trim()) return;
    const newBranch: Branch = {
      id: Date.now(),
      name: form.name,
      city: form.city,
      address: form.address,
      phone: form.phone,
      email: form.email,
      managerId: null,
      managerName: null,
      status: 'active',
      doctorsCount: 0,
      staffCount: 0,
      workingHours: { open: form.openTime, close: form.closeTime, days: form.workingDays },
      createdAt: new Date().toISOString().split('T')[0],
    };
    setBranches((prev) => [newBranch, ...prev]);
    setForm(emptyForm);
    setShowAddModal(false);
  };

  const handleEditSave = () => {
    if (!editBranch) return;
    setBranches((prev) => prev.map((b) => b.id === editBranch.id ? editBranch : b));
    setEditBranch(null);
  };

  const handleToggleStatus = (id: number) => {
    setBranches((prev) => prev.map((b) => b.id === id ? { ...b, status: b.status === 'active' ? 'inactive' : 'active' } : b));
  };

  const handleDelete = (id: number) => {
    setBranches((prev) => prev.filter((b) => b.id !== id));
    setConfirmDelete(null);
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-primary">{branches.length}</p>
          <p className="text-sm text-muted-foreground mt-1">إجمالي الفروع</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{activeBranches}</p>
          <p className="text-sm text-muted-foreground mt-1">فروع نشطة</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{totalDoctors}</p>
          <p className="text-sm text-muted-foreground mt-1">أطباء</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{totalStaff}</p>
          <p className="text-sm text-muted-foreground mt-1">موظفون</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="ابحث بالاسم أو المدينة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pr-9 pl-4 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-right"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="ALL">جميع الفروع</option>
          <option value="active">نشط</option>
          <option value="inactive">غير نشط</option>
        </select>
        {!branchScope && (
          <button
            onClick={() => { setForm(emptyForm); setShowAddModal(true); }}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            + إضافة فرع
          </button>
        )}
      </div>

      {/* Branch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-2 text-center py-16 text-muted-foreground">
            <p className="text-4xl mb-3">🏥</p>
            <p>لا توجد فروع</p>
          </div>
        ) : filtered.map((branch) => (
          <div
            key={branch.id}
            className="bg-card border border-border rounded-xl p-5 space-y-4 hover:shadow-md transition-shadow"
          >
            {/* Card Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                  branch.status === 'active' ? 'bg-primary/10' : 'bg-secondary'
                }`}>
                  🏥
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{branch.name}</h3>
                  <p className="text-xs text-muted-foreground">{branch.city}</p>
                </div>
              </div>
              <button
                onClick={() => handleToggleStatus(branch.id)}
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                  branch.status === 'active'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200'
                    : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200'
                }`}
              >
                {branch.status === 'active' ? 'نشط' : 'غير نشط'}
              </button>
            </div>

            {/* Details */}
            <div className="space-y-1.5 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>📍</span>
                <span className="text-xs">{branch.address}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>📞</span>
                <span className="text-xs" dir="ltr">{branch.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span>🕐</span>
                <span className="text-xs">{branch.workingHours.days} · {branch.workingHours.open} - {branch.workingHours.close}</span>
              </div>
              {branch.managerName ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>👤</span>
                  <span className="text-xs">المدير: {branch.managerName}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>👤</span>
                  <span className="text-xs text-amber-600 dark:text-amber-400">لا يوجد مدير معين</span>
                </div>
              )}
            </div>

            {/* Team counts */}
            <div className="flex gap-3 pt-1">
              <div className="flex-1 bg-purple-50 dark:bg-purple-900/20 rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-bold text-purple-600">{branch.doctorsCount}</p>
                <p className="text-xs text-purple-600/70">أطباء</p>
              </div>
              <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-2 text-center">
                <p className="text-lg font-bold text-blue-600">{branch.staffCount}</p>
                <p className="text-xs text-blue-600/70">موظفون</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-1 border-t border-border">
              <button
                onClick={() => setViewBranch(branch)}
                className="flex-1 py-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
              >
                عرض التفاصيل
              </button>
              <button
                onClick={() => setEditBranch({ ...branch })}
                className="flex-1 py-1.5 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <EditIcon className="w-3.5 h-3.5" /> تعديل
              </button>
              {!branchScope && (
                <button
                  onClick={() => setConfirmDelete(branch.id)}
                  className="flex-1 py-1.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5 rounded-lg transition-colors flex items-center justify-center gap-1"
                >
                  <XIcon className="w-3.5 h-3.5" /> حذف
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between p-6 pb-4 sticky top-0 bg-card border-b border-border">
              <h2 className="text-lg font-bold text-foreground">إضافة فرع جديد</h2>
              <button onClick={() => setShowAddModal(false)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">اسم الفرع <span className="text-destructive">*</span></label>
                <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  placeholder="مثال: فرع جنين" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">المدينة <span className="text-destructive">*</span></label>
                <input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  placeholder="مثال: جنين" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">العنوان التفصيلي</label>
                <textarea value={form.address} onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-right resize-none"
                  placeholder="الشارع والبناية والطابق" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">الهاتف</label>
                  <input value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    dir="ltr" placeholder="+970-2-..." />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">الإيميل</label>
                  <input value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    dir="ltr" placeholder="branch@..." />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">أيام العمل</label>
                <input value={form.workingDays} onChange={(e) => setForm((p) => ({ ...p, workingDays: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  placeholder="مثال: الأحد - الخميس" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">وقت الفتح</label>
                  <input type="time" value={form.openTime} onChange={(e) => setForm((p) => ({ ...p, openTime: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">وقت الإغلاق</label>
                  <input type="time" value={form.closeTime} onChange={(e) => setForm((p) => ({ ...p, closeTime: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
                إلغاء
              </button>
              <button onClick={handleAdd} disabled={!form.name.trim() || !form.city.trim()}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50">
                إضافة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editBranch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between p-6 pb-4 sticky top-0 bg-card border-b border-border">
              <h2 className="text-lg font-bold text-foreground">تعديل بيانات الفرع</h2>
              <button onClick={() => setEditBranch(null)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">اسم الفرع</label>
                <input value={editBranch.name} onChange={(e) => setEditBranch((p) => p && ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-right" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">المدينة</label>
                <input value={editBranch.city} onChange={(e) => setEditBranch((p) => p && ({ ...p, city: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-right" />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">العنوان التفصيلي</label>
                <textarea value={editBranch.address} onChange={(e) => setEditBranch((p) => p && ({ ...p, address: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-right resize-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">الهاتف</label>
                  <input value={editBranch.phone} onChange={(e) => setEditBranch((p) => p && ({ ...p, phone: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">الإيميل</label>
                  <input value={editBranch.email} onChange={(e) => setEditBranch((p) => p && ({ ...p, email: e.target.value }))}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" dir="ltr" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">أيام العمل</label>
                <input value={editBranch.workingHours.days}
                  onChange={(e) => setEditBranch((p) => p && ({ ...p, workingHours: { ...p.workingHours, days: e.target.value } }))}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary text-right" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">وقت الفتح</label>
                  <input type="time" value={editBranch.workingHours.open}
                    onChange={(e) => setEditBranch((p) => p && ({ ...p, workingHours: { ...p.workingHours, open: e.target.value } }))}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">وقت الإغلاق</label>
                  <input type="time" value={editBranch.workingHours.close}
                    onChange={(e) => setEditBranch((p) => p && ({ ...p, workingHours: { ...p.workingHours, close: e.target.value } }))}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setEditBranch(null)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
                إلغاء
              </button>
              <button onClick={handleEditSave}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors">
                حفظ التعديلات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Details Modal */}
      {viewBranch && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md" dir="rtl">
            <div className="flex items-center justify-between p-6 pb-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl">🏥</div>
                <div>
                  <h2 className="font-bold text-foreground">{viewBranch.name}</h2>
                  <p className="text-xs text-muted-foreground">{viewBranch.city}</p>
                </div>
              </div>
              <button onClick={() => setViewBranch(null)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-3">
              {[
                { label: 'العنوان', value: viewBranch.address, dir: 'rtl' },
                { label: 'الهاتف', value: viewBranch.phone, dir: 'ltr' },
                { label: 'البريد الإلكتروني', value: viewBranch.email, dir: 'ltr' },
                { label: 'أيام العمل', value: viewBranch.workingHours.days, dir: 'rtl' },
                { label: 'ساعات العمل', value: `${viewBranch.workingHours.open} - ${viewBranch.workingHours.close}`, dir: 'ltr' },
                { label: 'المدير', value: viewBranch.managerName || 'غير محدد', dir: 'rtl' },
                { label: 'تاريخ الإنشاء', value: viewBranch.createdAt, dir: 'ltr' },
              ].map(({ label, value, dir }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                  <span className="text-sm text-muted-foreground">{label}</span>
                  <span className="text-sm font-medium text-foreground" dir={dir as any}>{value}</span>
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <div className="flex-1 bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-purple-600">{viewBranch.doctorsCount}</p>
                  <p className="text-xs text-purple-600/70 mt-0.5">أطباء</p>
                </div>
                <div className="flex-1 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center">
                  <p className="text-xl font-bold text-blue-600">{viewBranch.staffCount}</p>
                  <p className="text-xs text-blue-600/70 mt-0.5">موظفون</p>
                </div>
              </div>
            </div>
            <div className="p-6 pt-0">
              <button onClick={() => setViewBranch(null)}
                className="w-full py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete */}
      {confirmDelete !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-sm p-6 text-center" dir="rtl">
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <XIcon className="w-6 h-6 text-destructive" />
            </div>
            <h2 className="text-lg font-bold text-foreground mb-2">تأكيد الحذف</h2>
            <p className="text-sm text-muted-foreground mb-6">
              هل أنت متأكد من حذف هذا الفرع؟ سيتم إلغاء تعيين جميع الأعضاء المرتبطين به.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
                إلغاء
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 bg-destructive text-white rounded-xl text-sm font-semibold hover:bg-destructive/90 transition-colors">
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
