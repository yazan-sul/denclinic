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

interface Dependent {
  id: number;
  patientId: number;
  relationship: string;
  status: 'PENDING' | 'APPROVED';
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
  const sz = size === 'sm' ? 'w-10 h-10 text-base' : 'w-12 h-12 text-lg';
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
      <h2 className="font-bold text-lg">{children}</h2>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

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

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ nationalId: '', relationship: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Confirm delete dialog
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
      if (grdRes.ok) {
        setGuardians(grdJson.data);
        setMyDateOfBirth(grdJson.myDateOfBirth ?? null);
      }
      if (gaRes.ok) setGuardianApprovals(gaJson.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleRespond = async (guardianUserId: number, approve: boolean) => {
    setRespondingId(guardianUserId);
    try {
      const res = await fetch(`/api/patient/family/requests/${guardianUserId}`, {
        method: approve ? 'PATCH' : 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'حدث خطأ');
      setRequests((prev) => prev.filter((r) => r.guardianUserId !== guardianUserId));
      if (approve) fetchAll();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRespondingId(null);
    }
  };

  const handleGuardianApproval = async (id: number, approve: boolean) => {
    setRespondingId(id);
    try {
      const res = await fetch(`/api/patient/family/guardian-approvals/${id}`, {
        method: approve ? 'PATCH' : 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'حدث خطأ');
      setGuardianApprovals((prev) => prev.filter((g) => g.id !== id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRespondingId(null);
    }
  };

  const isAdult = myDateOfBirth
    ? (Date.now() - new Date(myDateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000) >= 18
    : false;

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
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRemovingGuardianId(null);
    }
  };

  const handleAdd = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/patient/family', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'حدث خطأ');
      setDependents((prev) => [...prev, json.data]);
      setFormData({ nationalId: '', relationship: '' });
      setShowAddModal(false);
    } catch (e: any) {
      setFormError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    const { patientId } = confirmDelete;
    setConfirmDelete(null);
    setDeletingId(patientId);
    try {
      const res = await fetch(`/api/patient/family/${patientId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'حدث خطأ');
      setDependents((prev) => prev.filter((d) => d.patientId !== patientId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <PatientLayout title="العائلة" subtitle="إدارة أفراد العائلة والسجلات الطبية" showBackButton backHref="/patient">
      <div className="space-y-8">

        {/* ── طلبات الإضافة الواردة (البالغ يوافق على نفسه) ── */}
        {requests.length > 0 && (
          <section className="space-y-3">
            <SectionTitle>طلبات الإضافة الواردة</SectionTitle>
            {requests.map((r) => (
              <div key={r.id} className="bg-card border border-yellow-400/50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={r.guardianUser.name} src={r.guardianUser.avatar} size="sm" />
                    <div>
                      <p className="font-semibold">{r.guardianUser.name}</p>
                      <p className="text-sm text-muted-foreground">
                        يطلب إضافتك كـ {RELATIONSHIP_LABELS[r.relationship] ?? r.relationship}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button onClick={() => handleRespond(r.guardianUserId, true)} disabled={respondingId === r.guardianUserId}
                      className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                      قبول
                    </button>
                    <button onClick={() => handleRespond(r.guardianUserId, false)} disabled={respondingId === r.guardianUserId}
                      className="px-3 py-1.5 bg-destructive/20 text-destructive rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                      رفض
                    </button>
                  </div>
                </div>
                <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg px-3 py-2 text-xs text-yellow-700 dark:text-yellow-400 leading-relaxed">
                  ⚠️ بقبولك هذا الطلب، سيتمكن <span className="font-semibold">{r.guardianUser.name}</span> من رؤية سجلك الطبي.
                  لن تتمكن أنت من رؤية سجله إلا إذا أضفته أنت أيضاً من قائمة عائلتك.
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ── طلبات تحتاج موافقتك (ولي الأمر يوافق على قاصر) ── */}
        {guardianApprovals.length > 0 && (
          <section className="space-y-3">
            <SectionTitle sub="طلبات إضافة ولي أمر على من تتولى رعايتهم">طلبات تحتاج موافقتك</SectionTitle>
            {guardianApprovals.map((g) => (
              <div key={g.id} className="bg-card border border-orange-400/50 rounded-xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={g.guardianUser.name} src={g.guardianUser.avatar} size="sm" />
                  <div>
                    <p className="font-semibold">{g.guardianUser.name}</p>
                    <p className="text-sm text-muted-foreground">
                      يطلب الإضافة كـ {RELATIONSHIP_LABELS[g.relationship] ?? g.relationship} على {g.dependentPatient.user.name}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => handleGuardianApproval(g.id, true)} disabled={respondingId === g.id}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                    قبول
                  </button>
                  <button onClick={() => handleGuardianApproval(g.id, false)} disabled={respondingId === g.id}
                    className="px-3 py-1.5 bg-destructive/20 text-destructive rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                    رفض
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* ── زر الإضافة ── */}
        <button onClick={() => { setFormError(''); setShowAddModal(true); }}
          className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity">
          + أضف فرد عائلي
        </button>

        {/* ── أفراد عائلتي ── */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">{error}</div>
        ) : dependents.length > 0 ? (
          <section className="space-y-3">
            <SectionTitle sub="أنت تستطيع رؤية سجلاتهم الطبية">أفراد عائلتي</SectionTitle>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dependents.map((d) => {
                const { dependentPatient: p, relationship, patientId, status } = d;
                const isPending = status === 'PENDING';
                const age = calcAge(p.dateOfBirth);
                const lastVisit = p.appointments[0]?.appointmentDate ?? null;
                return (
                  <div key={d.id} className={`bg-card border rounded-xl p-4 space-y-3 hover:shadow-lg transition-shadow ${isPending ? 'border-yellow-400/50 opacity-75' : 'border-border'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar name={p.user.name} src={p.user.avatar} />
                        <div>
                          <h3 className="font-semibold text-base">{p.user.name}</h3>
                          <p className="text-sm text-primary font-medium">{RELATIONSHIP_LABELS[relationship] ?? relationship}</p>
                        </div>
                      </div>
                      {isPending && (
                        <span className="text-xs bg-yellow-400/20 text-yellow-700 px-2 py-1 rounded-full font-semibold shrink-0">
                          قيد التأكيد
                        </span>
                      )}
                    </div>

                    {!isPending && (
                      <div className="space-y-2 border-t border-border pt-3">
                        {age !== null && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">العمر</span>
                            <span className="font-semibold">{age} سنة</span>
                          </div>
                        )}
                        {p.bloodType && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">فصيلة الدم</span>
                            <span className="font-semibold bg-red-500/20 text-red-700 px-2 py-0.5 rounded text-xs">{p.bloodType}</span>
                          </div>
                        )}
                        {lastVisit && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">آخر زيارة</span>
                            <span className="text-muted-foreground">{new Date(lastVisit).toLocaleDateString('ar-SA')}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {isPending && (
                      <p className="text-xs text-muted-foreground border-t border-border pt-3">
                        في انتظار الموافقة على طلب الإضافة
                      </p>
                    )}

                    <div className="flex gap-2 pt-2 border-t border-border">
                      {!isPending && (
                        <Link href={`/patient/family/${patientId}`}
                          className="flex-1 py-2 bg-secondary text-foreground rounded-lg text-sm font-semibold hover:bg-secondary/80 transition-colors text-center">
                          السجل الطبي
                        </Link>
                      )}
                      <button
                        onClick={() => setConfirmDelete({ patientId, name: p.user.name })}
                        disabled={deletingId === patientId}
                        className="px-3 py-2 bg-destructive/20 text-destructive rounded-lg text-sm font-semibold hover:opacity-90 disabled:opacity-50">
                        {deletingId === patientId ? '...' : 'حذف'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        ) : (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">👨‍👩‍👧‍👦</div>
            <h2 className="text-lg font-semibold mb-2">لا توجد أفراد عائلة</h2>
            <p className="text-muted-foreground">أضف أفراد عائلتك لتتمكن من إدارة سجلاتهم الطبية</p>
          </div>
        )}

        {/* ── من أضافوك للعائلة ── */}
        {guardians.length > 0 && (
          <section className="space-y-3">
            <SectionTitle sub="هؤلاء يمكنهم رؤية سجلك الطبي — أنت لا ترى سجلاتهم إلا إذا أضفتهم أنت أيضاً">
              من أضافوك للعائلة
            </SectionTitle>
            <div className="space-y-2">
              {guardians.map((g) => (
                <div key={g.id} className="bg-card border border-border rounded-xl p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={g.guardianUser.name} src={g.guardianUser.avatar} size="sm" />
                    <div>
                      <p className="font-semibold">{g.guardianUser.name}</p>
                      <p className="text-sm text-muted-foreground">{RELATIONSHIP_LABELS[g.relationship] ?? g.relationship}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-1 rounded-full font-medium">
                      يرى سجلك
                    </span>
                    {isAdult && (
                      <button
                        onClick={() => setConfirmRemoveGuardian({ guardianUserId: g.guardianUserId, name: g.guardianUser.name })}
                        disabled={removingGuardianId === g.guardianUserId}
                        className="px-2 py-1 bg-destructive/20 text-destructive rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50"
                      >
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
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-background w-full md:w-[420px] rounded-t-2xl md:rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-right">أضف فرد عائلي</h2>

            {formError && (
              <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg text-right">
                {formError}
              </div>
            )}

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">رقم الهوية</label>
                <input type="text" value={formData.nationalId}
                  onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  placeholder="أدخل رقم هوية الشخص" required dir="ltr" />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-right">الصلة</label>
                <select value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right" required>
                  <option value="">اختر الصلة</option>
                  {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Privacy notice */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-3 text-xs text-muted-foreground leading-relaxed text-right">
                ℹ️ بإضافة هذا الشخص ستتمكن من رؤية سجله الطبي وحجز المواعيد له.
                <span className="block mt-1 font-medium text-foreground">
                  لن يتمكن من رؤية سجلك الطبي إلا إذا أضافك هو أيضاً من جهته.
                </span>
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-muted text-foreground rounded-lg font-semibold hover:bg-muted/80 transition-colors">
                  إلغاء
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 disabled:opacity-50">
                  {submitting ? 'جاري الإضافة...' : 'تأكيد الإضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Dialog: تأكيد الحذف ── */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-background w-full max-w-sm rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-right">تأكيد إزالة فرد العائلة</h3>
            <p className="text-sm text-muted-foreground text-right leading-relaxed">
              هل أنت متأكد من إزالة <span className="font-semibold text-foreground">{confirmDelete.name}</span> من قائمة عائلتك؟
            </p>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-xs text-destructive leading-relaxed text-right">
              ⚠️ بعد الإزالة لن تتمكن من رؤية سجله الطبي ولن تتمكن من حجز مواعيد له.
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 bg-muted text-foreground rounded-lg font-semibold hover:bg-muted/80 transition-colors">
                إلغاء
              </button>
              <button onClick={handleDelete}
                className="flex-1 py-2 bg-destructive text-white rounded-lg font-semibold hover:opacity-90 transition-opacity">
                إزالة
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ── Dialog: تأكيد إزالة ولي الأمر ── */}
      {confirmRemoveGuardian && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
          <div className="bg-background w-full max-w-sm rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-right">إزالة من قائمة المسؤولين</h3>
            <p className="text-sm text-muted-foreground text-right leading-relaxed">
              هل أنت متأكد من إزالة <span className="font-semibold text-foreground">{confirmRemoveGuardian.name}</span> من قائمة من يرون سجلك الطبي؟
            </p>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 text-xs text-destructive leading-relaxed text-right">
              ⚠️ بعد الإزالة لن يتمكن من رؤية سجلك الطبي أو متابعة علاجك.
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setConfirmRemoveGuardian(null)}
                className="flex-1 py-2 bg-muted text-foreground rounded-lg font-semibold hover:bg-muted/80 transition-colors">
                إلغاء
              </button>
              <button onClick={handleRemoveGuardian}
                className="flex-1 py-2 bg-destructive text-white rounded-lg font-semibold hover:opacity-90 transition-opacity">
                إزالة
              </button>
            </div>
          </div>
        </div>
      )}
    </PatientLayout>
  );
}