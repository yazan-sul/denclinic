'use client';

import { useCallback, useEffect, useState } from 'react';
import { SearchIcon, XIcon, EditIcon, PhoneIcon, BuildingIcon, CheckCircleIcon } from '@/components/Icons';

// ── Types ────────────────────────────────────────────────────────────────────

interface Lab {
  id:            number;
  name:          string;
  phone:         string | null;
  address:       string | null;
  contactPerson: string | null;
  email:         string | null;
  notes:         string | null;
  isActive:      boolean;
  createdAt:     string;
}

type LabFormData = {
  name:          string;
  phone:         string;
  address:       string;
  contactPerson: string;
  email:         string;
  notes:         string;
};

const emptyForm: LabFormData = {
  name: '', phone: '', address: '', contactPerson: '', email: '', notes: '',
};

// ── Lab Form Modal ────────────────────────────────────────────────────────────

interface LabModalProps {
  lab?:     Lab;
  onClose:  () => void;
  onSaved:  () => void;
}

function LabModal({ lab, onClose, onSaved }: LabModalProps) {
  const isEdit = !!lab;
  const [form, setForm]     = useState<LabFormData>(
    isEdit
      ? { name: lab.name, phone: lab.phone ?? '', address: lab.address ?? '',
          contactPerson: lab.contactPerson ?? '', email: lab.email ?? '', notes: lab.notes ?? '' }
      : emptyForm
  );
  const [isActive, setIsActive] = useState(lab?.isActive ?? true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const set = (k: keyof LabFormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) { setError('اسم المختبر مطلوب'); return; }
    setSaving(true); setError(null);
    try {
      const url    = isEdit ? `/api/clinic/labs/${lab.id}` : '/api/clinic/labs';
      const method = isEdit ? 'PATCH' : 'POST';
      const res    = await fetch(url, {
        method, credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, ...(isEdit ? { isActive } : {}) }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'حدث خطأ');
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto" dir="rtl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h3 className="font-bold text-lg">{isEdit ? 'تعديل المختبر' : 'إضافة مختبر جديد'}</h3>
            {isEdit && <p className="text-xs text-muted-foreground">{lab.name}</p>}
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Name */}
          <div>
            <label className="text-sm font-medium block mb-1">اسم المختبر <span className="text-red-500">*</span></label>
            <input
              value={form.name}
              onChange={e => set('name', e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="مثال: مختبر الأسنان الحديث"
            />
          </div>

          {/* Phone + Contact Person */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">رقم الهاتف</label>
              <input
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="02-xxxxxxx"
                dir="ltr"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">جهة التواصل</label>
              <input
                value={form.contactPerson}
                onChange={e => set('contactPerson', e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="اسم الشخص المسؤول"
              />
            </div>
          </div>

          {/* Address + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">العنوان</label>
              <input
                value={form.address}
                onChange={e => set('address', e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="المدينة، الحي"
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">البريد الإلكتروني</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="lab@example.com"
                dir="ltr"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium block mb-1">ملاحظات</label>
            <textarea
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              placeholder="ملاحظات إضافية..."
            />
          </div>

          {/* Active toggle (edit only) */}
          {isEdit && (
            <div className="flex items-center justify-between bg-secondary/40 rounded-xl px-4 py-3">
              <span className="text-sm font-medium">حالة المختبر</span>
              <button
                onClick={() => setIsActive(a => !a)}
                className={`relative w-11 h-6 rounded-full transition-colors ${isActive ? 'bg-primary' : 'bg-border'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${isActive ? 'right-0.5' : 'right-5'}`} />
              </button>
              <span className={`text-xs font-medium ${isActive ? 'text-green-600' : 'text-muted-foreground'}`}>
                {isActive ? 'نشط' : 'غير نشط'}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-5 py-4 border-t border-border sticky bottom-0 bg-card">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-secondary text-sm hover:bg-secondary/80 transition-colors">
            إلغاء
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="px-5 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors"
          >
            {saving ? 'جاري الحفظ...' : isEdit ? 'حفظ التعديلات' : 'إضافة المختبر'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Delete Confirm ────────────────────────────────────────────────────────────

interface DeleteConfirmProps {
  lab:      Lab;
  onClose:  () => void;
  onSaved:  () => void;
}

function DeleteConfirm({ lab, onClose, onSaved }: DeleteConfirmProps) {
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const confirm = async () => {
    setDeleting(true); setError(null);
    try {
      const res  = await fetch(`/api/clinic/labs/${lab.id}`, { method: 'DELETE', credentials: 'include' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'حدث خطأ');
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6" dir="rtl">
        <h3 className="font-bold text-lg mb-2">تأكيد الحذف</h3>
        <p className="text-sm text-muted-foreground mb-1">هل تريد حذف المختبر التالي؟</p>
        <p className="font-semibold mb-4">{lab.name}</p>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2 mb-4">
          إذا كان المختبر مرتبطاً بطلبات سابقة، سيتم تعطيله بدلاً من حذفه.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-secondary text-sm hover:bg-secondary/80 transition-colors">
            إلغاء
          </button>
          <button
            onClick={confirm}
            disabled={deleting}
            className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold disabled:opacity-50 hover:bg-red-700 transition-colors"
          >
            {deleting ? 'جاري الحذف...' : 'حذف'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function LabsDirectoryPanel() {
  const [labs,        setLabs]        = useState<Lab[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [search,      setSearch]      = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [addModal,    setAddModal]    = useState(false);
  const [editLab,     setEditLab]     = useState<Lab | null>(null);
  const [deleteLab,   setDeleteLab]   = useState<Lab | null>(null);
  const [successMsg,  setSuccessMsg]  = useState('');

  // Debounce search
  useEffect(() => {
    const t = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const fetchLabs = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (showInactive) params.set('includeInactive', 'true');
      if (search)       params.set('search', search);
      const res  = await fetch(`/api/clinic/labs?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'تعذر التحميل');
      setLabs(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [search, showInactive]);

  useEffect(() => { fetchLabs(); }, [fetchLabs]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const onSaved = (msg: string) => {
    setAddModal(false);
    setEditLab(null);
    setDeleteLab(null);
    showSuccess(msg);
    fetchLabs();
  };

  return (
    <div className="space-y-4" dir="rtl">

      {/* Success toast */}
      {successMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="ابحث باسم المختبر أو جهة التواصل..."
            className="w-full pr-9 pl-4 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={e => setShowInactive(e.target.checked)}
            className="rounded border-border"
          />
          إظهار غير النشطة
        </label>

        <div className="mr-auto">
          <button
            onClick={() => setAddModal(true)}
            className="px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            + إضافة مختبر
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Labs Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 bg-card border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      ) : labs.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground bg-card border border-border rounded-xl">
          <BuildingIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium">لا توجد مختبرات</p>
          <p className="text-sm mt-1">ابدأ بإضافة مختبر خارجي تتعامل معه العيادة</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {labs.map(lab => (
            <div
              key={lab.id}
              className={`bg-card border rounded-xl p-4 flex flex-col gap-3 transition-all hover:shadow-md ${
                lab.isActive ? 'border-border' : 'border-border/50 opacity-60'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <BuildingIcon className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm leading-snug truncate">{lab.name}</h3>
                </div>
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                  lab.isActive
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-secondary text-muted-foreground'
                }`}>
                  {lab.isActive ? 'نشط' : 'غير نشط'}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-1.5 text-sm flex-1">
                {lab.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <PhoneIcon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span dir="ltr" className="text-xs">{lab.phone}</span>
                  </div>
                )}
                {lab.contactPerson && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-xs">👤</span>
                    <span className="text-xs">{lab.contactPerson}</span>
                  </div>
                )}
                {lab.address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-xs">📍</span>
                    <span className="text-xs truncate">{lab.address}</span>
                  </div>
                )}
                {lab.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="text-xs">✉️</span>
                    <span className="text-xs truncate" dir="ltr">{lab.email}</span>
                  </div>
                )}
                {lab.notes && (
                  <p className="text-xs text-muted-foreground bg-secondary/50 rounded-lg px-2 py-1.5 mt-1 line-clamp-2">
                    {lab.notes}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                <button
                  onClick={() => setEditLab(lab)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 transition-colors"
                >
                  <EditIcon className="w-3.5 h-3.5" />
                  تعديل
                </button>
                <button
                  onClick={() => setDeleteLab(lab)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <XIcon className="w-3.5 h-3.5" />
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Count */}
      {!isLoading && labs.length > 0 && (
        <p className="text-xs text-muted-foreground text-center">
          {labs.length} مختبر{labs.length !== 1 ? '' : ''}
        </p>
      )}

      {/* Modals */}
      {addModal && (
        <LabModal
          onClose={() => setAddModal(false)}
          onSaved={() => onSaved('تم إضافة المختبر بنجاح')}
        />
      )}
      {editLab && (
        <LabModal
          lab={editLab}
          onClose={() => setEditLab(null)}
          onSaved={() => onSaved('تم تعديل المختبر بنجاح')}
        />
      )}
      {deleteLab && (
        <DeleteConfirm
          lab={deleteLab}
          onClose={() => setDeleteLab(null)}
          onSaved={() => onSaved('تم حذف المختبر')}
        />
      )}
    </div>
  );
}
