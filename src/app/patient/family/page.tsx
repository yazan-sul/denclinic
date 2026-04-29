'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import PatientLayout from '@/components/layouts/PatientLayout';

const RELATIONSHIP_LABELS: Record<string, string> = {
  PARENT: 'والد/والدة',
  SPOUSE: 'زوج/زوجة',
  SIBLING: 'أخ/أخت',
  CHILD: 'ابن/ابنة',
  GRANDPARENT: 'جد/جدة',
  OTHER: 'أخرى',
};

const REVERSE_RELATIONSHIP_LABELS: Record<string, string> = {
  PARENT: 'ابن/ابنة له',
  CHILD: 'والد/والدة له',
  SPOUSE: 'زوج/زوجة له',
  SIBLING: 'أخ/أخت له',
  GRANDPARENT: 'حفيد/حفيدة له',
  OTHER: 'أخرى',
};

interface Dependent {
  id: number;
  patientId: number;
  relationship: string;
  status: 'PENDING' | 'APPROVED';
  dependentInitiated: boolean;
  dependentPatient: {
    id: number;
    dateOfBirth: string | null;
    bloodType: string | null;
    user: { name: string; avatar: string | null };
    appointments: { appointmentDate: string }[];
  };
}

interface IncomingRequest {
  id: number;
  guardianUserId: number;
  relationship: string;
  guardianUser: { name: string; avatar: string | null };
}

interface Guardian {
  id: number;
  guardianUserId: number;
  relationship: string;
  reverseStatus: 'PENDING' | 'APPROVED' | null;
  guardianUser: { name: string; avatar: string | null };
}

interface GuardianApproval {
  id: number;
  guardianUserId: number;
  relationship: string;
  guardianUser: { name: string; avatar: string | null };
  dependentPatient: { user: { name: string } };
}

