'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useActiveRole } from '@/context/ActiveRoleContext';
import { formatPhone } from '@/lib/format';

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
  const layoutRole = useActiveRole();

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
    fetch(`/api/doctor/clinics${layoutRole === 'STAFF' ? '?activeRole=STAFF' : ''}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        if (json.success && json.data.length > 0) {
          setClinics(json.data);
          if (!initialClinicId) setSelectedClinicId(String(json.data[0].id));
        }
      }).catch(() => {});
  }, [initialClinicId, layoutRole]);

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
    fetch(`/api/clinic/branches?clinicId=${selectedClinicId}${layoutRole === 'STAFF' ? '&activeRole=STAFF' : ''}`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => { if (json.success) setBranches(json.data); })
      .catch(() => {});
  }, [selectedClinicId, layoutRole]);

  // ── Debounce search ───────────────────────────────────────────────────────
  useEffect(() => {
    const t = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 350);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  // ── Query string ──────────────────────────────────────────────────────────
  const queryString = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), pageSize: '20', sortBy, sortDir });
    if (search)                 p.set('search',     search);
    if (selectedClinicId)       p.set('clinicId',   selectedClinicId);
    if (selectedBranchId)       p.set('branchId',   selectedBranchId);
    if (layoutRole === 'STAFF') p.set('activeRole', 'STAFF');
    return p.toString();
  }, [page, sortBy, sortDir, search, selectedClinicId, selectedBranchId, layoutRole]);

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
      <div className="bg-card border border-border rounded-xl p-3 md:p-4 space-y-2 md:space-y-3">

        {/* Row 1: search */}
        <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
          placeholder="اسم أو هاتف..."
          className="w-full px-2 py-1 md:py-1.5 border border-border rounded-lg bg-background text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />

        {/* Row 2: 4 cols — عيادة | فرع | ترتيب | اتجاه */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
          <div>
            <label className="block text-[9px] md:text-[10px] text-muted-foreground mb-0.5 md:mb-1">العيادة</label>
            <select value={selectedClinicId} onChange={e => { setSelectedClinicId(e.target.value); setPage(1); }}
              className="w-full px-2 py-1 md:py-1.5 text-xs md:text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
              {clinics.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] md:text-[10px] text-muted-foreground mb-0.5 md:mb-1">الفرع</label>
            <select value={selectedBranchId} onChange={e => { setSelectedBranchId(e.target.value); setPage(1); }}
              disabled={!branches.length}
              className="w-full px-2 py-1 md:py-1.5 text-xs md:text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40">
              <option value="">جميع الفروع</option>
              {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] md:text-[10px] text-muted-foreground mb-0.5 md:mb-1">ترتيب</label>
            <select value={sortBy} onChange={e => { setSortBy(e.target.value as SortField); setPage(1); }}
              className="w-full px-2 py-1 md:py-1.5 text-xs md:text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/30">
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[9px] md:text-[10px] text-muted-foreground mb-0.5 md:mb-1">الاتجاه</label>
            <button onClick={toggleSortDir}
              className="w-full flex items-center justify-center gap-1 px-2 py-1 md:py-1.5 border border-border rounded-lg bg-background text-xs md:text-sm hover:bg-secondary transition-colors">
              <span>{sortDir === 'asc' ? '↑' : '↓'}</span>
            </button>
          </div>
        </div>

        {/* Row 3: عدد + تنظيف */}
        <div className="flex items-center justify-between border-t border-border/50 pt-2 md:pt-3">
          <span className="text-xs md:text-sm text-muted-foreground">{isLoading ? '...' : `${pagination.total} مريض`}</span>
          <button onClick={() => {
            setSearchInput(''); setSearch('');
            setSelectedClinicId(''); setSelectedBranchId('');
            setSortBy('name'); setSortDir('asc'); setPage(1);
          }} className="text-xs px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors whitespace-nowrap">
            تنظيف
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 md:px-4 py-2 md:py-3 text-xs md:text-sm text-red-700">{error}</div>
      )}

      {/* ── Table ── */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
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
                  <td colSpan={5} className="text-center py-12 text-muted-foreground text-sm">
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
                      <td className="px-4 py-3 text-right" dir="rtl">
                        <span className="font-mono text-sm">{formatPhone(patient.user.phoneNumber)}</span>
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
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                          عرض
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
          {isLoading ? (
            <div className="space-y-3 p-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 bg-secondary rounded-lg animate-pulse" />
              ))}
            </div>
          ) : patients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm p-3">
              {search ? `لا توجد نتائج لـ "${search}"` : 'لا يوجد مرضى'}
            </div>
          ) : (
            <div className="space-y-2 p-3">
              {patients.map(patient => {
                const last = patient.appointments[0] ?? null;
                return (
                  <div key={patient.id} className="bg-background border border-border rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground text-sm truncate">{patient.user.name}</p>
                        {patient.gender && (
                          <p className="text-xs text-muted-foreground">
                            {patient.gender === 'male' ? 'ذكر' : patient.gender === 'female' ? 'أنثى' : 'آخر'}
                          </p>
                        )}
                      </div>
                      <Link
                        href={`/doctor/patients/${patient.id}`}
                        className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded whitespace-nowrap flex-shrink-0"
                      >
                        عرض
                      </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                      <div>
                        <p className="text-muted-foreground">الجنس / العمر</p>
                        {patient.dateOfBirth ? (
                          <p className="text-foreground">{calcAge(patient.dateOfBirth)}</p>
                        ) : (
                          <p className="text-muted-foreground">—</p>
                        )}
                      </div>
                      <div>
                        <p className="text-muted-foreground">الهاتف</p>
                        <p className="font-mono text-foreground" dir="rtl">{formatPhone(patient.user.phoneNumber)}</p>
                      </div>
                    </div>

                    {last && (
                      <div className="text-xs border-t border-border/50 pt-2">
                        <p className="text-muted-foreground">آخر حجز</p>
                        <p className="text-foreground">{formatDate(last.appointmentDate)}</p>
                        <p className="text-muted-foreground">{last.service.name}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
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