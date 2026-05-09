'use client';

import { useState, useEffect, useCallback } from 'react';
import { SearchIcon, XIcon, CheckCircleIcon } from '@/components/Icons';
import { formatPhone } from '@/lib/format';

// ─── Types ────────────────────────────────────────────────────────────────────

type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';
type PaymentMethod = 'CASH' | 'CARD' | 'BANK_TRANSFER' | 'ONLINE_PAYMENT' | 'INSURANCE';
type TabId        = 'ALL' | 'PENDING' | 'COMPLETED' | 'REFUNDED';

interface Payment {
  id: string;
  amount: number;
  originalAmount: number | null;
  discountType:   string | null;
  discountValue:  number | null;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionTime: string;
  description: string | null;
  appointmentId: string | null;
  appointment: {
    id: string;
    appointmentDate: string;
    appointmentTime: string;
    patient: { id: number; user: { name: string; phoneNumber: string } };
    service: { name: string; basePrice: number };
    doctor:  { user: { name: string } };
    branch:  { name: string };
  } | null;
}

interface Stats {
  todayRevenue:   number;
  todayCount:     number;
  pendingCount:   number;
  pendingAmount:  number;
  refundedAmount: number;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const statusConfig: Record<PaymentStatus, { label: string; className: string }> = {
  PENDING:       { label: 'معلّق',    className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  COMPLETED:     { label: 'مدفوع',   className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  FAILED:        { label: 'فاشل',    className: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
  REFUNDED:      { label: 'مسترد',   className: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300' },
  CANCELLED:     { label: 'ملغي',    className: 'bg-gray-100 dark:bg-gray-800 text-gray-500' },
};

const methodLabels: Record<PaymentMethod, string> = {
  CASH:           'نقدي',
  CARD:           'بطاقة',
  BANK_TRANSFER:  'تحويل بنكي',
  ONLINE_PAYMENT: 'إلكتروني',
  INSURANCE:      'تأمين',
};

const tabs: { id: TabId; label: string }[] = [
  { id: 'ALL',       label: 'الكل' },
  { id: 'PENDING',   label: 'معلّقة' },
  { id: 'COMPLETED', label: 'مدفوعة' },
  { id: 'REFUNDED',  label: 'مستردة' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function StaffPaymentsPanel() {
  const [payments,   setPayments]   = useState<Payment[]>([]);
  const [stats,      setStats]      = useState<Stats | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState<TabId>('ALL');
  const [search,     setSearch]     = useState('');
  const [toast,      setToast]      = useState('');
  const [toastType,  setToastType]  = useState<'success' | 'error'>('success');

  // ── Clinic / Branch filter ────────────────────────────────────────────────────
  const [clinics,        setClinics]        = useState<{ id: number; name: string }[]>([]);
  const [branches,       setBranches]       = useState<{ id: number; name: string }[]>([]);
  const [selectedClinic, setSelectedClinic] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');

  // ── Record payment modal ──────────────────────────────────────────────────────
  const [showRecord,       setShowRecord]       = useState(false);
  const [recordStep,       setRecordStep]       = useState<1 | 2>(1);
  const [searchPhone,      setSearchPhone]      = useState('');
  const [searchingPatient, setSearchingPatient] = useState(false);
  const [foundAppointments, setFoundAppointments] = useState<Payment['appointment'][]>([]);
  const [selectedAppt,     setSelectedAppt]     = useState<Payment['appointment'] | null>(null);
  const [payMethod,        setPayMethod]        = useState<'CASH' | 'CARD' | 'BANK_TRANSFER'>('CASH');
  const [payCurrency,      setPayCurrency]      = useState<'ILS' | 'USD' | 'JOD' | 'EUR'>('ILS');
  const [payAmount,        setPayAmount]        = useState('');
  const [discountType,     setDiscountType]     = useState<'NONE' | 'PERCENTAGE' | 'FIXED'>('NONE');
  const [discountValue,    setDiscountValue]    = useState('');
  const [payNotes,         setPayNotes]         = useState('');
  const [recordError,      setRecordError]      = useState('');
  const [recording,        setRecording]        = useState(false);

  // ── Mark paid modal ───────────────────────────────────────────────────────────
  const [markTarget,  setMarkTarget]  = useState<Payment | null>(null);
  const [marking,     setMarking]     = useState(false);

  // ── Invoice modal ─────────────────────────────────────────────────────────────
  const [invoiceTarget, setInvoiceTarget] = useState<Payment | null>(null);

  // ── Load clinics on mount ────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/doctor/clinics?activeRole=STAFF', { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data?.length) {
          setClinics(j.data);
          setSelectedClinic(String(j.data[0].id));
        }
      }).catch(() => {});
  }, []);

  // ── Load branches when clinic changes ────────────────────────────────────────
  useEffect(() => {
    if (!selectedClinic) return;
    setBranches([]);
    setSelectedBranch('');
    fetch(`/api/clinic/branches?clinicId=${selectedClinic}&activeRole=STAFF`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data?.length) {
          setBranches(j.data);
          setSelectedBranch(String(j.data[0].id));
        }
      }).catch(() => {});
  }, [selectedClinic]);

