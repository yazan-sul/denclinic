'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';

// ── Types ────────────────────────────────────────────────────────────────────

interface Clinic  { id: number; name: string }
interface Branch  { id: number; name: string }

interface LastAppointment {
  id:              string;
  appointmentDate: string;
  appointmentTime: string;
  status:          string;
  service:         { name: string };
}

interface Patient {
  id:          number;
  dateOfBirth: string | null;
  gender:      string | null;
  user: { id: number; name: string; phoneNumber: string; email: string | null };
  appointments: LastAppointment[];
}

interface Pagination { page: number; pageSize: number; total: number; pages: number }

type SortField = 'name' | 'dateOfBirth' | 'lastAppointment';
type SortDir   = 'asc' | 'desc';

// ── Constants ─────────────────────────────────────────────────────────────────


const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'name',            label: 'الاسم'       },
  { value: 'dateOfBirth',     label: 'تاريخ الميلاد' },
  { value: 'lastAppointment', label: 'آخر موعد'    },
];

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  let local: string;
  if (digits.startsWith('970') && digits.length === 12) {
    local = digits.slice(3);
  } else if (digits.startsWith('0') && digits.length === 10) {
    local = digits.slice(1);
  } else {
    local = digits;
  }
  if (local.length === 9) {
    return `+970-${local.slice(0, 3)}-${local.slice(3, 6)}-${local.slice(6, 9)}`;
  }
  return phone;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long', day: 'numeric' });
}

function calcAge(dob: string | null): string {
  if (!dob) return '';
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
  return `${age} سنة`;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  initialSearch?:   string;
  initialClinicId?: string;
  initialBranchId?: string;
}