function calcAge(dob: string | null): number | null {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function Avatar({ name, src, size = 'md' }: { name: string; src: string | null; size?: 'sm' | 'md' }) {
  const sz = size === 'sm' ? 'w-10 h-10 text-base' : 'w-11 h-11 text-lg';
  if (src) return <img src={src} className={`${sz} rounded-full object-cover shrink-0`} alt="" />;
  return (
    <div className={`${sz} rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold shrink-0 select-none`}>
      {name.trim()[0] ?? '؟'}
    </div>
  );
}

function SectionTitle({ children, sub }: { children: string; sub?: string }) {
  return (
    <div className="space-y-0.5">
      <h2 className="font-bold text-base sm:text-lg">{children}</h2>
      {sub && <p className="text-xs text-muted-foreground leading-relaxed">{sub}</p>}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2.5 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right text-sm';
const btnPrimary = 'flex-1 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50';
const btnMuted = 'flex-1 py-2.5 bg-muted text-foreground rounded-lg text-sm font-semibold hover:bg-muted/80 transition-colors';
const btnDanger = 'px-3 py-2.5 bg-destructive/20 text-destructive rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50';

export default function FamilyPage() {
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [myDateOfBirth, setMyDateOfBirth] = useState<string | null>(null);
  const [guardianApprovals, setGuardianApprovals] = useState<GuardianApproval[]>([]);
  const [respondingId, setRespondingId] = useState<number | null>(null);
  const [confirmRemoveGuardian, setConfirmRemoveGuardian] = useState<{ guardianUserId: number; name: string } | null>(null);
  const [removingGuardianId, setRemovingGuardianId] = useState<number | null>(null);
  const [requestingAccessId, setRequestingAccessId] = useState<number | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [addStep, setAddStep] = useState<1 | 2>(1);
  const [addDirection, setAddDirection] = useState<'guardian' | 'dependent' | null>(null);
  const [formData, setFormData] = useState({ nationalId: '', relationship: '' });
  const [lookupResult, setLookupResult] = useState<{ name: string; phone: string } | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createFileMode, setCreateFileMode] = useState(false);
  const [newFileData, setNewFileData] = useState({ name: '', dateOfBirth: '', gender: '', bloodType: '', phone: '' });

  const [confirmDelete, setConfirmDelete] = useState<{ patientId: number; name: string } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [depRes, reqRes, grdRes, gaRes] = await Promise.all([
        fetch('/api/patient/family'),
        fetch('/api/patient/family/requests'),
        fetch('/api/patient/family/guardians'),
        fetch('/api/patient/family/guardian-approvals'),
      ]);
      const [depJson, reqJson, grdJson, gaJson] = await Promise.all([
        depRes.json(), reqRes.json(), grdRes.json(), gaRes.json(),
      ]);
      if (!depRes.ok) throw new Error(depJson.error?.message || 'حدث خطأ');
      setDependents(depJson.data);
      if (reqRes.ok) setRequests(reqJson.data);
      if (grdRes.ok) { setGuardians(grdJson.data); setMyDateOfBirth(grdJson.myDateOfBirth ?? null); }
      if (gaRes.ok) setGuardianApprovals(gaJson.data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const isAdult = myDateOfBirth
    ? (Date.now() - new Date(myDateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000) >= 18
    : false;

  const handleRespond = async (guardianUserId: number, approve: boolean) => {
    setRespondingId(guardianUserId);
    try {
      const res = await fetch(`/api/patient/family/requests/${guardianUserId}`, { method: approve ? 'PATCH' : 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'حدث خطأ');
      setRequests((prev) => prev.filter((r) => r.guardianUserId !== guardianUserId));
      if (approve) fetchAll();
    } catch (e: any) { setError(e.message); }
    finally { setRespondingId(null); }
  };

  const handleGuardianApproval = async (id: number, approve: boolean) => {
    setRespondingId(id);
    try {
      const res = await fetch(`/api/patient/family/guardian-approvals/${id}`, { method: approve ? 'PATCH' : 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'حدث خطأ');
      setGuardianApprovals((prev) => prev.filter((g) => g.id !== id));
    } catch (e: any) { setError(e.message); }
    finally { setRespondingId(null); }
  };

  const handleRemoveGuardian = async () => {
    if (!confirmRemoveGuardian) return;
    const { guardianUserId } = confirmRemoveGuardian;
    setConfirmRemoveGuardian(null);
    setRemovingGuardianId(guardianUserId);
    try {
      const res = await fetch(`/api/patient/family/guardians/${guardianUserId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'حدث خطأ');
      setGuardians((prev) => prev.filter((g) => g.guardianUserId !== guardianUserId));
    } catch (e: any) { setError(e.message); }
    finally { setRemovingGuardianId(null); }
  };

  const handleRequestAccess = async (guardianUserId: number) => {
    setRequestingAccessId(guardianUserId);
    try {
      const res = await fetch(`/api/patient/family/request-access/${guardianUserId}`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'حدث خطأ');
      setGuardians((prev) => prev.map((g) => g.guardianUserId === guardianUserId ? { ...g, reverseStatus: 'PENDING' } : g));
    } catch (e: any) { setError(e.message); }
    finally { setRequestingAccessId(null); }
  };

  const handleCancelGuardianRequest = async (guardianUserId: number) => {
    try {
      const res = await fetch(`/api/patient/family/request-access/${guardianUserId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'حدث خطأ');
      setGuardians((prev) => prev.filter((g) => g.guardianUserId !== guardianUserId));
    } catch (e: any) { setError(e.message); }
  };

  const handleApproveDependent = async (patientId: number, approve: boolean) => {
    try {
      const res = await fetch(`/api/patient/family/${patientId}`, { method: approve ? 'PATCH' : 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'حدث خطأ');
      if (approve) setDependents((prev) => prev.map((d) => d.patientId === patientId ? { ...d, status: 'APPROVED' } : d));
      else setDependents((prev) => prev.filter((d) => d.patientId !== patientId));
    } catch (e: any) { setError(e.message); }
  };

  const resetModal = () => {
    setAddStep(1); setAddDirection(null);
    setFormData({ nationalId: '', relationship: '' });
    setLookupResult(null); setFormError('');
    setCreateFileMode(false);
    setNewFileData({ name: '', dateOfBirth: '', gender: '', bloodType: '', phone: '' });
  };

  const handleLookup = async () => {
    if (!formData.nationalId.trim()) return;
    setLookupLoading(true); setLookupResult(null); setFormError('');
    try {
      const res = await fetch(`/api/patient/family/lookup?nationalId=${encodeURIComponent(formData.nationalId.trim())}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'حدث خطأ');
      setLookupResult(json.data);
    } catch (e: any) { setFormError(e.message); }
    finally { setLookupLoading(false); }
  };

  const handleCreateFile = async (e: { preventDefault: () => void }) => {
    e.preventDefault(); setFormError(''); setSubmitting(true);
    try {
      const res = await fetch('/api/patient/family/create-file', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nationalId: formData.nationalId, relationship: formData.relationship, ...newFileData }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'حدث خطأ');
      setDependents((prev) => [...prev, json.data]);
      resetModal(); setShowAddModal(false);
    } catch (e: any) { setFormError(e.message); }
    finally { setSubmitting(false); }
  };

  const handleAdd = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!lookupResult) return;
    setFormError(''); setSubmitting(true);
    try {
      const res = await fetch('/api/patient/family', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, direction: addDirection === 'guardian' ? 'add-guardian' : 'add-dependent' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'حدث خطأ');
      if (addDirection === 'dependent') setDependents((prev) => [...prev, json.data]);
      resetModal(); setShowAddModal(false); fetchAll();
    } catch (e: any) { setFormError(e.message); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { patientId } = confirmDelete;
    setConfirmDelete(null); setDeletingId(patientId);
    try {
      const res = await fetch(`/api/patient/family/${patientId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'حدث خطأ');
      setDependents((prev) => prev.filter((d) => d.patientId !== patientId));
    } catch (e: any) { setError(e.message); }
    finally { setDeletingId(null); }
  };

  return (
    <PatientLayout title="العائلة" subtitle="إدارة أفراد العائلة والسجلات الطبية" showBackButton backHref="/patient">
      <div className="space-y-6">

        {/* ── طلبات الإضافة الواردة ── */}
        {requests.length > 0 && (
          <section className="space-y-3">
            <SectionTitle>طلبات الإضافة الواردة</SectionTitle>
            {requests.map((r) => (
              <div key={r.id} className="bg-card border border-yellow-400/50 rounded-xl p-3 sm:p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Avatar name={r.guardianUser.name} src={r.guardianUser.avatar} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm sm:text-base truncate">{r.guardianUser.name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      يطلب إضافتك كـ {RELATIONSHIP_LABELS[r.relationship] ?? r.relationship}
                    </p>
                  </div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg px-3 py-2 text-xs text-yellow-700 dark:text-yellow-400 leading-relaxed">
                  ⚠️ بقبولك هذا الطلب سيتمكن <span className="font-semibold">{r.guardianUser.name}</span> من رؤية سجلك الطبي. لن تتمكن من رؤية سجله إلا إذا أضفته أنت أيضاً.
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleRespond(r.guardianUserId, true)} disabled={respondingId === r.guardianUserId}
                    className={btnPrimary}>قبول</button>
                  <button onClick={() => handleRespond(r.guardianUserId, false)} disabled={respondingId === r.guardianUserId}
                    className="flex-1 py-2.5 bg-destructive/20 text-destructive rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50">رفض</button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ── طلبات تحتاج موافقتك ── */}
        {guardianApprovals.length > 0 && (
          <section className="space-y-3">
            <SectionTitle sub="طلبات إضافة ولي أمر على من تتولى رعايتهم">طلبات تحتاج موافقتك</SectionTitle>
            {guardianApprovals.map((g) => (
              <div key={g.id} className="bg-card border border-orange-400/50 rounded-xl p-3 sm:p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Avatar name={g.guardianUser.name} src={g.guardianUser.avatar} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sm sm:text-base truncate">{g.guardianUser.name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      يطلب الإضافة كـ {RELATIONSHIP_LABELS[g.relationship] ?? g.relationship} على {g.dependentPatient.user.name}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleGuardianApproval(g.id, true)} disabled={respondingId === g.id}
                    className={btnPrimary}>قبول</button>
                  <button onClick={() => handleGuardianApproval(g.id, false)} disabled={respondingId === g.id}
                    className="flex-1 py-2.5 bg-destructive/20 text-destructive rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50">رفض</button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ── زر الإضافة ── */}
        <button onClick={() => { setFormError(''); setShowAddModal(true); }}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity text-sm sm:text-base">
          + أضف فرد عائلي
        </button>

        {/* ── أفراد عائلتي ── */}
        {loading ? (
          <div className="text-center py-10 text-muted-foreground text-sm">جاري التحميل...</div>
        ) : error ? (
          <div className="text-center py-8 text-destructive text-sm">{error}</div>
        ) : dependents.length > 0 ? (
          <section className="space-y-3">
            <SectionTitle sub="أنت تستطيع رؤية سجلاتهم الطبية">أفراد عائلتي</SectionTitle>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dependents.map((d) => {
                const { dependentPatient: p, relationship, patientId, status, dependentInitiated } = d;
                const isPending = status === 'PENDING';
                const theyAskedMe = isPending && dependentInitiated;
                const age = calcAge(p.dateOfBirth);
                const lastVisit = p.appointments[0]?.appointmentDate ?? null;
                return (
                  <div key={d.id} className={`bg-card border rounded-xl p-3 sm:p-4 space-y-3 ${theyAskedMe ? 'border-orange-400/50' : isPending ? 'border-yellow-400/50 opacity-80' : 'border-border'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar name={p.user.name} src={p.user.avatar} />
                        <div className="min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base truncate">{p.user.name}</h3>
                          <p className="text-xs text-primary font-medium">{RELATIONSHIP_LABELS[relationship] ?? relationship}</p>
                        </div>
                      </div>
                      {theyAskedMe && (
                        <span className="text-xs bg-orange-400/20 text-orange-700 px-2 py-1 rounded-full font-semibold shrink-0">يطلب ولايتك</span>
                      )}
                      {isPending && !theyAskedMe && (
                        <span className="text-xs bg-yellow-400/20 text-yellow-700 px-2 py-1 rounded-full font-semibold shrink-0">قيد التأكيد</span>
                      )}
                    </div>

                    {!isPending && (
                      <div className="space-y-1.5 border-t border-border pt-3">
                        {age !== null && (
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-muted-foreground">العمر</span>
                            <span className="font-semibold">{age} سنة</span>
                          </div>
                        )}
                        {p.bloodType && (
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-muted-foreground">فصيلة الدم</span>
                            <span className="font-semibold bg-red-500/20 text-red-700 px-2 py-0.5 rounded">{p.bloodType}</span>
                          </div>
                        )}
                        {lastVisit && (
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-muted-foreground">آخر زيارة</span>
                            <span className="text-muted-foreground">{new Date(lastVisit).toLocaleDateString('ar-SA')}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {isPending && !theyAskedMe && (
                      <p className="text-xs text-muted-foreground border-t border-border pt-2">في انتظار موافقة الشخص</p>
                    )}

                    <div className="flex gap-2 pt-2 border-t border-border">
                      {!isPending && (
                        <Link href={`/patient/family/${patientId}`}
                          className="flex-1 py-2.5 bg-secondary text-foreground rounded-lg text-sm font-semibold hover:bg-secondary/80 text-center">
                          السجل الطبي
                        </Link>
                      )}
                      {theyAskedMe ? (
                        <>
                          <button onClick={() => handleApproveDependent(patientId, true)} className={btnPrimary}>قبول</button>
                          <button onClick={() => handleApproveDependent(patientId, false)} className={btnDanger}>رفض</button>
                        </>
                      ) : isPending ? (
                        <button onClick={() => setConfirmDelete({ patientId, name: p.user.name })} className={btnMuted}>إلغاء الطلب</button>
                      ) : (
                        <button onClick={() => setConfirmDelete({ patientId, name: p.user.name })} disabled={deletingId === patientId} className={btnDanger}>
                          {deletingId === patientId ? '...' : 'حذف'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">👨‍👩‍👧‍👦</div>
            <h2 className="text-base font-semibold mb-1">لا توجد أفراد عائلة</h2>
            <p className="text-sm text-muted-foreground">أضف أفراد عائلتك لتتمكن من إدارة سجلاتهم الطبية</p>
          </div>
        )}

        {/* ── من أضافوك للعائلة ── */}
        {guardians.length > 0 && (
          <section className="space-y-3">
            <SectionTitle sub="هؤلاء يمكنهم رؤية سجلك الطبي — لن ترى سجلاتهم إلا إذا أضفتهم أنت أيضاً">
              من أضافوك للعائلة
            </SectionTitle>
            <div className="space-y-2">
              {guardians.map((g) => (
                <div key={g.id} className="bg-card border border-border rounded-xl p-3 sm:p-4 space-y-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar name={g.guardianUser.name} src={g.guardianUser.avatar} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm sm:text-base truncate">{g.guardianUser.name}</p>
                      <p className="text-xs text-muted-foreground">{REVERSE_RELATIONSHIP_LABELS[g.relationship] ?? g.relationship}</p>
                    </div>
                    <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-1 rounded-full font-medium shrink-0">يرى سجلك</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border">
                    {isAdult && !g.reverseStatus && (
                      <button onClick={() => handleRequestAccess(g.guardianUserId)} disabled={requestingAccessId === g.guardianUserId}
                        className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50">
                        {requestingAccessId === g.guardianUserId ? '...' : 'طلب رؤية سجله'}
                      </button>
                    )}
                    {g.reverseStatus === 'PENDING' && (
                      <>
                        <span className="text-xs bg-yellow-400/20 text-yellow-700 px-2 py-1 rounded-full font-medium">في انتظار الموافقة</span>
                        <button onClick={() => handleCancelGuardianRequest(g.guardianUserId)}
                          className="px-3 py-1.5 bg-muted text-muted-foreground rounded-lg text-xs font-semibold hover:opacity-90">
                          إلغاء
                        </button>
                      </>
                    )}
                    {g.reverseStatus === 'APPROVED' && (
                      <span className="text-xs bg-green-500/10 text-green-600 px-2 py-1 rounded-full font-medium">وصول متبادل</span>
                    )}
                    {isAdult && (
                      <button onClick={() => setConfirmRemoveGuardian({ guardianUserId: g.guardianUserId, name: g.guardianUser.name })}
                        disabled={removingGuardianId === g.guardianUserId}
                        className="px-3 py-1.5 bg-destructive/20 text-destructive rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50 mr-auto">
                        {removingGuardianId === g.guardianUserId ? '...' : 'إزالة'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* ── Modal: إضافة فرد ── */}
      {showAddModal && !createFileMode && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-end sm:items-center justify-center">
          <div className="bg-background w-full sm:w-[440px] sm:max-w-[calc(100vw-2rem)] rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 pb-[calc(1rem+4.5rem)] sm:pb-6 space-y-4 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold">أضف فرد عائلي</h2>
              {addStep === 2 && (
                <button onClick={() => { setAddStep(1); setAddDirection(null); setLookupResult(null); setFormError(''); }}
                  className="text-sm text-muted-foreground hover:text-foreground px-2 py-1">← رجوع</button>
              )}
            </div>

            {addStep === 1 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground text-right">ما الذي تريده؟</p>
                {isAdult && (
                  <button onClick={() => { setAddDirection('dependent'); setAddStep(2); }}
                    className="w-full text-right p-4 bg-card border border-border rounded-xl hover:border-primary transition-colors space-y-1 active:scale-[0.98]">
                    <p className="font-semibold text-sm sm:text-base">سأكون ولي الأمر</p>
                    <p className="text-xs text-muted-foreground">ستتمكن من رؤية سجله الطبي وحجز المواعيد له</p>
                  </button>
                )}
                <button onClick={() => { setAddDirection('guardian'); setAddStep(2); }}
                  className="w-full text-right p-4 bg-card border border-border rounded-xl hover:border-primary transition-colors space-y-1 active:scale-[0.98]">
                  <p className="font-semibold text-sm sm:text-base">سيكون ولي الأمر عليّ</p>
                  <p className="text-xs text-muted-foreground">سيتمكن من رؤية سجلك الطبي وحجز المواعيد لك</p>
                </button>
                <button onClick={() => { resetModal(); setShowAddModal(false); }} className={btnMuted}>إلغاء</button>
              </div>
            )}

            {addStep === 2 && (
              <form onSubmit={handleAdd} className="space-y-4">
                {formError && (
                  <div className="bg-destructive/10 text-destructive text-sm px-3 py-2.5 rounded-lg text-right">{formError}</div>
                )}
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-right">رقم الهوية</label>
                  <div className="flex gap-2">
                    <input type="text" value={formData.nationalId}
                      onChange={(e) => { setFormData({ ...formData, nationalId: e.target.value }); setLookupResult(null); setFormError(''); }}
                      className={`${inputCls} flex-1`} placeholder="رقم الهوية" dir="ltr" />
                    <button type="button" onClick={handleLookup} disabled={lookupLoading || !formData.nationalId.trim()}
                      className="px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50 shrink-0">
                      {lookupLoading ? '...' : 'بحث'}
                    </button>
                  </div>
                </div>

                {lookupResult && (
                  <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 space-y-1 text-right">
                    <p className="text-xs text-muted-foreground">تم العثور على الشخص</p>
                    <p className="font-bold text-sm sm:text-base">{lookupResult.name}</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{lookupResult.phone}</p>
                  </div>
                )}

                {lookupResult && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold mb-1.5 text-right">الصلة</label>
                      <select value={formData.relationship} onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                        className={inputCls} required>
                        <option value="">اختر الصلة</option>
                        {Object.entries(RELATIONSHIP_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </div>
                    <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2.5 text-xs text-muted-foreground leading-relaxed text-right">
                      {addDirection === 'dependent'
                        ? <>ℹ️ ستتمكن من رؤية سجل <span className="font-semibold text-foreground">{lookupResult.name}</span> الطبي. لن يرى سجلك إلا إذا طلبك هو أيضاً.</>
                        : <>ℹ️ سيتمكن <span className="font-semibold text-foreground">{lookupResult.name}</span> من رؤية سجلك الطبي بعد موافقته.</>
                      }
                    </div>
                    <div className="flex gap-2 pt-1 border-t border-border">
                      <button type="button" onClick={() => { resetModal(); setShowAddModal(false); }} className={btnMuted}>إلغاء</button>
                      <button type="submit" disabled={submitting || !formData.relationship} className={btnPrimary}>
                        {submitting ? 'جاري الإرسال...' : 'إرسال الطلب'}
                      </button>
                    </div>
                  </>
                )}

                {!lookupResult && formError && addDirection === 'dependent' && (
                  <button type="button" onClick={() => { setFormError(''); setCreateFileMode(true); }}
                    className="w-full py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-semibold hover:opacity-90">
                    إنشاء ملف طبي لهذا الشخص
                  </button>
                )}

                {!lookupResult && (
                  <button type="button" onClick={() => { resetModal(); setShowAddModal(false); }} className={btnMuted}>إلغاء</button>
                )}
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: إنشاء ملف طبي ── */}
      {createFileMode && showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-end sm:items-center justify-center">
          <div className="bg-background w-full sm:w-[440px] sm:max-w-[calc(100vw-2rem)] rounded-t-2xl sm:rounded-2xl p-4 sm:p-6 pb-[calc(1rem+4.5rem)] sm:pb-6 space-y-4 max-h-[85vh] sm:max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg sm:text-xl font-bold">إنشاء ملف طبي</h2>
              <button onClick={() => { setCreateFileMode(false); setFormError(''); }}
                className="text-sm text-muted-foreground hover:text-foreground px-2 py-1">← رجوع</button>
            </div>
            <div className="bg-muted/50 rounded-lg px-3 py-2 text-xs text-muted-foreground text-right">
              رقم الهوية: <span className="font-mono font-semibold" dir="ltr">{formData.nationalId}</span>
            </div>
            {formError && (
              <div className="bg-destructive/10 text-destructive text-sm px-3 py-2.5 rounded-lg text-right">{formError}</div>
            )}
            <form onSubmit={handleCreateFile} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-right">الاسم الكامل</label>
                <input type="text" value={newFileData.name}
                  onChange={(e) => setNewFileData({ ...newFileData, name: e.target.value })}
                  className={inputCls} placeholder="أدخل الاسم الرباعي" required />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-right">
                  رقم الهاتف <span className="text-muted-foreground font-normal">(اختياري)</span>
                </label>
                <input type="tel" value={newFileData.phone} dir="ltr"
                  onChange={(e) => setNewFileData({ ...newFileData, phone: e.target.value })}
                  className={inputCls} placeholder="+970 591 000 001" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-right">تاريخ الميلاد</label>
                <input type="date" value={newFileData.dateOfBirth}
                  onChange={(e) => setNewFileData({ ...newFileData, dateOfBirth: e.target.value })}
                  className={inputCls} max={new Date().toISOString().split('T')[0]} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-right">الجنس</label>
                  <select value={newFileData.gender} onChange={(e) => setNewFileData({ ...newFileData, gender: e.target.value })} className={inputCls}>
                    <option value="">اختر</option>
                    <option value="male">ذكر</option>
                    <option value="female">أنثى</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1.5 text-right">فصيلة الدم</label>
                  <select value={newFileData.bloodType} onChange={(e) => setNewFileData({ ...newFileData, bloodType: e.target.value })} className={inputCls}>
                    <option value="">اختر</option>
                    {['O+','O-','A+','A-','B+','B-','AB+','AB-'].map((bt) => <option key={bt} value={bt}>{bt}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-1.5 text-right">الصلة</label>
                <select value={formData.relationship} onChange={(e) => setFormData({ ...formData, relationship: e.target.value })} className={inputCls} required>
                  <option value="">اختر الصلة</option>
                  {Object.entries(RELATIONSHIP_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div className="flex gap-2 pt-1 border-t border-border">
                <button type="button" onClick={() => { resetModal(); setShowAddModal(false); }} className={btnMuted}>إلغاء</button>
                <button type="submit" disabled={submitting} className={btnPrimary}>
                  {submitting ? 'جاري الإنشاء...' : 'إنشاء وإضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Dialog: تأكيد الحذف ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center px-4">
          <div className="bg-background w-full max-w-sm rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-right">تأكيد إزالة فرد العائلة</h3>
            <p className="text-sm text-muted-foreground text-right leading-relaxed">
              هل أنت متأكد من إزالة <span className="font-semibold text-foreground">{confirmDelete.name}</span>؟
            </p>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-xs text-destructive text-right leading-relaxed">
              ⚠️ بعد الإزالة لن تتمكن من رؤية سجله الطبي أو حجز مواعيد له.
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmDelete(null)} className={btnMuted}>إلغاء</button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-destructive text-white rounded-lg text-sm font-semibold hover:opacity-90">إزالة</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dialog: تأكيد إزالة ولي الأمر ── */}
      {confirmRemoveGuardian && (
        <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center px-4">
          <div className="bg-background w-full max-w-sm rounded-2xl p-5 space-y-4">
            <h3 className="text-base font-bold text-right">إزالة من قائمة المسؤولين</h3>
            <p className="text-sm text-muted-foreground text-right leading-relaxed">
              هل أنت متأكد من إزالة <span className="font-semibold text-foreground">{confirmRemoveGuardian.name}</span>؟
            </p>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-xs text-destructive text-right leading-relaxed">
              ⚠️ بعد الإزالة لن يتمكن من رؤية سجلك الطبي أو متابعة علاجك.
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmRemoveGuardian(null)} className={btnMuted}>إلغاء</button>
              <button onClick={handleRemoveGuardian} className="flex-1 py-2.5 bg-destructive text-white rounded-lg text-sm font-semibold hover:opacity-90">إزالة</button>
            </div>
          </div>
        </div>
      )}
    </PatientLayout>
  );
}