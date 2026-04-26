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

function calcAge(dob: string | null): number | null {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

function Initials({ name }: { name: string }) {
  const letter = name.trim()[0] ?? '؟';
  return (
    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg select-none">
      {letter}
    </div>
  );
}

export default function FamilyPage() {
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [requests, setRequests] = useState<IncomingRequest[]>([]);
  const [guardians, setGuardians] = useState<Guardian[]>([]);
  const [respondingId, setRespondingId] = useState<number | null>(null);

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ nationalId: '', relationship: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchDependents = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const [depRes, reqRes, grdRes] = await Promise.all([
        fetch('/api/patient/family'),
        fetch('/api/patient/family/requests'),
        fetch('/api/patient/family/guardians'),
      ]);
      const [depJson, reqJson, grdJson] = await Promise.all([
        depRes.json(), reqRes.json(), grdRes.json(),
      ]);
      if (!depRes.ok) throw new Error(depJson.error?.message || 'حدث خطأ');
      setDependents(depJson.data);
      if (reqRes.ok) setRequests(reqJson.data);
      if (grdRes.ok) setGuardians(grdJson.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDependents(); }, [fetchDependents]);

  const handleRespond = async (guardianUserId: number, approve: boolean) => {
    setRespondingId(guardianUserId);
    try {
      const res = await fetch(`/api/patient/family/requests/${guardianUserId}`, {
        method: approve ? 'PATCH' : 'DELETE',
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error?.message || 'حدث خطأ');
      setRequests((prev) => prev.filter((r) => r.guardianUserId !== guardianUserId));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setRespondingId(null);
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

  const handleDelete = async (patientId: number) => {
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
    <PatientLayout
      title="العائلة"
      subtitle="إدارة أفراد العائلة والسجلات الطبية"
      showBackButton
      backHref="/patient"
    >
      <div className="space-y-6">
        {requests.length > 0 && (
          <div className="space-y-3">
            <h2 className="font-bold text-lg">طلبات الإضافة الواردة</h2>
            {requests.map((r) => (
              <div key={r.id} className="bg-card border border-yellow-400/50 rounded-lg p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  {r.guardianUser.avatar
                    ? <img src={r.guardianUser.avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
                    : <Initials name={r.guardianUser.name} />
                  }
                  <div>
                    <p className="font-semibold">{r.guardianUser.name}</p>
                    <p className="text-sm text-muted-foreground">
                      يطلب إضافتك كـ {RELATIONSHIP_LABELS[r.relationship] ?? r.relationship}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleRespond(r.guardianUserId, true)}
                    disabled={respondingId === r.guardianUserId}
                    className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    قبول
                  </button>
                  <button
                    onClick={() => handleRespond(r.guardianUserId, false)}
                    disabled={respondingId === r.guardianUserId}
                    className="px-3 py-1.5 bg-destructive/20 text-destructive rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    رفض
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => { setFormError(''); setShowAddModal(true); }}
          className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          + أضف فرد عائلي
        </button>

        {loading ? (
          <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
        ) : error ? (
          <div className="text-center py-8 text-destructive">{error}</div>
        ) : dependents.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">👨‍👩‍👧‍👦</div>
            <h2 className="text-lg font-semibold mb-2">لا توجد أفراد عائلة</h2>
            <p className="text-muted-foreground">أضف أفراد عائلتك لتتمكن من إدارة سجلاتهم الطبية</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {dependents.map((d) => {
              const { dependentPatient: p, relationship, patientId, status } = d;
              const isPending = status === 'PENDING';
              const age = calcAge(p.dateOfBirth);
              const lastVisit = p.appointments[0]?.appointmentDate ?? null;
              return (
                <div key={d.id} className={`bg-card border rounded-lg p-4 space-y-3 hover:shadow-lg transition-shadow ${isPending ? 'border-yellow-400/50 opacity-75' : 'border-border'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {p.user.avatar
                        ? <img src={p.user.avatar} className="w-12 h-12 rounded-full object-cover" alt="" />
                        : <Initials name={p.user.name} />
                      }
                      <div>
                        <h3 className="font-semibold text-lg">{p.user.name}</h3>
                        <p className="text-sm text-primary font-medium">{RELATIONSHIP_LABELS[relationship] ?? relationship}</p>
                      </div>
                    </div>
                    {isPending && (
                      <span className="text-xs bg-yellow-400/20 text-yellow-700 px-2 py-1 rounded-full font-semibold">
                        قيد التأكيد
                      </span>
                    )}
                  </div>

                  {!isPending && (
                    <div className="space-y-2 border-t border-border pt-3">
                      {age !== null && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">العمر</span>
                          <span className="font-semibold">{age} سنة</span>
                        </div>
                      )}
                      {p.bloodType && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">فصيلة الدم</span>
                          <span className="font-semibold bg-red-500/20 text-red-700 px-2 py-1 rounded text-xs">{p.bloodType}</span>
                        </div>
                      )}
                      {lastVisit && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground text-sm">آخر زيارة</span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(lastVisit).toLocaleDateString('ar-SA')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {isPending && (
                    <p className="text-xs text-muted-foreground border-t border-border pt-3">
                      في انتظار موافقة الشخص على طلب الإضافة
                    </p>
                  )}

                  <div className="flex gap-2 pt-3 border-t border-border">
                    {!isPending && (
                      <Link
                        href={`/patient/family/${patientId}`}
                        className="flex-1 py-2 bg-secondary text-foreground rounded-lg text-sm font-semibold hover:bg-secondary/80 transition-colors text-center"
                      >
                        السجل الطبي
                      </Link>
                    )}
                    <button
                      onClick={() => handleDelete(patientId)}
                      disabled={deletingId === patientId}
                      className="px-3 py-2 bg-destructive/20 text-destructive rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                      {deletingId === patientId ? '...' : 'حذف'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {guardians.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-lg">من أضافوك للعائلة</h2>
          <p className="text-xs text-muted-foreground -mt-1">هؤلاء يمكنهم رؤية معلوماتك الطبية</p>
          <div className="space-y-2">
            {guardians.map((g) => (
              <div key={g.id} className="bg-card border border-border rounded-lg p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {g.guardianUser.avatar
                    ? <img src={g.guardianUser.avatar} className="w-10 h-10 rounded-full object-cover" alt="" />
                    : <Initials name={g.guardianUser.name} />
                  }
                  <div>
                    <p className="font-semibold">{g.guardianUser.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {RELATIONSHIP_LABELS[g.relationship] ?? g.relationship}
                    </p>
                  </div>
                </div>
                <span className="text-xs bg-blue-500/10 text-blue-600 px-2 py-1 rounded-full font-medium">
                  يرى معلوماتك
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-background w-full md:w-96 rounded-t-lg md:rounded-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-right">أضف فرد عائلي</h2>

            {formError && (
              <div className="bg-destructive/10 text-destructive text-sm px-4 py-3 rounded-lg text-right">
                {formError}
              </div>
            )}

            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">رقم الهوية</label>
                <input
                  type="text"
                  value={formData.nationalId}
                  onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  placeholder="أدخل رقم هوية الشخص"
                  required
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 text-right">الصلة</label>
                <select
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  required
                >
                  <option value="">اختر الصلة</option>
                  {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-muted text-foreground rounded-lg font-semibold hover:bg-muted/80 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {submitting ? 'جاري الإضافة...' : 'إضافة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PatientLayout>
  );
}