'use client';

import { useEffect, useMemo, useState } from 'react';

type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'RESCHEDULED'
  | 'PAYMENT_FAILED';

interface ClinicRecord {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  status: AppointmentStatus;
  reasonForVisit?: string | null;
  notes?: string | null;
  clinic: { id: number; name: string };
  branch: { id: number; name: string };
  service: { id: number; name: string };
  doctor: { id: number; user: { id: number; name: string } };
  patient: {
    id: number;
    user: {
      id: number;
      name: string;
      phoneNumber: string;
      email?: string | null;
    };
  };
}

interface ApiResponse {
  success: boolean;
  data: ClinicRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pages: number;
  };
}

const statusLabels: Record<AppointmentStatus, string> = {
  PENDING: 'قيد الانتظار',
  CONFIRMED: 'مؤكد',
  CANCELLED: 'ملغي',
  COMPLETED: 'مكتمل',
  NO_SHOW: 'لم يحضر',
  RESCHEDULED: 'أعيدت الجدولة',
  PAYMENT_FAILED: 'فشل الدفع',
};

const statusOptions: AppointmentStatus[] = [
  'PENDING',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
  'RESCHEDULED',
  'PAYMENT_FAILED',
];

function getStatusClasses(status: AppointmentStatus) {
  if (status === 'COMPLETED') return 'bg-green-100 text-green-700';
  if (status === 'CONFIRMED' || status === 'RESCHEDULED') return 'bg-blue-100 text-blue-700';
  if (status === 'PENDING') return 'bg-amber-100 text-amber-700';
  if (status === 'CANCELLED' || status === 'PAYMENT_FAILED') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-700';
}

export default function ClinicRecordsPanel() {
  const [records, setRecords] = useState<ClinicRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, pages: 1 });

  const [status, setStatus] = useState('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  const [selectedRecord, setSelectedRecord] = useState<ClinicRecord | null>(null);
  const [editStatus, setEditStatus] = useState<AppointmentStatus>('PENDING');
  const [editReasonForVisit, setEditReasonForVisit] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: '20',
    });

    if (status !== 'ALL') params.set('status', status);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    if (search) params.set('search', search);

    return params.toString();
  }, [page, status, from, to, search]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchRecords = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/clinic/records?${queryString}`, {
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });

        const payload = (await response.json()) as
          | ApiResponse
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          const message = 'error' in payload ? payload.error?.message : undefined;
          throw new Error(message || 'تعذر تحميل سجلات المرضى');
        }

        setRecords(payload.data);
        setPagination(payload.pagination);
      } catch (fetchError) {
        if ((fetchError as Error).name === 'AbortError') {
          return;
        }

        setError(fetchError instanceof Error ? fetchError.message : 'تعذر تحميل سجلات المرضى');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecords();

    return () => controller.abort();
  }, [queryString]);

  const openEditModal = (record: ClinicRecord) => {
    setSelectedRecord(record);
    setEditStatus(record.status);
    setEditReasonForVisit(record.reasonForVisit || '');
    setEditNotes(record.notes || '');
  };

  const saveRecord = async () => {
    if (!selectedRecord) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/clinic/records/${selectedRecord.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          status: editStatus,
          reasonForVisit: editReasonForVisit,
          notes: editNotes,
        }),
      });

      const payload = (await response.json()) as
        | { success: true; data: ClinicRecord }
        | { success: false; error?: { message?: string } };

      if (!response.ok || !payload.success) {
        const message = 'error' in payload ? payload.error?.message : undefined;
        throw new Error(message || 'تعذر تحديث السجل');
      }

      setRecords((prev) =>
        prev.map((record) => (record.id === selectedRecord.id ? payload.data : record))
      );
      setSelectedRecord(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'تعذر تحديث السجل');
    } finally {
      setIsSaving(false);
    }
  };

  const clearFilters = () => {
    setStatus('ALL');
    setFrom('');
    setTo('');
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">الحالة</label>
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            >
              <option value="ALL">كل الحالات</option>
              {statusOptions.map((option) => (
                <option key={option} value={option}>
                  {statusLabels[option]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">من تاريخ</label>
            <input
              type="date"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">إلى تاريخ</label>
            <input
              type="date"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1 block">بحث</label>
            <input
              type="text"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="المريض أو الطبيب أو الخدمة"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">إجمالي السجلات: {pagination.total}</p>
          <button
            onClick={clearFilters}
            className="text-sm px-3 py-1.5 rounded-lg bg-secondary hover:bg-secondary/80"
          >
            إعادة الضبط
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-right px-4 py-3">المريض</th>
                <th className="text-right px-4 py-3">الطبيب</th>
                <th className="text-right px-4 py-3">الخدمة</th>
                <th className="text-right px-4 py-3">التاريخ</th>
                <th className="text-right px-4 py-3">الحالة</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground">
                    جار تحميل السجلات...
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-muted-foreground">
                    لا توجد سجلات مطابقة
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">{record.patient.user.name}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">
                          {record.patient.user.phoneNumber}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{record.doctor.user.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{record.service.name}</td>
                    <td className="px-4 py-3 text-muted-foreground" dir="ltr">
                      {new Date(record.appointmentDate).toLocaleDateString('ar-SA')} {record.appointmentTime}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${getStatusClasses(record.status)}`}>
                        {statusLabels[record.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEditModal(record)}
                        className="text-primary hover:underline text-xs"
                      >
                        تعديل
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button
          disabled={pagination.page <= 1 || isLoading}
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          className="px-4 py-2 rounded-lg bg-secondary disabled:opacity-50"
        >
          السابق
        </button>
        <p className="text-sm text-muted-foreground">
          صفحة {pagination.page} من {pagination.pages}
        </p>
        <button
          disabled={pagination.page >= pagination.pages || isLoading}
          onClick={() => setPage((current) => Math.min(pagination.pages, current + 1))}
          className="px-4 py-2 rounded-lg bg-secondary disabled:opacity-50"
        >
          التالي
        </button>
      </div>

      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl bg-card border border-border rounded-xl">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="font-bold text-lg">تحديث سجل الموعد</h3>
              <p className="text-sm text-muted-foreground mt-1">{selectedRecord.patient.user.name}</p>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium block mb-1">الحالة</label>
                <select
                  value={editStatus}
                  onChange={(event) => setEditStatus(event.target.value as AppointmentStatus)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background"
                >
                  {statusOptions.map((option) => (
                    <option key={option} value={option}>
                      {statusLabels[option]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">سبب الزيارة</label>
                <textarea
                  value={editReasonForVisit}
                  onChange={(event) => setEditReasonForVisit(event.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background resize-none"
                />
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">ملاحظات</label>
                <textarea
                  value={editNotes}
                  onChange={(event) => setEditNotes(event.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background resize-none"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 rounded-lg bg-secondary"
                disabled={isSaving}
              >
                إلغاء
              </button>
              <button
                onClick={saveRecord}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50"
                disabled={isSaving}
              >
                {isSaving ? 'جار الحفظ...' : 'حفظ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