  // ── Fetch payments ────────────────────────────────────────────────────────────
  const fetchPayments = useCallback(async () => {
    if (!selectedClinic) return;
    setLoading(true);
    try {
      const statusQ = activeTab !== 'ALL' ? `&status=${activeTab}` : '';
      const searchQ = search ? `&search=${encodeURIComponent(search)}` : '';
      const clinicQ = `&clinicId=${selectedClinic}`;
      const branchQ = selectedBranch ? `&branchId=${selectedBranch}` : '';
      const res  = await fetch(`/api/staff/payments?pageSize=50${clinicQ}${branchQ}${statusQ}${searchQ}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setPayments(json.data.payments ?? []);
        setStats(json.data.stats ?? null);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [activeTab, search, selectedClinic, selectedBranch]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  // ── Toast ─────────────────────────────────────────────────────────────────────
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(''), 3500);
  };

  // ── Final amount preview ──────────────────────────────────────────────────────
  const baseAmount = Number(payAmount) || 0;
  const discVal    = Number(discountValue) || 0;
  const finalAmount = discountType === 'PERCENTAGE'
    ? baseAmount * (1 - discVal / 100)
    : discountType === 'FIXED'
      ? Math.max(0, baseAmount - discVal)
      : baseAmount;

  // ── Search appointments for patient ───────────────────────────────────────────
  const searchPatientAppointments = async () => {
    if (!searchPhone.trim()) return;
    setSearchingPatient(true);
    setFoundAppointments([]);
    setRecordError('');
    try {
      const branchQ = selectedBranch ? `&branchId=${selectedBranch}` : '';
      const res  = await fetch(
        `/api/clinic/records?activeRole=STAFF&clinicId=${selectedClinic}&search=${encodeURIComponent(searchPhone.trim())}&statuses=PENDING,CONFIRMED,RESCHEDULED&pageSize=20${branchQ}`,
        { credentials: 'include' }
      );
      const json = await res.json();
      if (json.success) {
        const appts = (json.data ?? []).map((a: Record<string, unknown>) => {
          const patient = a.patient as { id: number; user: { name: string; phoneNumber: string } };
          const service = a.service as { name: string; basePrice: number };
          const doctor  = a.doctor  as { user: { name: string } };
          const branch  = a.branch  as { name: string };
          return {
            id:              String(a.id),
            appointmentDate: String(a.appointmentDate ?? '').split('T')[0],
            appointmentTime: String(a.appointmentTime ?? ''),
            patient, service, doctor, branch,
          };
        });
        setFoundAppointments(appts);
        if (appts.length === 0) setRecordError('لا توجد مواعيد نشطة لهذا المريض');
      }
    } catch { setRecordError('تعذر البحث'); }
    finally { setSearchingPatient(false); }
  };

  // ── Open record modal ─────────────────────────────────────────────────────────
  const openRecord = () => {
    setRecordStep(1); setSearchPhone(''); setFoundAppointments([]);
    setSelectedAppt(null); setPayMethod('CASH'); setPayCurrency('ILS'); setPayAmount('');
    setDiscountType('NONE'); setDiscountValue(''); setPayNotes('');
    setRecordError(''); setShowRecord(true);
  };

  // ── Submit record payment ─────────────────────────────────────────────────────
  const submitRecord = async () => {
    if (!selectedAppt || !payAmount) return;
    if (discountType === 'PERCENTAGE' && (discVal < 0 || discVal > 100)) {
      setRecordError('نسبة الخصم يجب أن تكون بين 0 و 100'); return;
    }
    if (discountType === 'FIXED' && discVal > baseAmount) {
      setRecordError('قيمة الخصم أكبر من المبلغ'); return;
    }
    setRecording(true); setRecordError('');
    try {
      const res  = await fetch('/api/staff/payments/record', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: selectedAppt.id,
          method: payMethod,
          currency: payCurrency,
          amount: baseAmount,
          discountType,
          discountValue: discVal,
          notes: payNotes || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowRecord(false);
        showToast(json.message ?? 'تم تسجيل الدفعة');
        fetchPayments();
      } else {
        setRecordError(json.error?.message ?? json.message ?? 'تعذر التسجيل');
      }
    } catch { setRecordError('تعذر الاتصال'); }
    finally { setRecording(false); }
  };

  // ── Mark cash as paid ─────────────────────────────────────────────────────────
  const handleMarkPaid = async () => {
    if (!markTarget) return;
    setMarking(true);
    try {
      const res  = await fetch(`/api/payments/${markTarget.id}/mark-paid`, {
        method: 'POST', credentials: 'include',
      });
      const json = await res.json();
      if (json.success) {
        setMarkTarget(null);
        showToast('تم تأكيد استلام الدفعة');
        fetchPayments();
      } else {
        showToast(json.error?.message ?? 'تعذر التأكيد', 'error');
      }
    } catch { showToast('تعذر الاتصال', 'error'); }
    finally { setMarking(false); }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6" dir="rtl">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2 text-white
          ${toastType === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
          <CheckCircleIcon className="w-4 h-4" /> {toast}
        </div>
      )}

      {/* Clinic / Branch filter */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={selectedClinic} onChange={e => setSelectedClinic(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
          {clinics.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
        </select>
        <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary">
          <option value="">كل الفروع</option>
          {branches.map(b => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">إيرادات اليوم</p>
          <p className="text-2xl font-bold">{(stats?.todayRevenue ?? 0).toLocaleString('ar')} <span className="text-sm font-normal text-muted-foreground">₪</span></p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">معاملات اليوم</p>
          <p className="text-2xl font-bold">{stats?.todayCount ?? 0}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">معلّقة</p>
          <p className="text-2xl font-bold text-amber-600">
            {stats?.pendingCount ?? 0}
            <span className="text-sm font-normal text-muted-foreground mr-1">({(stats?.pendingAmount ?? 0).toLocaleString('ar')} ₪)</span>
          </p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-xs text-muted-foreground mb-1">مستردات</p>
          <p className="text-2xl font-bold text-red-500">{(stats?.refundedAmount ?? 0).toLocaleString('ar')} <span className="text-sm font-normal text-muted-foreground">₪</span></p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="ابحث (اسم، هاتف)..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="pr-9 pl-4 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary w-52" />
          </div>
          <button onClick={openRecord}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 whitespace-nowrap">
            + تسجيل دفعة
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground text-sm">
          لا توجد مدفوعات
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-right px-4 py-3 font-semibold">المريض</th>
                  <th className="text-right px-4 py-3 font-semibold hidden sm:table-cell">الخدمة</th>
                  <th className="text-right px-4 py-3 font-semibold">المبلغ</th>
                  <th className="text-right px-4 py-3 font-semibold hidden md:table-cell">طريقة الدفع</th>
                  <th className="text-right px-4 py-3 font-semibold">الحالة</th>
                  <th className="text-right px-4 py-3 font-semibold hidden lg:table-cell">التاريخ</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.appointment?.patient.user.name ?? '—'}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">
                        {formatPhone(p.appointment?.patient.user.phoneNumber ?? '')}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                      {p.appointment?.service.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-bold">
                      {p.amount.toLocaleString('ar')} ₪
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                      {methodLabels[p.method] ?? p.method}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[p.status]?.className}`}>
                        {statusConfig[p.status]?.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell" dir="ltr">
                      {p.transactionTime?.split('T')[0]}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 justify-end">
                        {p.status === 'PENDING' && p.method === 'CASH' && (
                          <button onClick={() => setMarkTarget(p)}
                            className="text-xs text-green-600 hover:underline font-medium whitespace-nowrap">
                            تأكيد الاستلام
                          </button>
                        )}
                        {(p.status === 'COMPLETED' || p.status === 'PENDING') && (
                          <button onClick={() => setInvoiceTarget(p)}
                            className="text-xs text-primary hover:underline font-medium whitespace-nowrap">
                            فاتورة
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Mark Paid Modal ── */}
      {markTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm border border-border" dir="rtl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-bold">تأكيد استلام الدفعة</h2>
              <button onClick={() => setMarkTarget(null)}><XIcon className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-secondary/40 rounded-xl p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المريض</span>
                  <span className="font-medium">{markTarget.appointment?.patient.user.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الخدمة</span>
                  <span>{markTarget.appointment?.service.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المبلغ</span>
                  <span className="font-bold text-primary">{markTarget.amount} ₪</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">هل تأكدت من استلام المبلغ نقداً؟</p>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-border">
              <button onClick={() => setMarkTarget(null)} className="flex-1 py-2 text-sm border border-border rounded-xl hover:bg-secondary">تراجع</button>
              <button onClick={handleMarkPaid} disabled={marking}
                className="flex-1 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50">
                {marking ? 'جاري...' : 'تأكيد الاستلام'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice Modal ── */}
      {invoiceTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm border border-border" dir="rtl">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-bold">فاتورة</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-secondary">
                  طباعة
                </button>
                <button onClick={() => setInvoiceTarget(null)}>
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Invoice body */}
            <div className="p-5 space-y-4 print:p-0">

              {/* Clinic info */}
              <div className="text-center space-y-0.5">
                <p className="font-bold text-base">{invoiceTarget.appointment?.branch.name ?? 'العيادة'}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(invoiceTarget.transactionTime).toLocaleDateString('ar-EG', {
                    year: 'numeric', month: 'long', day: 'numeric',
                  })}
                </p>
              </div>

              <div className="border-t border-dashed border-border" />

              {/* Patient & appointment */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المريض</span>
                  <span className="font-medium">{invoiceTarget.appointment?.patient.user.name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الطبيب</span>
                  <span>{invoiceTarget.appointment?.doctor.user.name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الموعد</span>
                  <span dir="ltr">
                    {invoiceTarget.appointment?.appointmentDate?.split('T')[0]} — {invoiceTarget.appointment?.appointmentTime}
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-border" />

              {/* Amounts */}
              <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الخدمة</span>
                  <span>{invoiceTarget.appointment?.service.name ?? '—'}</span>
                </div>

                {/* Original amount */}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المبلغ الأصلي</span>
                  <span>{(invoiceTarget.originalAmount ?? invoiceTarget.amount).toFixed(2)} ₪</span>
                </div>

                {/* Discount */}
                {invoiceTarget.discountType && invoiceTarget.discountType !== 'NONE' && (invoiceTarget.discountValue ?? 0) > 0 && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>
                      خصم {invoiceTarget.discountType === 'PERCENTAGE'
                        ? `${invoiceTarget.discountValue}%`
                        : `${invoiceTarget.discountValue} ₪`}
                    </span>
                    <span>
                      -{invoiceTarget.discountType === 'PERCENTAGE'
                        ? (((invoiceTarget.originalAmount ?? invoiceTarget.amount) * (invoiceTarget.discountValue ?? 0)) / 100).toFixed(2)
                        : (invoiceTarget.discountValue ?? 0).toFixed(2)} ₪
                    </span>
                  </div>
                )}
              </div>

              <div className="border-t border-border" />

              {/* Total */}
              <div className="flex justify-between items-center">
                <span className="font-bold">الإجمالي</span>
                <span className="font-bold text-primary text-lg">{invoiceTarget.amount.toFixed(2)} ₪</span>
              </div>

              {/* Method & status */}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">طريقة الدفع</span>
                <span>{methodLabels[invoiceTarget.method] ?? invoiceTarget.method}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">الحالة</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[invoiceTarget.status]?.className}`}>
                  {statusConfig[invoiceTarget.status]?.label}
                </span>
              </div>

              <div className="border-t border-dashed border-border" />
              <p className="text-center text-xs text-muted-foreground">شكراً لثقتكم بنا</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Record Payment Modal ── */}
      {showRecord && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md border border-border max-h-[90vh] flex flex-col" dir="rtl">

            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <h2 className="font-bold">{recordStep === 1 ? 'البحث عن المريض' : 'تفاصيل الدفعة'}</h2>
              <button onClick={() => setShowRecord(false)}><XIcon className="w-5 h-5" /></button>
            </div>

            {/* Step bar */}
            <div className="flex px-5 pt-3 pb-1 gap-1 flex-shrink-0">
              {[1, 2].map(s => (
                <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${recordStep >= s ? 'bg-primary' : 'bg-border'}`} />
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* Step 1 — find appointment */}
              {recordStep === 1 && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">ابحث عن المريض (اسم أو هاتف)</label>
                    <div className="flex gap-2">
                      <input value={searchPhone} onChange={e => { setSearchPhone(e.target.value); setRecordError(''); }}
                        onKeyDown={e => e.key === 'Enter' && searchPatientAppointments()}
                        placeholder="أدخل الاسم أو الهاتف..."
                        className="flex-1 px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                      <button onClick={searchPatientAppointments} disabled={searchingPatient || !searchPhone.trim()}
                        className="px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl disabled:opacity-50">
                        {searchingPatient ? '...' : 'بحث'}
                      </button>
                    </div>
                  </div>

                  {foundAppointments.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">اختر الموعد</p>
                      {foundAppointments.map(a => (
                        <button key={a!.id} onClick={() => {
                          setSelectedAppt(a);
                          setPayAmount(String(a!.service.basePrice));
                        }}
                          className={`w-full text-right p-3 rounded-xl border text-sm transition-all ${selectedAppt?.id === a!.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold">{a!.patient.user.name}</p>
                            <span className="text-xs bg-secondary px-2 py-0.5 rounded-lg text-muted-foreground">
                              {a!.branch.name}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            🦷 {a!.service.name} &nbsp;·&nbsp; 👨‍⚕️ {a!.doctor.user.name}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">
                            {a!.appointmentDate} — {a!.appointmentTime}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  {recordError && <p className="text-sm text-red-500">{recordError}</p>}
                </>
              )}

              {/* Step 2 — payment details */}
              {recordStep === 2 && selectedAppt && (
                <>
                  {/* Appointment summary */}
                  <div className="bg-secondary/40 rounded-xl p-3 text-sm space-y-1">
                    <p><span className="text-muted-foreground">المريض: </span><strong>{selectedAppt.patient.user.name}</strong></p>
                    <p><span className="text-muted-foreground">الخدمة: </span>{selectedAppt.service.name}</p>
                    <p><span className="text-muted-foreground">الموعد: </span><span dir="ltr">{selectedAppt.appointmentDate} — {selectedAppt.appointmentTime}</span></p>
                  </div>

                  {/* Method */}
                  <div>
                    <label className="block text-sm font-medium mb-2">طريقة الدفع</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['CASH', 'CARD', 'BANK_TRANSFER'] as const).map(m => (
                        <button key={m} onClick={() => setPayMethod(m)}
                          className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${payMethod === m ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/40'}`}>
                          {methodLabels[m]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Currency */}
                  <div>
                    <label className="block text-sm font-medium mb-2">العملة</label>
                    <div className="grid grid-cols-4 gap-2">
                      {([
                        { code: 'ILS', label: '₪ شيكل' },
                        { code: 'USD', label: '$ دولار' },
                        { code: 'JOD', label: 'د.أ دينار' },
                        { code: 'EUR', label: '€ يورو' },
                      ] as const).map(c => (
                        <button key={c.code} onClick={() => setPayCurrency(c.code)}
                          className={`py-2 rounded-xl text-xs font-medium border transition-all ${payCurrency === c.code ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/40'}`}>
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Amount */}
                  <div>
                    <label className="block text-sm font-medium mb-1">المبلغ الأصلي</label>
                    <input type="number" value={payAmount} min="0" step="0.5"
                      onChange={e => setPayAmount(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                      dir="ltr" />
                  </div>

                  {/* Discount */}
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">الخصم (اختياري)</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['NONE', 'PERCENTAGE', 'FIXED'] as const).map(dt => (
                        <button key={dt} onClick={() => { setDiscountType(dt); setDiscountValue(''); }}
                          className={`py-2 rounded-xl text-xs font-medium border transition-all ${discountType === dt ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/40'}`}>
                          {dt === 'NONE' ? 'بدون' : dt === 'PERCENTAGE' ? 'نسبة %' : 'مبلغ ثابت'}
                        </button>
                      ))}
                    </div>
                    {discountType !== 'NONE' && (
                      <input type="number" value={discountValue} min="0"
                        placeholder={discountType === 'PERCENTAGE' ? 'مثال: 10 (%)' : 'مثال: 50 (₪)'}
                        onChange={e => setDiscountValue(e.target.value)}
                        className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        dir="ltr" />
                    )}
                  </div>

                  {/* Final amount preview */}
                  {baseAmount > 0 && (
                    <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">المبلغ النهائي</span>
                      <span className="font-bold text-primary text-lg">
                        {finalAmount.toFixed(2)} {payCurrency}
                      </span>
                    </div>
                  )}

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium mb-1">ملاحظات (اختياري)</label>
                    <textarea value={payNotes} onChange={e => setPayNotes(e.target.value)} rows={2}
                      placeholder="أي ملاحظات إضافية..."
                      className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                  </div>

                  {recordError && <p className="text-sm text-red-500">{recordError}</p>}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-border flex-shrink-0">
              {recordStep === 1 ? (
                <button onClick={() => setShowRecord(false)} className="flex-1 py-2.5 text-sm border border-border rounded-xl hover:bg-secondary">إلغاء</button>
              ) : (
                <button onClick={() => { setRecordStep(1); setRecordError(''); }} className="flex-1 py-2.5 text-sm border border-border rounded-xl hover:bg-secondary flex items-center justify-center gap-1">
                  <span>→</span> السابق
                </button>
              )}
              {recordStep === 1 ? (
                <button onClick={() => { setRecordStep(2); setRecordError(''); }} disabled={!selectedAppt}
                  className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-primary/90">
                  التالي
                </button>
              ) : (
                <button onClick={submitRecord} disabled={recording || !payAmount || Number(payAmount) <= 0}
                  className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-primary/90">
                  {recording ? 'جاري...' : `تسجيل ${finalAmount.toFixed(2)} ₪`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
