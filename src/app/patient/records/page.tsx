'use client';

import React, { useEffect, useMemo, useState } from 'react';
import PatientLayout from '@/components/layouts/PatientLayout';

type AppointmentStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'RESCHEDULED'
  | 'PAYMENT_FAILED';

interface MedicalRecord {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  status: AppointmentStatus;
  reasonForVisit?: string | null;
  notes?: string | null;
  clinic: { name: string };
  branch: { name: string };
  doctor: { user: { name: string } };
  service: { name: string };
}

interface RecordsResponse {
  success: boolean;
  data: MedicalRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    pages: number;
  };
}

export default function RecordsPage() {
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [status, setStatus] = useState<AppointmentStatus | 'ALL'>('ALL');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 20, total: 0, pages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const downloadPdf = async (recordId: string) => {
    try {
      setDownloadingId(recordId);
      const response = await fetch(`/api/patient/records/${recordId}/pdf`);
      
      if (!response.ok) {
        throw new Error('فشل تحميل ملف PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `medical-record-${recordId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تحميل ملف PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  useEffect(() => {
    const controller = new AbortController();

    const loadRecords = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: '20',
        });
        
        if (status !== 'ALL') {
          params.set('status', status);
        }

        if (from) params.set('from', from);
        if (to) params.set('to', to);
        if (search) params.set('search', search);

        const response = await fetch(`/api/patient/records?${params.toString()}`, {
          method: 'GET',
          credentials: 'include',
          cache: 'no-store',
          signal: controller.signal,
        });

        const payload = (await response.json()) as
          | RecordsResponse
          | { success: false; error?: { message?: string } };

        if (!response.ok || !payload.success) {
          const message =
            'error' in payload ? payload.error?.message : undefined;
          throw new Error(message || 'تعذر تحميل السجلات الطبية');
        }

        setMedicalRecords(payload.data);
        setPagination(payload.pagination);
        
        // Cache data for offline PWA use
        try {
          if (typeof window !== 'undefined') {
            const cacheKey = `medical_records_page_${page}_status_${status}`;
            localStorage.setItem(cacheKey, JSON.stringify(payload));
          }
        } catch (e) {
          console.error('Failed to cache records for offline use', e);
        }
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') {
          return;
        }
        
        // Offline PWA fallback
        if (typeof window !== 'undefined' && !navigator.onLine) {
          try {
            const cacheKey = `medical_records_page_${page}_status_${status}`;
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
              const payload = JSON.parse(cached);
              setMedicalRecords(payload.data);
              setPagination(payload.pagination);
              setError('أنت حاليا في وضع غير متصل بالإنترنت. يتم عرض البيانات المخزنة محليا.');
              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.error('Failed to read cached records', e);
          }
        }

        setError(
          loadError instanceof Error ? loadError.message : 'تعذر تحميل السجلات الطبية'
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadRecords();

    return () => controller.abort();
  }, [page, status, from, to, search, refreshKey]);

  const statusLabels = useMemo(
    () => ({
      PENDING: 'قيد الانتظار',
      CONFIRMED: 'مؤكد',
      CANCELLED: 'ملغي',
      COMPLETED: 'مكتمل',
      NO_SHOW: 'لم يحضر',
      RESCHEDULED: 'أعيدت الجدولة',
      PAYMENT_FAILED: 'فشل الدفع',
    }),
    []
  );

  const getStatusColor = (appointmentStatus: AppointmentStatus) => {
    if (appointmentStatus === 'COMPLETED') {
      return 'bg-green-500/20 text-green-700';
    }
    if (appointmentStatus === 'CONFIRMED' || appointmentStatus === 'RESCHEDULED') {
      return 'bg-blue-500/20 text-blue-700';
    }
    if (appointmentStatus === 'PENDING') {
      return 'bg-yellow-500/20 text-yellow-700';
    }
    if (appointmentStatus === 'CANCELLED' || appointmentStatus === 'PAYMENT_FAILED') {
      return 'bg-red-500/20 text-red-700';
    }

    return 'bg-gray-500/20 text-gray-700';
  };

  const getStatusLabel = (appointmentStatus: AppointmentStatus) => {
    return statusLabels[appointmentStatus] ?? appointmentStatus;
  };

  const statusOptions: AppointmentStatus[] = [
    'COMPLETED',
    'CONFIRMED',
    'PENDING',
    'CANCELLED',
    'NO_SHOW',
    'RESCHEDULED',
    'PAYMENT_FAILED',
  ];

  const clearFilters = () => {
    setFrom('');
    setTo('');
    setSearchInput('');
    setSearch('');
    setStatus('ALL');
    setPage(1);
  };

  return (
    <PatientLayout
      title="السجلات الطبية"
      subtitle="سجل زياراتك الطبية والتشخيصات"
      showBackButton
      backHref="/patient"
    >
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">الحالة</label>
              <select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as AppointmentStatus | 'ALL');
                  setPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              >
                <option value="ALL">الكل</option>
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
                className="w-full px-3 py-2 rounded-lg border border-border bg-background"
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
                className="w-full px-3 py-2 rounded-lg border border-border bg-background"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">بحث</label>
              <input
                type="text"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="الطبيب أو الخدمة أو العيادة"
                className="w-full px-3 py-2 rounded-lg border border-border bg-background"
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

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">جار تحميل السجلات...</div>
        ) : error ? (
          <div className="text-center py-12">
            <h2 className="text-lg font-semibold mb-2">تعذر تحميل السجلات</h2>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={() => setRefreshKey((current) => current + 1)}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : medicalRecords.length > 0 ? (
          <div className="space-y-3">
            {medicalRecords.map((record) => (
              <div
                key={record.id}
                className="bg-card border border-border rounded-lg p-4 space-y-3 hover:shadow-lg transition-shadow"
              >
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() =>
                    setExpandedId(expandedId === record.id ? null : record.id)
                  }
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{record.service.name}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          record.status
                        )}`}
                      >
                        {getStatusLabel(record.status)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(record.appointmentDate).toLocaleDateString('ar-SA')} - {record.appointmentTime}
                    </p>
                  </div>
                  <div className="text-xl transition-transform">
                    {expandedId === record.id ? '▼' : '◀'}
                  </div>
                </div>

                {expandedId === record.id && (
                  <div className="space-y-3 border-t border-border pt-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">الطبيب</p>
                        <p className="font-semibold text-sm">{record.doctor.user.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">العيادة</p>
                        <p className="font-semibold text-sm">{record.clinic.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">الفرع</p>
                        <p className="font-semibold text-sm">{record.branch.name}</p>
                      </div>
                    </div>

                    {record.reasonForVisit && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">سبب الزيارة</p>
                        <p className="text-sm text-foreground">{record.reasonForVisit}</p>
                      </div>
                    )}

                    {record.notes && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">الملاحظات</p>
                        <p className="text-sm text-foreground">{record.notes}</p>
                      </div>
                    )}

                    <div className="pt-2">
                      <button
                        onClick={() => downloadPdf(record.id)}
                        disabled={downloadingId === record.id}
                        className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors text-sm font-medium disabled:opacity-50"
                      >
                        {downloadingId === record.id ? (
                          <>
                            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            جاري التحميل...
                          </>
                        ) : (
                          <>
                            <span>📄</span>
                            تحميل نسخة PDF
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            <div className="flex items-center justify-between pt-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="px-4 py-2 rounded-lg bg-secondary disabled:opacity-50"
              >
                السابق
              </button>
              <p className="text-sm text-muted-foreground">
                صفحة {pagination.page} من {pagination.pages}
              </p>
              <button
                disabled={pagination.page >= pagination.pages}
                onClick={() => setPage((current) => Math.min(pagination.pages, current + 1))}
                className="px-4 py-2 rounded-lg bg-secondary disabled:opacity-50"
              >
                التالي
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-lg font-semibold mb-2">لا توجد سجلات طبية</h2>
            <p className="text-muted-foreground">لا توجد سجلات مطابقة للمرشحات الحالية</p>
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