export default function PatientsList({ initialSearch = '', initialClinicId = '', initialBranchId = '' }: Props) {
  // Filters
  const [clinics,          setClinics]          = useState<Clinic[]>([]);
  const [branches,         setBranches]         = useState<Branch[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>(initialClinicId);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(initialBranchId);
  const [sortBy,           setSortBy]           = useState<SortField>('name');
  const [sortDir,          setSortDir]          = useState<SortDir>('asc');

  // Search & pagination
  const [searchInput, setSearchInput] = useState(initialSearch);
  const [search,      setSearch]      = useState(initialSearch);
  const [page,        setPage]        = useState(1);

  // Data
  const [patients,   setPatients]   = useState<Patient[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, pageSize: 20, total: 0, pages: 1 });
  const [isLoading,  setIsLoading]  = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  // ── Load clinics ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/doctor/clinics', { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data.length > 0) {
          setClinics(json.data);
          // Only auto-select first clinic if no initial value was provided
          if (!initialClinicId) setSelectedClinicId(String(json.data[0].id));
        }
      }).catch(() => {});
  }, [initialClinicId]);

  // ── Load branches when clinic changes ─────────────────────────────────────
  const isFirstBranchLoad = useRef(true);
  useEffect(() => {
    if (!selectedClinicId) return;
    setBranches([]);
    // On first load, keep the initialBranchId; on subsequent changes reset it
    if (isFirstBranchLoad.current) {
      isFirstBranchLoad.current = false;
    } else {
      setSelectedBranchId('');
    }
    fetch(`/api/clinic/branches?clinicId=${selectedClinicId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => { if (json.success) setBranches(json.data); })
      .catch(() => {});
  }, [selectedClinicId]);

  // ── Debounce search ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  // ── Query string ──────────────────────────────────────────────────────────
  const queryString = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), pageSize: '20', sortBy, sortDir });
    if (search)           p.set('search',   search);
    if (selectedClinicId) p.set('clinicId', selectedClinicId);
    if (selectedBranchId) p.set('branchId', selectedBranchId);
    return p.toString();
  }, [page, sortBy, sortDir, search, selectedClinicId, selectedBranchId]);

  // ── Fetch patients ────────────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    fetch(`/api/clinic/patients?${queryString}`, { credentials: 'include', signal: controller.signal })
      .then(r => r.json())
      .then(json => {
        if (!json.success) throw new Error(json.error?.message || 'تعذر تحميل المرضى');
        setPatients(json.data);
        setPagination(json.pagination);
      })
      .catch(err => { if (err.name !== 'AbortError') setError(err.message); })
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, [queryString]);

  const toggleSortDir = useCallback(() => setSortDir(d => d === 'asc' ? 'desc' : 'asc'), []);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4" dir="rtl">

      {/* ── Filters bar ── */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        {/* Row 1: search + count */}
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="بحث باسم المريض أو رقم الهاتف..."
            className="flex-1 px-3 py-2 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {isLoading ? '...' : `${pagination.total} مريض`}
          </span>
        </div>

        {/* Row 2: clinic + branch + sort */}
        <div className="flex flex-wrap gap-3">
          {/* Clinic */}
          {clinics.length > 0 && (
            <div className="flex items-center gap-1.5">
              <label className="text-xs text-muted-foreground whitespace-nowrap">العيادة:</label>
              <select
                value={selectedClinicId}
                onChange={e => { setSelectedClinicId(e.target.value); setPage(1); }}
                className="px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[130px]"
              >
                {clinics.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
              </select>
            </div>
          )}

          {/* Branch */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground whitespace-nowrap">الفرع:</label>
            <select
              value={selectedBranchId}
              onChange={e => { setSelectedBranchId(e.target.value); setPage(1); }}
              disabled={!branches.length}
              className="px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 min-w-[130px] disabled:opacity-50"
            >
              <option value="">جميع الفروع</option>
              {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
            </select>
          </div>

          {/* Sort field */}
          <div className="flex items-center gap-1.5">
            <label className="text-xs text-muted-foreground whitespace-nowrap">ترتيب حسب:</label>
            <select
              value={sortBy}
              onChange={e => { setSortBy(e.target.value as SortField); setPage(1); }}
              className="px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* Sort direction toggle */}
          <button
            onClick={toggleSortDir}
            title={sortDir === 'asc' ? 'تصاعدي — اضغط للتنازلي' : 'تنازلي — اضغط للتصاعدي'}
            className="flex items-center gap-1 px-3 py-1.5 border border-border rounded-lg bg-background text-sm hover:bg-secondary transition-colors"
          >
            <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
            <span className="text-xs text-muted-foreground">{sortDir === 'asc' ? 'تصاعدي' : 'تنازلي'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* ── Table ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/40">
                <th className="text-right px-4 py-3 font-medium">المريض</th>
                <th className="text-right px-4 py-3 font-medium">تاريخ الميلاد</th>
                <th className="text-right px-4 py-3 font-medium">رقم الهاتف</th>
                <th className="text-right px-4 py-3 font-medium">آخر حجز</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/50">
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-4">
                        <div className="h-4 bg-secondary rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : patients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-muted-foreground">
                    {search ? `لا توجد نتائج لـ "${search}"` : 'لا يوجد مرضى'}
                  </td>
                </tr>
              ) : (
                patients.map(patient => {
                  const last = patient.appointments[0] ?? null;
                  return (
                    <tr key={patient.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-foreground">{patient.user.name}</p>
                        {patient.gender && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {patient.gender === 'male' ? 'ذكر' : patient.gender === 'female' ? 'أنثى' : 'آخر'}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {patient.dateOfBirth ? (
                          <>
                            <p className="text-foreground">{formatDate(patient.dateOfBirth)}</p>
                            <p className="text-xs text-muted-foreground">{calcAge(patient.dateOfBirth)}</p>
                          </>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap" dir="ltr">
                        <span className="font-mono">{formatPhone(patient.user.phoneNumber)}</span>
                      </td>
                      <td className="px-4 py-3">
                        {last ? (
                          <>
                            <p className="text-foreground">{formatDate(last.appointmentDate)}</p>
                            <p className="text-xs text-muted-foreground mt-1">{last.service.name}</p>
                          </>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/doctor/patients/${patient.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors whitespace-nowrap"
                        >
                          عرض الملف
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ── */}
      <div className="flex items-center justify-between pt-1">
        <button
          disabled={pagination.page <= 1 || isLoading}
          onClick={() => setPage(p => Math.max(1, p - 1))}
          className="px-4 py-2 rounded-lg bg-secondary disabled:opacity-50 text-sm"
        >السابق</button>
        <p className="text-sm text-muted-foreground">
          صفحة {pagination.page} من {pagination.pages}
        </p>
        <button
          disabled={pagination.page >= pagination.pages || isLoading}
          onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
          className="px-4 py-2 rounded-lg bg-secondary disabled:opacity-50 text-sm"
        >التالي</button>
      </div>
    </div>
  );
}