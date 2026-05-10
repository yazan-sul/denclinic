'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  paidAmount:    number | null;
  paidCurrency:  string | null;
  exchangeRate:  number | null;
  surplus:       number | null;
  method: PaymentMethod;
  status: PaymentStatus;
  transactionId:   string | null;
  transactionTime: string;
  description:     string | null;
  appointmentId:   string | null;
  appointment: {
    id: string;
    appointmentDate: string;
    appointmentTime: string;
    patient: { id: number; user: { name: string; phoneNumber: string; email?: string | null } };
    service: { name: string; basePrice: number };
    doctor:  { user: { name: string } };
    branch:  { name: string };
  } | null;
}

interface PaymentTxn {
  id:          string;
  paidAmount:  number;
  paidCurrency: string;
  exchangeRate: number;
  amountInCost: number;
  method:      PaymentMethod;
  notes:       string | null;
  paidAt:      string;
  payment: {
    id:       string;
    amount:   number;
    currency: string;
    status:   PaymentStatus;
    surplus:  number | null;
    appointment: {
      id:              string;
      appointmentDate: string;
      service:  { name: string };
      patient:  { id: number; user: { name: string; phoneNumber: string } };
      branch:   { name: string } | null;
    } | null;
  };
}

interface CurrencyAmount { currency: string; amount: number; }
interface Stats {
  todayRevenue:   CurrencyAmount[];
  todayCount:     number;
  pendingCount:   number;
  pendingAmount:  CurrencyAmount[];
  refundedAmount: CurrencyAmount[];
  totalRevenue:   CurrencyAmount[];
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

// ─── Patient balance types ────────────────────────────────────────────────────

interface PendingInvoice {
  appointmentId: string;
  serviceName:   string;
  amount:        number;
  originalAmount: number | null;
  currency:      string;
  discountType:  string | null;
  discountValue: number | null;
  description:   string | null;
  paidAmount:    number | null;
  paidCurrency:  string | null;
  exchangeRate:  number | null;
  surplus:       number | null;
  date:          string;
  time:          string;
  branchName:    string;
  paymentId:     string | null;
  paymentStatus: string | null;
  method:        string | null;
}

interface PatientBalance {
  patientId:       number;
  patientName:     string;
  patientPhone:    string;
  patientEmail:    string | null;
  status:          'DEBT' | 'SURPLUS' | 'CLEAR';
  totalDebt:       number;
  totalSurplus:    number;
  pendingInvoices: PendingInvoice[];
}

type MainTab = 'BALANCES' | 'TRANSACTIONS';

// ─── Component ────────────────────────────────────────────────────────────────

export default function StaffPaymentsPanel() {
  const [mainTab,    setMainTab]    = useState<MainTab>('BALANCES');
  const [payments,   setPayments]   = useState<Payment[]>([]);
  const [stats,      setStats]      = useState<Stats | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState<TabId>('ALL');
  const [search,     setSearch]     = useState('');
  const [toast,      setToast]      = useState('');
  const [toastType,  setToastType]  = useState<'success' | 'error'>('success');

  // ── Patient balances ──────────────────────────────────────────────────────────
  const [balances,        setBalances]        = useState<PatientBalance[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balanceSearch,   setBalanceSearch]   = useState('');
  const [balanceStatus,   setBalanceStatus]   = useState<'ALL' | 'DEBT' | 'SURPLUS' | 'CLEAR'>('ALL');
  const [balanceSort,     setBalanceSort]     = useState<'DESC' | 'ASC'>('DESC');
  const [selectedPatient, setSelectedPatient] = useState<PatientBalance | null>(null);
  // Settle modal
  const [settleMethod,    setSettleMethod]    = useState<'CASH' | 'CARD' | 'BANK_TRANSFER'>('CASH');
  const [settleCurrency,  setSettleCurrency]  = useState<'ILS' | 'USD' | 'JOD' | 'EUR'>('ILS');
  const [settleAmount,    setSettleAmount]    = useState('');
  const [settleRate,      setSettleRate]      = useState('1');
  const [settling,        setSettling]        = useState(false);
  const [settleError,     setSettleError]     = useState('');
  const [modalTab,        setModalTab]        = useState<'INVOICES' | 'TRANSACTIONS'>('INVOICES');
  const [expandedInvoice, setExpandedInvoice] = useState<string | null>(null);
  const [patientTxns,     setPatientTxns]     = useState<PaymentTxn[]>([]);
  const [loadingTxns,     setLoadingTxns]     = useState(false);
  const [sendingReport,   setSendingReport]   = useState(false);
  // Payout (clinic → patient)
  const [showPayout,      setShowPayout]      = useState(false);
  const [payoutAmount,    setPayoutAmount]    = useState('');
  const [payoutMethod,    setPayoutMethod]    = useState<'CASH' | 'CARD' | 'BANK_TRANSFER'>('CASH');
  const [payoutCurrency,  setPayoutCurrency]  = useState<'ILS' | 'USD' | 'JOD' | 'EUR'>('ILS');
  const [payoutNotes,     setPayoutNotes]     = useState('');
  const [payingOut,       setPayingOut]       = useState(false);
  const [payoutError,     setPayoutError]     = useState('');

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
  // Cost
  const [costCurrency,     setCostCurrency]     = useState<'ILS' | 'USD' | 'JOD' | 'EUR'>('ILS');
  const [costAmount,       setCostAmount]       = useState('');
  const [discountType,     setDiscountType]     = useState<'NONE' | 'PERCENTAGE' | 'FIXED'>('NONE');
  const [discountValue,    setDiscountValue]    = useState('');
  // Payment
  const [payCurrency,      setPayCurrency]      = useState<'ILS' | 'USD' | 'JOD' | 'EUR'>('ILS');
  const [payAmount,        setPayAmount]        = useState('');
  const [exchangeRate,     setExchangeRate]     = useState('1');
  const [rateSource,       setRateSource]       = useState<'live' | 'cache' | 'fallback' | 'manual'>('fallback');
  // Exchange rates map: 1 ILS = X currency
  const [rates,            setRates]            = useState<Record<string, number>>({ ILS: 1, USD: 0.272, JOD: 0.193, EUR: 0.250 });
  const [payNotes,         setPayNotes]         = useState('');
  const [recordError,      setRecordError]      = useState('');
  const [recording,        setRecording]        = useState(false);
  const [invoiceOnly,      setInvoiceOnly]      = useState(false);   // فاتورة بدون دفع
  const [applySurplus,     setApplySurplus]     = useState(false);   // خصم الفائض
  const [patientSurplus,   setPatientSurplus]   = useState(0);       // رصيد الفائض الموجود

  // ── Date filter ──────────────────────────────────────────────────────────────
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  // ── Generic confirm dialog ────────────────────────────────────────────────────
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; body: string; onConfirm: () => void; danger?: boolean;
  } | null>(null);
  const requestConfirm = (title: string, body: string, fn: () => void, danger = false) =>
    setConfirmDialog({ title, body, onConfirm: fn, danger });

  // ── Mark paid modal ───────────────────────────────────────────────────────────
  const [markTarget,  setMarkTarget]  = useState<Payment | null>(null);
  const [marking,     setMarking]     = useState(false);

  // ── Refund modal ──────────────────────────────────────────────────────────────
  const [refundTarget,  setRefundTarget]  = useState<Payment | null>(null);
  const [refundReason,  setRefundReason]  = useState('');
  const [refunding,     setRefunding]     = useState(false);
  const [refundError,   setRefundError]   = useState('');

  // ── Invoice modal ─────────────────────────────────────────────────────────────
  const [invoiceTarget,  setInvoiceTarget]  = useState<Payment | null>(null);
  const [sendingInvoice, setSendingInvoice] = useState(false);

  const handlePrintInvoice = (p: Payment) => {
    const branch   = p.appointment?.branch.name ?? '';
    const patient  = p.appointment?.patient.user.name ?? '—';
    const doctor   = p.appointment?.doctor.user.name ?? '—';
    const service  = p.appointment?.service.name ?? '—';
    const apptDate = p.appointment?.appointmentDate?.split('T')[0] ?? '';
    const apptTime = p.appointment?.appointmentTime ?? '';
    const dateStr  = new Date(p.transactionTime).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const origAmt  = (p.originalAmount ?? p.amount).toFixed(2);
    const finalAmt = p.amount.toFixed(2);
    const curr     = p.currency;
    const sym      = (c: string) => ({ ILS: '₪', USD: '$', JOD: 'د.أ', EUR: '€' }[c] ?? c);
    const statusColor = p.status === 'COMPLETED' ? '#dcfce7' : p.status === 'REFUNDED' ? '#f3e8ff' : '#fef3c7';
    const statusText  = p.status === 'COMPLETED' ? '#15803d'  : p.status === 'REFUNDED' ? '#7e22ce'  : '#b45309';

    const discountRow = p.discountType && p.discountType !== 'NONE' && (p.discountValue ?? 0) > 0
      ? (() => {
          const disc = p.discountType === 'PERCENTAGE'
            ? ((p.originalAmount ?? p.amount) * (p.discountValue ?? 0) / 100).toFixed(2)
            : (p.discountValue ?? 0).toFixed(2);
          const label = p.discountType === 'PERCENTAGE' ? `خصم ${p.discountValue}%` : 'خصم ثابت';
          return `<tr><td style="color:#16a34a">${label}</td><td style="color:#16a34a;text-align:left">-${disc} ${sym(curr)}</td></tr>`;
        })()
      : '';

    const isDiffCurr = p.paidAmount && p.paidCurrency && p.paidCurrency !== curr;
    const paidRows = isDiffCurr
      ? `<tr style="border-top:1px dashed #e5e7eb">
           <td style="color:#6b7280">المدفوع</td>
           <td style="text-align:left;font-weight:600">${p.paidAmount!.toFixed(2)} ${sym(p.paidCurrency!)}</td>
         </tr>
         <tr>
           <td style="color:#6b7280">سعر الصرف</td>
           <td style="text-align:left">1 ${sym(p.paidCurrency!)} = ${p.exchangeRate?.toFixed(4)} ${sym(curr)}</td>
         </tr>
         <tr>
           <td style="color:#6b7280">المعادل</td>
           <td style="text-align:left">${(p.paidAmount! * (p.exchangeRate ?? 1)).toFixed(2)} ${sym(curr)}</td>
         </tr>`
      : '';

    const surplusRow = p.surplus !== null && p.surplus !== undefined && p.surplus !== 0
      ? p.surplus > 0
        ? `<tr><td style="color:#7c3aed">رصيد في العيادة</td><td style="text-align:left;color:#7c3aed;font-weight:600">+${p.surplus.toFixed(2)} ${sym(curr)}</td></tr>`
        : `<tr><td style="color:#dc2626">عجز</td><td style="text-align:left;color:#dc2626;font-weight:600">${p.surplus.toFixed(2)} ${sym(curr)}</td></tr>`
      : '';

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>فاتورة — ${patient}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 32px; max-width: 560px; margin: auto; }
    .header { background: #2563eb; color: #fff; padding: 20px 24px; border-radius: 8px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .header h1 { font-size: 20px; margin-bottom: 2px; }
    .header p  { font-size: 12px; opacity: .85; }
    .section-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; color: #1e3a5f; border-bottom: 2px solid #2563eb; padding-bottom: 4px; }
    .info-grid { display: grid; grid-template-columns: 110px 1fr; gap: 5px 10px; margin-bottom: 20px; font-size: 13px; }
    .info-grid .lbl { color: #6b7280; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    td { padding: 7px 0; vertical-align: top; }
    td:last-child { text-align: left; font-weight: 500; }
    .total-row td { font-size: 17px; font-weight: 700; padding-top: 10px; border-top: 2px solid #111; }
    .footer { margin-top: 24px; text-align: center; color: #9ca3af; font-size: 11px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    .no-print { margin-bottom: 16px; display: flex; gap: 10px; justify-content: flex-end; }
    @media print {
      .no-print { display: none !important; }
      body { padding: 16px; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()" style="padding:8px 18px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">🖨️ طباعة / حفظ كـ PDF</button>
    <button onclick="window.close()" style="padding:8px 18px;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;font-size:13px">✕ إغلاق</button>
  </div>

  <div class="header">
    <div>
      <p style="font-size:12px;opacity:.75">${dateStr}</p>
      <p style="font-size:13px;opacity:.9">${branch}</p>
    </div>
    <div style="text-align:right">
      <h1>🦷 DenClinic</h1>
      <p>فاتورة</p>
    </div>
  </div>

  <div class="section-title">معلومات المريض</div>
  <div class="info-grid">
    <span class="lbl">الاسم</span>     <span>${patient}</span>
    <span class="lbl">الطبيب</span>    <span>${doctor}</span>
    <span class="lbl">الخدمة</span>    <span>${service}</span>
    <span class="lbl">الموعد</span>    <span dir="ltr">${apptDate} — ${apptTime}</span>
  </div>

  <div class="section-title">تفاصيل الفاتورة</div>
  <table style="margin-bottom:20px">
    <tr><td style="color:#6b7280">المبلغ الأصلي</td><td dir="ltr">${origAmt} ${sym(curr)}</td></tr>
    ${discountRow}
    <tr class="total-row"><td>الإجمالي المستحق</td><td style="color:#2563eb" dir="ltr">${finalAmt} ${sym(curr)}</td></tr>
    ${paidRows}
    ${surplusRow}
    <tr style="border-top:1px solid #e5e7eb"><td style="color:#6b7280;padding-top:10px">طريقة الدفع</td><td style="padding-top:10px">${methodLabels[p.method] ?? p.method}</td></tr>
    <tr><td style="color:#6b7280">الحالة</td><td>
      <span style="display:inline-block;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:600;background:${statusColor};color:${statusText}">
        ${statusConfig[p.status]?.label ?? p.status}
      </span>
    </td></tr>
  </table>

  <div class="footer">شكراً لثقتكم بنا — DenClinic</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    window.open(url, '_blank', 'width=700,height=750');
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

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
      const searchQ = search   ? `&search=${encodeURIComponent(search)}` : '';
      const fromQ   = dateFrom ? `&from=${dateFrom}` : '';
      const toQ     = dateTo   ? `&to=${dateTo}`     : '';
      const clinicQ = `&clinicId=${selectedClinic}`;
      const branchQ = selectedBranch ? `&branchId=${selectedBranch}` : '';
      const res  = await fetch(`/api/staff/payments?pageSize=50${clinicQ}${branchQ}${statusQ}${searchQ}${fromQ}${toQ}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        setPayments(json.data.payments ?? []);
        setStats(json.data.stats ?? null);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, [activeTab, search, dateFrom, dateTo, selectedClinic, selectedBranch]);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);
  useEffect(() => { if (mainTab === 'TRANSACTIONS') fetchPayments(); }, [mainTab]); // eslint-disable-line

  // ── Fetch patient balances ────────────────────────────────────────────────────
  const fetchBalances = useCallback(async () => {
    if (!selectedClinic) return;
    setBalancesLoading(true);
    try {
      const clinicQ  = `clinicId=${selectedClinic}`;
      const branchQ  = selectedBranch ? `&branchId=${selectedBranch}` : '';
      const searchQ  = balanceSearch ? `&search=${encodeURIComponent(balanceSearch)}` : '';
      const res  = await fetch(`/api/staff/patient-balances?${clinicQ}${branchQ}${searchQ}`, { credentials: 'include' });
      const json = await res.json();
      if (json.success) {
        const data: PatientBalance[] = json.data ?? [];
        setBalances(data);
        setSelectedPatient(prev => prev ? (data.find(b => b.patientId === prev.patientId) ?? prev) : null);
      }
    } catch { /* silent */ }
    finally { setBalancesLoading(false); }
  }, [selectedClinic, selectedBranch, balanceSearch]);

  useEffect(() => {
    if (mainTab === 'BALANCES') fetchBalances();
  }, [mainTab, fetchBalances]);

  // ── Filtered + sorted balances (client-side) ──────────────────────────────────
  const filteredBalances = useMemo(() => {
    let list = balances;
    if (balanceStatus !== 'ALL') list = list.filter(b => b.status === balanceStatus);
    return [...list].sort((a, b) =>
      balanceSort === 'DESC'
        ? b.totalDebt - a.totalDebt
        : a.totalDebt - b.totalDebt
    );
  }, [balances, balanceStatus, balanceSort]);

  // ── Fetch patient transactions when modal opens ───────────────────────────────
  useEffect(() => {
    if (!selectedPatient || !selectedClinic) return;
    setLoadingTxns(true);
    setPatientTxns([]);
    fetch(`/api/staff/payments/transactions?clinicId=${selectedClinic}&patientId=${selectedPatient.patientId}&pageSize=200`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success) setPatientTxns(j.data.transactions ?? []); })
      .catch(() => {})
      .finally(() => setLoadingTxns(false));
  }, [selectedPatient, selectedClinic]);

  // ── Edit invoice ─────────────────────────────────────────────────────────────
  const [editingInvoice,   setEditingInvoice]   = useState<PendingInvoice | null>(null);
  const [editAmount,       setEditAmount]       = useState('');
  const [editCurrency,     setEditCurrency]     = useState<'ILS' | 'USD' | 'JOD' | 'EUR'>('ILS');
  const [editDiscountType, setEditDiscountType] = useState<'NONE' | 'PERCENTAGE' | 'FIXED'>('NONE');
  const [editDiscountVal,  setEditDiscountVal]  = useState('');
  const [editNotes,        setEditNotes]        = useState('');
  const [editError,        setEditError]        = useState('');
  const [saving,           setSaving]           = useState(false);
  const [creatingInvoice,   setCreatingInvoice]   = useState<string | null>(null);
  // ── Confirm payment modal ─────────────────────────────────────────────────────
  const [confirmingPayment, setConfirmingPayment] = useState<PendingInvoice | null>(null);
  const [confirmMethod,     setConfirmMethod]     = useState<'CASH' | 'CARD' | 'BANK_TRANSFER'>('CASH');
  const [confirmPayCurr,    setConfirmPayCurr]    = useState<'ILS' | 'USD' | 'JOD' | 'EUR'>('ILS');
  const [confirmPayAmt,     setConfirmPayAmt]     = useState('');
  const [confirmDiscType,   setConfirmDiscType]   = useState<'NONE' | 'PERCENTAGE' | 'FIXED'>('NONE');
  const [confirmDiscVal,    setConfirmDiscVal]    = useState('');
  const [confirmRate,       setConfirmRate]       = useState('1');
  const [confirmNotes,         setConfirmNotes]         = useState('');
  const [confirmSurplusAction, setConfirmSurplusAction] = useState<'KEEP' | 'REFUND'>('KEEP');
  const [confirmRefundMethod,  setConfirmRefundMethod]  = useState<'CASH' | 'CARD' | 'BANK_TRANSFER'>('CASH');
  const [confirmError,         setConfirmError]         = useState('');
  const [confirming,           setConfirming]           = useState(false);

  const editFinal = (() => {
    const base = Number(editAmount) || 0;
    const disc = Number(editDiscountVal) || 0;
    if (editDiscountType === 'PERCENTAGE') return base * (1 - disc / 100);
    if (editDiscountType === 'FIXED')      return Math.max(0, base - disc);
    return base;
  })();

  const openEditInvoice = (inv: PendingInvoice) => {
    setEditingInvoice(inv);
    setEditAmount((inv.originalAmount ?? inv.amount).toFixed(2));
    setEditCurrency((inv.currency as 'ILS' | 'USD' | 'JOD' | 'EUR') || 'ILS');
    setEditDiscountType((inv.discountType as 'NONE' | 'PERCENTAGE' | 'FIXED') || 'NONE');
    setEditDiscountVal(inv.discountValue ? String(inv.discountValue) : '');
    const parts = (inv.description ?? '').split(' — ');
    setEditNotes(parts.length > 1 ? parts[parts.length - 1].trim() : '');
    setEditError('');
  };

  const handleSaveInvoice = async () => {
    if (!editingInvoice?.paymentId) return;
    setSaving(true); setEditError('');
    try {
      const res  = await fetch(`/api/staff/payments/${editingInvoice.paymentId}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          originalAmount: Number(editAmount),
          currency:       editCurrency,
          discountType:   editDiscountType,
          discountValue:  Number(editDiscountVal) || 0,
          notes:          editNotes || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setEditingInvoice(null);
        showToast('تم تعديل الفاتورة');
        fetchBalances();
      } else {
        setEditError(json.error?.message ?? json.message ?? 'تعذر الحفظ');
      }
    } catch { setEditError('تعذر الاتصال'); }
    finally { setSaving(false); }
  };

  const handleCreateInvoice = async (inv: PendingInvoice) => {
    setCreatingInvoice(inv.appointmentId);
    try {
      const res  = await fetch('/api/staff/payments/record', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: inv.appointmentId,
          method:        'CASH',
          currency:      inv.currency || 'ILS',
          amount:        inv.amount,
          discountType:  'NONE',
          discountValue: 0,
          paidCurrency:  inv.currency || 'ILS',
          paidAmount:    0,
          exchangeRate:  1,
          invoiceOnly:   true,
          surplusApplied: 0,
        }),
      });
      const json = await res.json();
      if (json.success) { showToast('تم إنشاء الفاتورة'); fetchBalances(); fetchPayments(); }
      else showToast(json.error?.message ?? json.message ?? 'تعذر الإنشاء', 'error');
    } catch { showToast('تعذر الاتصال', 'error'); }
    finally { setCreatingInvoice(null); }
  };

  const openConfirmFromPayment = (p: Payment) => {
    if (p.status !== 'PENDING') { showToast('هذه الفاتورة تمت معالجتها مسبقاً', 'error'); fetchPayments(); return; }
    openConfirmPayment({
      appointmentId: p.appointment?.id ?? p.appointmentId ?? '',
      serviceName:   p.appointment?.service.name ?? p.description ?? '—',
      amount:        p.amount,
      originalAmount: p.originalAmount,
      currency:      p.currency,
      discountType:  p.discountType,
      discountValue: p.discountValue,
      description:   p.description,
      paidAmount:    p.paidAmount,
      paidCurrency:  p.paidCurrency,
      exchangeRate:  p.exchangeRate,
      surplus:       p.surplus,
      date:          p.appointment?.appointmentDate?.split('T')[0] ?? '',
      time:          p.appointment?.appointmentTime ?? '',
      branchName:    p.appointment?.branch.name ?? '',
      paymentId:     p.id,
      paymentStatus: p.status,
      method:        p.method,
    });
  };

  const openConfirmPayment = (inv: PendingInvoice) => {
    setConfirmingPayment(inv);
    setConfirmMethod('CASH');
    setConfirmPayCurr((inv.currency as 'ILS' | 'USD' | 'JOD' | 'EUR') || 'ILS');
    const remaining = (inv.surplus !== null && (inv.surplus ?? 0) < -0.005)
      ? Math.max(0, -(inv.surplus ?? 0))
      : inv.amount;
    setConfirmPayAmt(remaining.toFixed(2));
    setConfirmDiscType((inv.discountType as 'NONE' | 'PERCENTAGE' | 'FIXED') || 'NONE');
    setConfirmDiscVal(inv.discountValue ? String(inv.discountValue) : '');
    setConfirmRate('1');
    setConfirmNotes('');
    setConfirmSurplusAction('KEEP');
    setConfirmRefundMethod('CASH');
    setConfirmError('');
  };

  // Auto-fill exchange rate when confirm currencies change
  useEffect(() => {
    if (!confirmingPayment) return;
    const costCurr = confirmingPayment.currency;
    if (confirmPayCurr === costCurr) { setConfirmRate('1'); return; }
    const rate = (rates[costCurr] ?? 1) / (rates[confirmPayCurr] ?? 1);
    setConfirmRate(rate.toFixed(4));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmPayCurr, confirmingPayment?.currency, rates]);

  // Auto-fill exchange rate for settle (debt in ILS, paid in settleCurrency)
  useEffect(() => {
    if (settleCurrency === 'ILS') { setSettleRate('1'); return; }
    const rate = 1 / (rates[settleCurrency] ?? 1);
    setSettleRate(rate.toFixed(4));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settleCurrency, rates]);

  const confirmDiscValNum  = Number(confirmDiscVal) || 0;
  const confirmBaseAmount  = confirmingPayment ? (confirmingPayment.originalAmount ?? confirmingPayment.amount) : 0;
  const confirmFinalAmount = confirmDiscType === 'PERCENTAGE'
    ? confirmBaseAmount * (1 - confirmDiscValNum / 100)
    : confirmDiscType === 'FIXED'
      ? Math.max(0, confirmBaseAmount - confirmDiscValNum)
      : confirmBaseAmount;
  const confirmRateNum      = Number(confirmRate) || 1;
  const confirmPaidInCost   = Math.round((Number(confirmPayAmt) || 0) * confirmRateNum * 100) / 100;
  const confirmPreviousPaid = confirmingPayment && (confirmingPayment.surplus ?? 0) < -0.005
    ? Math.max(0, Math.round((confirmingPayment.amount + (confirmingPayment.surplus ?? 0)) * 100) / 100)
    : 0;
  const confirmTotalPaid    = Math.round((confirmPaidInCost + confirmPreviousPaid) * 100) / 100;
  const confirmSurplus      = Math.round((confirmTotalPaid - confirmFinalAmount) * 100) / 100;

  const handleConfirmSubmit = async () => {
    if (!confirmingPayment?.paymentId) return;
    if (!confirmPayAmt || Number(confirmPayAmt) <= 0) { setConfirmError('أدخل المبلغ المدفوع'); return; }
    setConfirming(true); setConfirmError('');
    try {
      const res  = await fetch('/api/staff/payments/confirm', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId:     confirmingPayment.paymentId,
          method:        confirmMethod,
          discountType:  confirmDiscType,
          discountValue: confirmDiscValNum,
          paidAmount:    Number(confirmPayAmt),
          paidCurrency:  confirmPayCurr,
          exchangeRate:  confirmRateNum,
          refundSurplus: confirmSurplusAction === 'REFUND' && confirmSurplus > 0,
          refundMethod:  confirmSurplusAction === 'REFUND' ? confirmRefundMethod : undefined,
          notes:         confirmNotes || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setConfirmingPayment(null);
        showToast('تم تأكيد استلام الدفعة');
        fetchBalances();
        fetchPayments();
      } else {
        const msg = json.error?.message ?? json.message ?? 'تعذر التأكيد';
        setConfirmError(msg);
        if (res.status === 409) {
          setTimeout(() => {
            setConfirmingPayment(null);
            fetchBalances();
            fetchPayments();
          }, 1500);
        }
      }
    } catch { setConfirmError('تعذر الاتصال'); }
    finally { setConfirming(false); }
  };

  // ── Dirty-check close helpers ─────────────────────────────────────────────────
  const closeEditInvoice = () => {
    const origAmt = (editingInvoice?.originalAmount ?? editingInvoice?.amount ?? 0).toFixed(2);
    const origDisc = (editingInvoice?.discountType as string) || 'NONE';
    const origNotes = (() => { const p = (editingInvoice?.description ?? '').split(' — '); return p.length > 1 ? p[p.length - 1].trim() : ''; })();
    const dirty = editAmount !== origAmt || editDiscountType !== origDisc ||
      editDiscountVal !== (editingInvoice?.discountValue ? String(editingInvoice.discountValue) : '') ||
      editNotes !== origNotes;
    if (dirty) requestConfirm('إغلاق التعديل', 'لديك تغييرات غير محفوظة، هل تريد الخروج؟', () => setEditingInvoice(null));
    else setEditingInvoice(null);
  };

  const closeConfirmPayment = () => {
    const initialAmt = confirmingPayment
      ? ((confirmingPayment.surplus ?? 0) < -0.005
          ? Math.max(0, -(confirmingPayment.surplus ?? 0))
          : confirmingPayment.amount
        ).toFixed(2)
      : '';
    const dirty = confirmNotes.trim() !== '' ||
      confirmDiscType !== ((confirmingPayment?.discountType as string) || 'NONE') ||
      confirmPayAmt !== initialAmt;
    if (dirty) requestConfirm('إغلاق التأكيد', 'لديك بيانات غير مؤكدة، هل تريد الخروج؟', () => setConfirmingPayment(null));
    else setConfirmingPayment(null);
  };

  // ── Patient report PDF ───────────────────────────────────────────────────────
  const [exportingReport, setExportingReport] = useState(false);

  const handleExportReport = async (patient: PatientBalance) => {
    if (!selectedClinic) return;
    setExportingReport(true);
    try {
      const res = await fetch(
        `/api/staff/patient-report?patientId=${patient.patientId}&clinicId=${selectedClinic}`,
        { credentials: 'include' }
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        showToast(json.message ?? 'تعذر توليد التقرير', 'error');
        return;
      }
      const html = await res.text();
      const blob = new Blob([html], { type: 'text/html; charset=utf-8' });
      const url  = URL.createObjectURL(blob);
      window.open(url, '_blank', 'width=900,height=700');
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch { showToast('تعذر الاتصال', 'error'); }
    finally { setExportingReport(false); }
  };

  // ── Payout (clinic → patient) ─────────────────────────────────────────────────
  const handlePayout = async () => {
    if (!selectedPatient || !payoutAmount || Number(payoutAmount) <= 0) return;
    setPayingOut(true); setPayoutError('');
    try {
      const res  = await fetch('/api/staff/payments/payout', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: selectedPatient.patientId,
          clinicId:  Number(selectedClinic),
          amount:    Number(payoutAmount),
          currency:  payoutCurrency,
          method:    payoutMethod,
          notes:     payoutNotes || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowPayout(false);
        setPayoutAmount(''); setPayoutNotes('');
        showToast(json.message ?? 'تم الصرف للمريض');
        fetchBalances();
        setSelectedPatient(null);
      } else {
        setPayoutError(json.error?.message ?? json.message ?? 'تعذر الصرف');
      }
    } catch { setPayoutError('تعذر الاتصال'); }
    finally { setPayingOut(false); }
  };

  // ── Settle patient debt ───────────────────────────────────────────────────────
  const handleSettle = async () => {
    if (!selectedPatient || !settleAmount) return;
    setSettling(true); setSettleError('');
    try {
      const res  = await fetch('/api/staff/payments/settle', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId:    selectedPatient.patientId,
          clinicId:     Number(selectedClinic),
          branchId:     selectedBranch ? Number(selectedBranch) : undefined,
          method:       settleMethod,
          currency:     settleCurrency,
          paidAmount:   Number(settleAmount),
          exchangeRate: Number(settleRate),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSelectedPatient(null);
        setSettleAmount('');
        showToast(json.message ?? 'تمت التسوية');
        fetchBalances();
      } else {
        setSettleError(json.error?.message ?? json.message ?? 'تعذرت التسوية');
      }
    } catch { setSettleError('تعذر الاتصال'); }
    finally { setSettling(false); }
  };

  // ── Toast ─────────────────────────────────────────────────────────────────────
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(''), 3500);
  };

  // ── Fetch exchange rates ──────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/exchange-rates', { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          setRates(j.data.rates);
          setRateSource(j.data.source);
        }
      }).catch(() => {});
  }, []);

  // ── Auto-calculate exchange rate when currencies change ───────────────────────
  useEffect(() => {
    if (rateSource === 'manual') return;
    if (costCurrency === payCurrency) { setExchangeRate('1'); return; }
    // rate: how many units of costCurrency per 1 unit of payCurrency
    // 1 payCurrency → ILS → costCurrency
    const ilsPerPaid = 1 / (rates[payCurrency] ?? 1);   // paid→ILS
    const costPerIls = rates[costCurrency] ?? 1;          // ILS→cost is wrong direction
    // rates[X] = how many X per 1 ILS
    // paidCurrency per ILS = rates[payCurrency]
    // costCurrency per ILS = rates[costCurrency]
    // 1 paidCurrency = (1/rates[payCurrency]) ILS = (rates[costCurrency]/rates[payCurrency]) costCurrency
    const rate = (rates[costCurrency] ?? 1) / (rates[payCurrency] ?? 1);
    setExchangeRate(rate.toFixed(4));
    void ilsPerPaid; void costPerIls;
  }, [costCurrency, payCurrency, rates, rateSource]);

  // ── Final cost amount preview (after discount) ────────────────────────────────
  const baseCostAmount = Number(costAmount) || 0;
  const discVal        = Number(discountValue) || 0;
  const finalCostAmount = discountType === 'PERCENTAGE'
    ? baseCostAmount * (1 - discVal / 100)
    : discountType === 'FIXED'
      ? Math.max(0, baseCostAmount - discVal)
      : baseCostAmount;

  // ── Conversion calculation ────────────────────────────────────────────────────
  const paidAmt        = Number(payAmount) || 0;
  const rate           = Number(exchangeRate) || 1;
  const paidInCostCurr = Math.round(paidAmt * rate * 100) / 100;
  const surplus        = Math.round((paidInCostCurr - finalCostAmount) * 100) / 100;

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
    setSelectedAppt(null); setPayMethod('CASH');
    setCostCurrency('ILS'); setCostAmount('');
    setPayCurrency('ILS'); setPayAmount('');
    setExchangeRate('1'); setRateSource('fallback');
    setDiscountType('NONE'); setDiscountValue(''); setPayNotes('');
    setInvoiceOnly(false); setApplySurplus(false); setPatientSurplus(0);
    setRecordError(''); setShowRecord(true);
  };

  // ── Submit record payment ─────────────────────────────────────────────────────
  const submitRecord = async () => {
    if (!selectedAppt || !costAmount) return;
    if (!invoiceOnly && !payAmount) return;
    if (discountType === 'PERCENTAGE' && (discVal < 0 || discVal > 100)) {
      setRecordError('نسبة الخصم يجب أن تكون بين 0 و 100'); return;
    }
    if (discountType === 'FIXED' && discVal > baseCostAmount) {
      setRecordError('قيمة الخصم أكبر من المبلغ'); return;
    }

    // Apply surplus deduction to cost
    const surplusDeduction = applySurplus ? Math.min(patientSurplus, finalCostAmount) : 0;
    const netCostAmount    = Math.max(0, finalCostAmount - surplusDeduction);

    setRecording(true); setRecordError('');
    try {
      const res  = await fetch('/api/staff/payments/record', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: selectedAppt.id,
          method:        invoiceOnly ? 'CASH' : payMethod,
          currency:      costCurrency,
          amount:        netCostAmount,
          discountType,
          discountValue: discVal,
          paidCurrency:  invoiceOnly ? costCurrency : payCurrency,
          paidAmount:    invoiceOnly ? 0 : paidAmt,
          exchangeRate:  invoiceOnly ? 1 : rate,
          invoiceOnly,
          surplusApplied: surplusDeduction,
          notes: [
            payNotes,
            surplusDeduction > 0 ? `خُصم رصيد ${surplusDeduction.toFixed(2)} ${costCurrency}` : '',
          ].filter(Boolean).join(' — ') || undefined,
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

  // ── Send transactions report by email ────────────────────────────────────────
  const handleSendReport = async () => {
    if (!selectedPatient || !selectedClinic) return;
    if (!selectedPatient.patientEmail) { showToast('المريض ليس لديه بريد إلكتروني مسجّل', 'error'); return; }
    setSendingReport(true);
    try {
      const res  = await fetch('/api/staff/payments/send-report', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientId: selectedPatient.patientId, clinicId: Number(selectedClinic) }),
      });
      const json = await res.json();
      showToast(json.message ?? (res.ok ? 'تم الإرسال' : 'فشل الإرسال'), res.ok ? 'success' : 'error');
    } catch {
      showToast('خطأ في الإرسال', 'error');
    } finally {
      setSendingReport(false);
    }
  };

  // ── Send invoice by email ─────────────────────────────────────────────────────
  const handleSendInvoice = async (p: Payment) => {
    setSendingInvoice(true);
    try {
      const res  = await fetch(`/api/staff/payments/${p.id}/send-invoice`, {
        method: 'POST', credentials: 'include',
      });
      const json = await res.json();
      if (json.success) showToast(json.message ?? 'تم الإرسال');
      else showToast(json.error?.message ?? json.message ?? 'تعذر الإرسال', 'error');
    } catch { showToast('تعذر الاتصال', 'error'); }
    finally { setSendingInvoice(false); }
  };

  // ── Refund payment ───────────────────────────────────────────────────────────
  const handleRefund = async () => {
    if (!refundTarget || !refundReason.trim()) return;
    setRefunding(true); setRefundError('');
    try {
      const res  = await fetch(`/api/staff/payments/${refundTarget.id}/refund`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: refundReason.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setRefundTarget(null);
        setRefundReason('');
        showToast('تم الاسترداد بنجاح');
        fetchPayments();
      } else {
        setRefundError(json.error?.message ?? json.message ?? 'تعذر الاسترداد');
      }
    } catch { setRefundError('تعذر الاتصال'); }
    finally { setRefunding(false); }
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

      {/* Clinic / Branch + Main tabs */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
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
        <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl">
          <button onClick={() => setMainTab('BALANCES')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${mainTab === 'BALANCES' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            أرصدة المرضى
          </button>
          <button onClick={() => setMainTab('TRANSACTIONS')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${mainTab === 'TRANSACTIONS' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
            المعاملات
          </button>
        </div>
      </div>

      {/* ══ BALANCES TAB ══ */}
      {mainTab === 'BALANCES' && (
        <div className="space-y-3">

          {/* Search + sort */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input type="text" placeholder="ابحث باسم المريض أو هاتفه..." value={balanceSearch}
                onChange={e => setBalanceSearch(e.target.value)}
                className="w-full pr-9 pl-4 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <button onClick={() => setBalanceSort(s => s === 'DESC' ? 'ASC' : 'DESC')}
              title={balanceSort === 'DESC' ? 'ترتيب تصاعدي' : 'ترتيب تنازلي'}
              className="px-3 py-2.5 border border-border rounded-xl hover:bg-secondary text-sm font-medium text-muted-foreground">
              {balanceSort === 'DESC' ? '↓ تنازلي' : '↑ تصاعدي'}
            </button>
          </div>

          {/* Status filter */}
          <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl w-full">
            {([
              { id: 'ALL',     label: 'الكل' },
              { id: 'DEBT',    label: '🔴 مديون' },
              { id: 'SURPLUS', label: '🟢 فائض' },
              { id: 'CLEAR',   label: '✅ مسوّى' },
            ] as const).map(f => (
              <button key={f.id} onClick={() => setBalanceStatus(f.id)}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${balanceStatus === f.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {f.label}
              </button>
            ))}
          </div>

          {balancesLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredBalances.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground text-sm">
              لا يوجد مرضى في هذه الفئة
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBalances.map(b => (
                <button key={b.patientId}
                  onClick={() => {
                    setSelectedPatient(b);
                    setSettleAmount(''); setSettleError('');
                    setShowPayout(false); setModalTab('INVOICES');
                    setPatientSurplus(b.totalSurplus); setApplySurplus(false);
                  }}
                  className="w-full text-right bg-card border border-border rounded-xl p-4 hover:border-primary/40 transition-all">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{b.patientName}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">{formatPhone(b.patientPhone)}</p>
                    </div>
                    <div className="text-right space-y-1">
                      {b.status === 'DEBT' && (
                        <>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                            🔴 {b.totalDebt.toFixed(2)} ₪
                          </span>
                          <p className="text-xs text-muted-foreground">{b.pendingInvoices.length} فاتورة</p>
                        </>
                      )}
                      {b.status === 'SURPLUS' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                          🟢 {b.totalSurplus.toFixed(2)} ₪
                        </span>
                      )}
                      {b.status === 'CLEAR' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary text-muted-foreground">
                          ✅ مسوّى
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Patient Modal ── */}
      {selectedPatient && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
          <div className="bg-card rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md border border-border max-h-[90vh] flex flex-col" dir="rtl">

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
              <div>
                <h2 className="font-bold">{selectedPatient.patientName}</h2>
                <p className="text-xs mt-0.5">
                  {selectedPatient.status === 'DEBT' && (
                    <span className="text-red-500 font-medium">دين: {selectedPatient.totalDebt.toFixed(2)} ₪</span>
                  )}
                  {selectedPatient.status === 'SURPLUS' && (
                    <span className="text-green-600 font-medium">فائض: {selectedPatient.totalSurplus.toFixed(2)} ₪</span>
                  )}
                  {selectedPatient.status === 'CLEAR' && (
                    <span className="text-muted-foreground">مسوّى</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportReport(selectedPatient)}
                  disabled={exportingReport}
                  className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 whitespace-nowrap"
                >
                  {exportingReport ? '...' : '📄 تصدير PDF'}
                </button>
                <button onClick={() => setSelectedPatient(null)}><XIcon className="w-5 h-5" /></button>
              </div>
            </div>

            {/* Modal tabs */}
            <div className="flex gap-1 px-4 pt-3 pb-0 flex-shrink-0">
              {(['INVOICES','TRANSACTIONS'] as const).map(t => (
                <button key={t} onClick={() => setModalTab(t)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${modalTab === t ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
                  {t === 'INVOICES' ? 'الفواتير' : 'الحركات المالية'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">

              {/* ── INVOICES tab ── */}
              {modalTab === 'INVOICES' && (
                <>
                  {/* Surplus notice + payout button */}
                  {selectedPatient.status === 'SURPLUS' && (
                    <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl p-4 text-sm space-y-3">
                      <div>
                        <p className="font-semibold text-green-700 dark:text-green-400 mb-0.5">🟢 هذا المريض عنده فائض</p>
                        <p className="text-muted-foreground">المبلغ: <strong className="text-green-700 dark:text-green-400">{selectedPatient.totalSurplus.toFixed(2)} ₪</strong></p>
                      </div>
                      {!showPayout ? (
                        <button
                          onClick={() => { setShowPayout(true); setPayoutAmount(selectedPatient.totalSurplus.toFixed(2)); setPayoutError(''); }}
                          className="w-full py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 transition-colors">
                          صرف المبلغ للمريض
                        </button>
                      ) : (
                        <div className="space-y-3 border-t border-green-200 dark:border-green-800 pt-3">
                          <p className="text-xs font-semibold text-muted-foreground">تفاصيل الصرف</p>

                          {/* Payout method */}
                          <div className="grid grid-cols-3 gap-1.5">
                            {(['CASH','CARD','BANK_TRANSFER'] as const).map(m => (
                              <button key={m} onClick={() => setPayoutMethod(m)}
                                className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${payoutMethod === m ? 'bg-green-600 text-white border-green-600' : 'border-border hover:border-green-400'}`}>
                                {methodLabels[m]}
                              </button>
                            ))}
                          </div>

                          {/* Amount + currency */}
                          <div className="flex gap-2">
                            <input type="number" value={payoutAmount} min="0" step="0.5"
                              onChange={e => setPayoutAmount(e.target.value)}
                              className="flex-1 px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-green-500"
                              dir="ltr" />
                            <div className="flex gap-1">
                              {(['ILS','USD','JOD','EUR'] as const).map(c => (
                                <button key={c} onClick={() => setPayoutCurrency(c)}
                                  className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all ${payoutCurrency === c ? 'bg-green-600 text-white border-green-600' : 'border-border hover:border-green-400'}`}>
                                  {c}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Notes */}
                          <input type="text" value={payoutNotes}
                            onChange={e => setPayoutNotes(e.target.value)}
                            placeholder="ملاحظات (اختياري)"
                            className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-green-500" />

                          {payoutError && <p className="text-xs text-red-500">{payoutError}</p>}

                          <div className="flex gap-2">
                            <button onClick={() => setShowPayout(false)}
                              className="flex-1 py-2 text-xs border border-border rounded-xl hover:bg-secondary">
                              تراجع
                            </button>
                            <button onClick={handlePayout} disabled={payingOut || !payoutAmount || Number(payoutAmount) <= 0}
                              className="flex-1 py-2 bg-green-600 text-white text-xs font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50">
                              {payingOut ? 'جاري...' : `تأكيد صرف ${Number(payoutAmount).toFixed(2)} ${payoutCurrency}`}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pending invoices */}
                  {selectedPatient.pendingInvoices.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground">الفواتير المعلقة ({selectedPatient.pendingInvoices.length})</p>
                      {selectedPatient.pendingInvoices.map((inv, i) => (
                        <div key={i} className="bg-secondary/40 rounded-xl overflow-hidden">
                          <div
                            onClick={() => setExpandedInvoice(expandedInvoice === inv.appointmentId ? null : inv.appointmentId)}
                            className="w-full flex items-center justify-between px-4 py-3 text-sm text-right cursor-pointer select-none">
                            <div>
                              <p className="font-medium">{inv.serviceName}</p>
                              <p className="text-xs text-muted-foreground" dir="ltr">{inv.date} — {inv.time}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{inv.amount.toFixed(2)} {inv.currency}</span>
                              {!inv.paymentId && (
                                <button
                                  onClick={e => { e.stopPropagation(); requestConfirm('إنشاء فاتورة', `إنشاء فاتورة بمبلغ ${inv.amount.toFixed(2)} ${inv.currency} لخدمة "${inv.serviceName}"؟`, () => handleCreateInvoice(inv)); }}
                                  disabled={creatingInvoice === inv.appointmentId}
                                  className="text-xs text-blue-600 border border-blue-300 rounded-lg px-2 py-0.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50"
                                >
                                  {creatingInvoice === inv.appointmentId ? '...' : '+ فاتورة'}
                                </button>
                              )}
                              {inv.paymentId && (
                                <button
                                  onClick={e => { e.stopPropagation(); openEditInvoice(inv); }}
                                  className="text-xs text-primary border border-primary/30 rounded-lg px-2 py-0.5 hover:bg-primary/10 transition-colors"
                                >
                                  تعديل
                                </button>
                              )}
                              <span className="text-xs text-primary">{expandedInvoice === inv.appointmentId ? '▲' : '▼'}</span>
                            </div>
                          </div>
                          {expandedInvoice === inv.appointmentId && (
                            <div className="border-t border-border/50 px-4 py-3 text-xs space-y-1.5 text-muted-foreground">
                              <div className="flex justify-between"><span>الفرع</span><span>{inv.branchName}</span></div>
                              <div className="flex justify-between"><span>الوقت</span><span dir="ltr">{inv.time}</span></div>
                              {inv.method && (
                                <div className="flex justify-between"><span>طريقة الدفع</span><span>{methodLabels[inv.method as PaymentMethod] ?? inv.method}</span></div>
                              )}
                              <div className="flex justify-between"><span>حالة الدفع</span>
                                <span className={inv.paymentStatus === 'PENDING' ? 'text-amber-600' : 'text-muted-foreground'}>
                                  {inv.paymentStatus === 'PENDING'
                                    ? (inv.paidAmount && inv.paidAmount > 0 ? 'مدفوع جزئياً' : 'في الانتظار')
                                    : 'لم يُسجَّل بعد'}
                                </span>
                              </div>
                              <div className="flex justify-between font-semibold text-foreground text-sm pt-1">
                                <span>المبلغ الكلي</span><span dir="ltr">{inv.amount.toFixed(2)} {inv.currency}</span>
                              </div>
                              {inv.paymentId && inv.paymentStatus === 'PENDING' && inv.paidAmount && inv.paidAmount > 0 && (() => {
                                const remaining = (inv.surplus !== null && (inv.surplus ?? 0) < -0.005)
                                  ? Math.max(0, -(inv.surplus ?? 0))
                                  : Math.max(0, inv.amount - (inv.paidAmount * (inv.exchangeRate ?? 1)));
                                return (
                                  <>
                                    <div className="flex justify-between text-green-600 dark:text-green-400 text-xs">
                                      <span>مدفوع جزئياً</span>
                                      <span dir="ltr">{inv.paidAmount.toFixed(2)} {inv.paidCurrency ?? inv.currency}</span>
                                    </div>
                                    <div className="flex justify-between text-red-500 text-xs font-semibold">
                                      <span>المتبقي</span>
                                      <span dir="ltr">{remaining.toFixed(2)} {inv.currency}</span>
                                    </div>
                                  </>
                                );
                              })()}
                              {inv.paymentId && inv.paymentStatus === 'PENDING' && (
                                <button
                                  onClick={() => openConfirmPayment(inv)}
                                  className="w-full mt-1 py-1.5 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                                >
                                  ✓ تأكيد استلام المبلغ
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">لا توجد فواتير معلقة</p>
                  )}

                  {/* Payment form — only for DEBT patients */}
                  {selectedPatient.status === 'DEBT' && (
                    <div className="border-t border-border pt-4 space-y-3">
                      <p className="text-sm font-semibold">تسجيل الدفعة</p>

                      {/* Method */}
                      <div className="grid grid-cols-3 gap-2">
                        {(['CASH','CARD','BANK_TRANSFER'] as const).map(m => (
                          <button key={m} onClick={() => setSettleMethod(m)}
                            className={`py-2 rounded-xl text-xs font-medium border transition-all ${settleMethod === m ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/40'}`}>
                            {methodLabels[m]}
                          </button>
                        ))}
                      </div>

                      {/* Amount + currency */}
                      <div className="flex gap-2">
                        <input type="number" value={settleAmount} min="0" step="0.5" placeholder="0.00"
                          onChange={e => setSettleAmount(e.target.value)}
                          className="flex-1 px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                          dir="ltr" />
                        <div className="flex gap-1">
                          {(['ILS','USD','JOD','EUR'] as const).map(c => (
                            <button key={c} onClick={() => setSettleCurrency(c)}
                              className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all ${settleCurrency === c ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/40'}`}>
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Exchange rate */}
                      {settleCurrency !== 'ILS' && (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs text-muted-foreground">سعر الصرف (1 {settleCurrency} = ? ₪)</label>
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                              rateSource === 'live'  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                              rateSource === 'cache' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                              'bg-secondary text-muted-foreground'}`}>
                              {rateSource === 'live' ? 'مباشر' : rateSource === 'cache' ? 'محفوظ' : 'افتراضي'}
                            </span>
                          </div>
                          <input type="number" value={settleRate} min="0.0001" step="0.0001"
                            onChange={e => setSettleRate(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                            dir="ltr" />
                        </div>
                      )}

                      {/* Preview */}
                      {Number(settleAmount) > 0 && (
                        <div className={`rounded-xl p-3 text-sm border ${Number(settleAmount) * Number(settleRate) >= selectedPatient.totalDebt
                          ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                          : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800'}`}>
                          <div className="flex justify-between"><span className="text-muted-foreground">يغطي</span><span className="font-medium">{(Number(settleAmount) * Number(settleRate)).toFixed(2)} ₪</span></div>
                          <div className="flex justify-between mt-1"><span className="text-muted-foreground">الدين الكلي</span><span>{selectedPatient.totalDebt.toFixed(2)} ₪</span></div>
                          <div className={`flex justify-between mt-1 font-bold pt-1 border-t border-dashed ${Number(settleAmount) * Number(settleRate) >= selectedPatient.totalDebt ? 'border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' : 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'}`}>
                            <span>{Number(settleAmount) * Number(settleRate) >= selectedPatient.totalDebt ? 'فائض' : 'متبقي'}</span>
                            <span>{Math.abs(selectedPatient.totalDebt - Number(settleAmount) * Number(settleRate)).toFixed(2)} ₪</span>
                          </div>
                        </div>
                      )}

                      {settleError && <p className="text-sm text-red-500">{settleError}</p>}
                    </div>
                  )}
                </>
              )}

              {/* ── TRANSACTIONS tab ── */}
              {modalTab === 'TRANSACTIONS' && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground">
                    سجل الحركات المالية
                    {patientTxns.length > 0 && <span className="mr-2 text-primary">({patientTxns.length})</span>}
                  </p>
                  {loadingTxns ? (
                    <div className="flex justify-center py-6">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : patientTxns.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">لا توجد حركات مالية مسجلة</p>
                  ) : (
                    patientTxns.map((t, idx) => {
                      const sym = (c: string) => ({ ILS: '₪', USD: '$', JOD: 'د.أ', EUR: '€' }[c] ?? c);
                      const hasDiffCurr = t.paidCurrency !== t.payment.currency;
                      const txDate = new Date(t.paidAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
                      const txTime = new Date(t.paidAt).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
                      const remaining = (t.payment.surplus ?? 0) < -0.005
                        ? Math.max(0, -(t.payment.surplus ?? 0))
                        : null;
                      return (
                        <div key={t.id} className="rounded-xl text-sm border bg-secondary/40 border-border/50">
                          <div className="flex items-center justify-between px-4 pt-3 pb-1">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-mono bg-secondary px-1.5 py-0.5 rounded text-muted-foreground">#{patientTxns.length - idx}</span>
                              <span dir="ltr">{txDate}</span>
                              <span className="opacity-60">{txTime}</span>
                            </div>
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium">
                              {methodLabels[t.method] ?? t.method}
                            </span>
                          </div>
                          <div className="px-4 pb-3 space-y-1.5">
                            <div className="flex items-start justify-between">
                              <span className="font-medium text-muted-foreground">
                                {t.payment.appointment?.service.name ?? '—'}
                              </span>
                              <div className="text-right">
                                <div className="font-bold" dir="ltr">
                                  {t.paidAmount.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">{sym(t.paidCurrency)}</span>
                                </div>
                                {hasDiffCurr && (
                                  <div className="text-xs text-muted-foreground" dir="ltr">
                                    = {t.amountInCost.toFixed(2)} {sym(t.payment.currency)}
                                    {t.exchangeRate !== 1 && <span className="opacity-60 mr-1">× {t.exchangeRate.toFixed(3)}</span>}
                                  </div>
                                )}
                              </div>
                            </div>
                            {t.notes && (
                              <p className="text-xs text-muted-foreground">{t.notes}</p>
                            )}
                            {remaining !== null && (
                              <div className="text-xs text-red-500 font-semibold">
                                متبقي على الفاتورة: {remaining.toFixed(2)} {sym(t.payment.currency)}
                              </div>
                            )}
                            {t.payment.appointment?.branch?.name && (
                              <div className="text-xs text-muted-foreground">{t.payment.appointment.branch.name}</div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-border flex-shrink-0 flex-wrap">
              <button onClick={() => setSelectedPatient(null)} className="py-2.5 px-4 text-sm border border-border rounded-xl hover:bg-secondary">إغلاق</button>
              {selectedPatient.patientEmail && (
                <button
                  onClick={handleSendReport}
                  disabled={sendingReport}
                  className="flex items-center gap-1.5 py-2.5 px-4 text-sm border border-primary/40 text-primary rounded-xl hover:bg-primary/5 disabled:opacity-50 transition-colors"
                >
                  {sendingReport
                    ? <span className="w-3.5 h-3.5 border border-primary border-t-transparent rounded-full animate-spin" />
                    : <span>📧</span>}
                  {sendingReport ? 'جاري الإرسال...' : 'إرسال التقرير'}
                </button>
              )}
              {modalTab === 'INVOICES' && selectedPatient.status === 'DEBT' && (
                <button onClick={() => requestConfirm('تأكيد الدفع', `تسجيل دفعة ${Number(settleAmount).toFixed(2)} ${settleCurrency} وتوزيعها على فواتير ${selectedPatient?.patientName}؟`, handleSettle)} disabled={settling || !settleAmount || Number(settleAmount) <= 0}
                  className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-primary/90">
                  {settling ? 'جاري...' : `تسوية الدين (${selectedPatient.totalDebt.toFixed(2)} ₪)`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ TRANSACTIONS TAB ══ */}
      {mainTab === 'TRANSACTIONS' && <>

      {/* Stats */}
      {(() => {
        const fmtAmounts = (list: CurrencyAmount[]) =>
          list.length === 0
            ? <span className="text-muted-foreground text-sm">0</span>
            : <>{list.map((a, i) => (
                <span key={a.currency}>
                  {i > 0 && <span className="text-muted-foreground text-xs mx-1">+</span>}
                  <span className="font-bold">{a.amount.toLocaleString('ar', { maximumFractionDigits: 2 })}</span>
                  <span className="text-xs text-muted-foreground mr-0.5">{a.currency}</span>
                </span>
              ))}</>;
        return (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-2">إيرادات اليوم</p>
              <div className="text-lg leading-snug text-green-600 dark:text-green-400">{fmtAmounts(stats?.todayRevenue ?? [])}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats?.todayCount ?? 0} معاملة</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-2">إجمالي الإيرادات</p>
              <div className="text-lg leading-snug text-primary">{fmtAmounts(stats?.totalRevenue ?? [])}</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-2">معلّقة ({stats?.pendingCount ?? 0})</p>
              <div className="text-lg leading-snug text-amber-600 dark:text-amber-400">{fmtAmounts(stats?.pendingAmount ?? [])}</div>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground mb-2">مستردات</p>
              <div className="text-lg leading-snug text-red-500">{fmtAmounts(stats?.refundedAmount ?? [])}</div>
            </div>
          </div>
        );
      })()}

      {/* Toolbar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${activeTab === t.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={openRecord}
            className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 whitespace-nowrap">
            + تسجيل دفعة
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-40">
            <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input type="text" placeholder="ابحث باسم أو هاتف..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pr-9 pl-4 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            title="من تاريخ"
            className="px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" dir="ltr" />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            title="إلى تاريخ"
            className="px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary" dir="ltr" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="px-3 py-2 text-xs border border-border rounded-xl hover:bg-secondary text-muted-foreground">
              ✕ مسح التاريخ
            </button>
          )}
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
                {payments.map(p => {
                  const orig = p.originalAmount ?? p.amount;
                  const hasDiscount = p.discountType && p.discountType !== 'NONE' && (p.discountValue ?? 0) > 0;
                  const isPayout = p.transactionId?.startsWith('PAYOUT-');
                  return (
                    <tr key={p.id} className={`border-b border-border/50 hover:bg-secondary/20 ${isPayout ? 'bg-green-50/30 dark:bg-green-900/10' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="font-medium">{isPayout ? '💸 صرف للمريض' : (p.appointment?.patient.user.name ?? '—')}</p>
                        {!isPayout && <p className="text-xs text-muted-foreground" dir="ltr">{formatPhone(p.appointment?.patient.user.phoneNumber ?? '')}</p>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">
                        {p.appointment?.service.name ?? '—'}
                        {p.appointment?.branch.name && <p className="text-xs">{p.appointment.branch.name}</p>}
                      </td>
                      <td className="px-4 py-3">
                        {(() => {
                          const sym = (c: string) => ({ ILS: '₪', USD: '$', JOD: 'د.أ', EUR: '€' }[c] ?? c);
                          const isDiffCurr = !!(p.paidAmount && p.paidCurrency && p.paidCurrency !== p.currency);
                          const isPartial  = p.status === 'PENDING' && !!(p.paidAmount && p.paidAmount > 0);
                          const remaining  = (p.surplus !== null && (p.surplus ?? 0) < -0.005)
                            ? Math.max(0, -(p.surplus ?? 0))
                            : null;
                          return (
                            <>
                              <div className="font-bold" dir="ltr">
                                {p.amount.toFixed(2)} <span className="text-xs font-normal text-muted-foreground">{sym(p.currency)}</span>
                              </div>
                              {hasDiscount && (
                                <div className="text-xs text-green-600 dark:text-green-400" dir="ltr">
                                  أصلي: {orig.toFixed(2)} — خصم {p.discountType === 'PERCENTAGE' ? `${p.discountValue}%` : `${p.discountValue} ${sym(p.currency)}`}
                                </div>
                              )}
                              {isDiffCurr && (
                                <div className="text-xs text-muted-foreground" dir="ltr">
                                  دُفع: {(p.paidAmount ?? 0).toFixed(2)} {sym(p.paidCurrency!)}
                                </div>
                              )}
                              {isPartial && (
                                <div className="text-xs" dir="ltr">
                                  <span className="text-green-600 dark:text-green-400">مدفوع: {(p.paidAmount ?? 0).toFixed(2)} {sym(isDiffCurr ? p.paidCurrency! : p.currency)}</span>
                                  {remaining !== null && (
                                    <span className="text-red-500 mr-2">متبقي: {remaining.toFixed(2)} {sym(p.currency)}</span>
                                  )}
                                </div>
                              )}
                              {!isPartial && p.surplus !== null && (p.surplus ?? 0) > 0.005 && (
                                <div className="text-xs text-purple-600 dark:text-purple-400" dir="ltr">
                                  رصيد: +{(p.surplus ?? 0).toFixed(2)} {sym(p.currency)}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                        {methodLabels[p.method] ?? p.method}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[p.status]?.className}`}>
                          {statusConfig[p.status]?.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell" dir="ltr">
                        <div>{p.transactionTime?.split('T')[0]}</div>
                        <div>{p.appointment?.appointmentDate?.split('T')[0]}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          {p.status === 'PENDING' && (
                            <button onClick={() => openConfirmFromPayment(p)}
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
                          {p.status === 'COMPLETED' && (
                            <button onClick={() => { setRefundTarget(p); setRefundReason(''); setRefundError(''); }}
                              className="text-xs text-red-500 hover:underline font-medium whitespace-nowrap">
                              استرداد
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      </>}

      {/* ── Generic Confirm Dialog ── */}
      {confirmDialog && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-xs border border-border" dir="rtl">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="font-bold text-base">{confirmDialog.title}</h2>
            </div>
            <div className="px-5 py-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{confirmDialog.body}</p>
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-border">
              <button onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2 text-sm border border-border rounded-xl hover:bg-secondary">
                إلغاء
              </button>
              <button onClick={() => { confirmDialog.onConfirm(); setConfirmDialog(null); }}
                className={`flex-1 py-2 text-sm font-semibold rounded-xl text-white ${confirmDialog.danger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary/90'}`}>
                تأكيد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Payment Modal ── */}
      {confirmingPayment && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm border border-border" dir="rtl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <h2 className="font-bold">تأكيد استلام الدفعة</h2>
                <p className="text-xs text-muted-foreground mt-0.5">{confirmingPayment.serviceName}</p>
              </div>
              <button onClick={closeConfirmPayment}><XIcon className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Invoice summary */}
              <div className="bg-secondary/40 rounded-xl px-4 py-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المبلغ الأصلي</span>
                  <span className="font-bold" dir="ltr">{confirmBaseAmount.toFixed(2)} {confirmingPayment.currency}</span>
                </div>
                {confirmingPayment.amount !== confirmBaseAmount && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">بعد الخصم</span>
                    <span className="text-primary font-medium" dir="ltr">{confirmingPayment.amount.toFixed(2)} {confirmingPayment.currency}</span>
                  </div>
                )}
                {(confirmingPayment.surplus ?? 0) < -0.005 && (
                  <>
                    <div className="flex justify-between text-xs text-green-600 dark:text-green-400">
                      <span>مدفوع مسبقاً</span>
                      <span dir="ltr">+{confirmPreviousPaid.toFixed(2)} {confirmingPayment.currency}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-primary border-t border-border/50 pt-1 mt-1">
                      <span>المتبقي</span>
                      <span dir="ltr">{Math.max(0, -(confirmingPayment.surplus ?? 0)).toFixed(2)} {confirmingPayment.currency}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Discount */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">الخصم</label>
                <div className="flex gap-1">
                  {(['NONE', 'PERCENTAGE', 'FIXED'] as const).map(dt => (
                    <button key={dt} onClick={() => { setConfirmDiscType(dt); setConfirmDiscVal(''); }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${confirmDiscType === dt ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/40'}`}>
                      {dt === 'NONE' ? 'بدون' : dt === 'PERCENTAGE' ? 'نسبة %' : 'مبلغ ثابت'}
                    </button>
                  ))}
                </div>
                {confirmDiscType !== 'NONE' && (
                  <div className="relative">
                    <input type="number" value={confirmDiscVal} min="0"
                      placeholder={confirmDiscType === 'PERCENTAGE' ? '0 — 100' : '0.00'}
                      onChange={e => setConfirmDiscVal(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary pl-14"
                      dir="ltr" />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
                      {confirmDiscType === 'PERCENTAGE' ? '%' : confirmingPayment.currency}
                    </span>
                  </div>
                )}
              </div>

              {/* Final amount after discount */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex justify-between text-sm">
                <span className="text-muted-foreground">المبلغ المستحق</span>
                <span className="font-bold text-primary">{confirmFinalAmount.toFixed(2)} {confirmingPayment.currency}</span>
              </div>

              {/* Method */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">طريقة الاستلام</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(['CASH', 'CARD', 'BANK_TRANSFER'] as const).map(m => (
                    <button key={m} onClick={() => setConfirmMethod(m)}
                      className={`py-2 rounded-xl text-xs font-medium border transition-all ${confirmMethod === m ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/40'}`}>
                      {methodLabels[m]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment currency + amount */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium">العملة المدفوعة</label>
                <div className="flex gap-1 mb-2">
                  {(['ILS', 'USD', 'JOD', 'EUR'] as const).map(c => (
                    <button key={c} onClick={() => { setConfirmPayCurr(c); setConfirmRate(c === confirmingPayment.currency ? '1' : confirmRate); }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${confirmPayCurr === c ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/40'}`}>
                      {c}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input type="number" value={confirmPayAmt} min="0" step="0.5"
                    onChange={e => setConfirmPayAmt(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary pl-14"
                    dir="ltr" />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
                    {confirmPayCurr}
                  </span>
                </div>
              </div>

              {/* Exchange rate (only if different currency) */}
              {confirmPayCurr !== confirmingPayment.currency && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm font-medium">
                      سعر الصرف <span className="text-muted-foreground font-normal text-xs">(1 {confirmPayCurr} = ? {confirmingPayment.currency})</span>
                    </label>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      rateSource === 'live'     ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' :
                      rateSource === 'cache'    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                      rateSource === 'manual'   ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                      'bg-secondary text-muted-foreground'}`}>
                      {rateSource === 'live' ? 'مباشر' : rateSource === 'cache' ? 'محفوظ' : rateSource === 'manual' ? 'يدوي' : 'افتراضي'}
                    </span>
                  </div>
                  <input type="number" value={confirmRate} min="0.0001" step="0.0001"
                    onChange={e => { setConfirmRate(e.target.value); }}
                    className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    dir="ltr" />
                </div>
              )}

              {/* Surplus/deficit preview */}
              {Number(confirmPayAmt) > 0 && (
                <div className={`rounded-xl p-3 text-sm border ${confirmSurplus >= 0
                  ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                  : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'}`}>
                  <div className="flex justify-between text-muted-foreground text-xs mb-1">
                    <span>المدفوع بعملة الفاتورة</span>
                    <span dir="ltr">{confirmPaidInCost.toFixed(2)} {confirmingPayment.currency}</span>
                  </div>
                  <div className={`flex justify-between font-bold ${confirmSurplus >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    <span>{confirmSurplus >= 0 ? 'فائض' : 'عجز'}</span>
                    <span dir="ltr">{confirmSurplus >= 0 ? '+' : ''}{confirmSurplus.toFixed(2)} {confirmingPayment.currency}</span>
                  </div>
                </div>
              )}

              {/* Partial payment notice */}
              {Number(confirmPayAmt) > 0 && confirmSurplus < -0.005 && (
                <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-sm text-amber-700 dark:text-amber-400">
                  ℹ️ دفعة جزئية — المتبقي <strong>{Math.abs(confirmSurplus).toFixed(2)} {confirmingPayment.currency}</strong>. ستبقى الفاتورة معلّقة للمتابعة.
                </div>
              )}

              {/* Surplus handling */}
              {Number(confirmPayAmt) > 0 && confirmSurplus > 0 && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium">
                    ماذا تفعل بالفائض؟
                    <span className="text-primary font-bold mr-1">({confirmSurplus.toFixed(2)} {confirmingPayment.currency})</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setConfirmSurplusAction('KEEP')}
                      className={`py-2.5 rounded-xl text-xs font-medium border transition-all text-center ${confirmSurplusAction === 'KEEP' ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/40'}`}>
                      💰 يبقى رصيداً في العيادة
                    </button>
                    <button onClick={() => setConfirmSurplusAction('REFUND')}
                      className={`py-2.5 rounded-xl text-xs font-medium border transition-all text-center ${confirmSurplusAction === 'REFUND' ? 'bg-green-600 text-white border-green-600' : 'border-border hover:border-green-400'}`}>
                      ↩️ استرداده للمريض الآن
                    </button>
                  </div>
                  {confirmSurplusAction === 'REFUND' && (
                    <div className="space-y-1.5">
                      <p className="text-xs text-muted-foreground">طريقة الاسترداد</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {(['CASH', 'CARD', 'BANK_TRANSFER'] as const).map(m => (
                          <button key={m} onClick={() => setConfirmRefundMethod(m)}
                            className={`py-1.5 rounded-lg text-xs font-medium border transition-all ${confirmRefundMethod === m ? 'bg-green-600 text-white border-green-600' : 'border-border hover:border-green-400'}`}>
                            {methodLabels[m]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1">ملاحظات</label>
                <textarea value={confirmNotes} onChange={e => setConfirmNotes(e.target.value)} rows={2}
                  placeholder="اختياري..."
                  className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>

              {confirmError && <p className="text-sm text-red-500">{confirmError}</p>}
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-border">
              <button onClick={closeConfirmPayment} className="flex-1 py-2.5 text-sm border border-border rounded-xl hover:bg-secondary">
                تراجع
              </button>
              <button onClick={handleConfirmSubmit}
                disabled={confirming || !confirmPayAmt || Number(confirmPayAmt) <= 0}
                className="flex-1 py-2.5 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700 disabled:opacity-50">
                {confirming ? 'جاري...' : 'تأكيد الاستلام'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Invoice Modal ── */}
      {editingInvoice && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm border border-border" dir="rtl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-bold">تعديل الفاتورة</h2>
              <button onClick={closeEditInvoice}><XIcon className="w-5 h-5" /></button>
            </div>

            <div className="p-5 space-y-4">
              {/* Info */}
              <div className="bg-secondary/40 rounded-xl px-4 py-3 text-sm">
                <p className="font-medium">{editingInvoice.serviceName}</p>
                <p className="text-xs text-muted-foreground" dir="ltr">{editingInvoice.date} — {editingInvoice.time}</p>
              </div>

              {/* Amount + currency */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">المبلغ الأصلي</label>
                <div className="flex gap-1 flex-wrap">
                  {(['ILS', 'USD', 'JOD', 'EUR'] as const).map(c => (
                    <button key={c} onClick={() => setEditCurrency(c)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${editCurrency === c ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/40'}`}>
                      {c}
                    </button>
                  ))}
                </div>
                <div className="relative">
                  <input type="number" value={editAmount} min="0" step="0.5"
                    onChange={e => setEditAmount(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary pl-14"
                    dir="ltr" />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">{editCurrency}</span>
                </div>
              </div>

              {/* Discount */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">الخصم</label>
                <div className="flex gap-1">
                  {(['NONE', 'PERCENTAGE', 'FIXED'] as const).map(dt => (
                    <button key={dt} onClick={() => { setEditDiscountType(dt); setEditDiscountVal(''); }}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${editDiscountType === dt ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/40'}`}>
                      {dt === 'NONE' ? 'بدون' : dt === 'PERCENTAGE' ? 'نسبة %' : 'مبلغ ثابت'}
                    </button>
                  ))}
                </div>
                {editDiscountType !== 'NONE' && (
                  <div className="relative">
                    <input type="number" value={editDiscountVal} min="0"
                      placeholder={editDiscountType === 'PERCENTAGE' ? '0 — 100' : '0.00'}
                      onChange={e => setEditDiscountVal(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary pl-14"
                      dir="ltr" />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium pointer-events-none">
                      {editDiscountType === 'PERCENTAGE' ? '%' : editCurrency}
                    </span>
                  </div>
                )}
              </div>

              {/* Final preview */}
              {Number(editAmount) > 0 && (
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex justify-between text-sm">
                  <span className="text-muted-foreground">المبلغ النهائي</span>
                  <span className="font-bold text-primary">{editFinal.toFixed(2)} {editCurrency}</span>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium mb-1">ملاحظات</label>
                <textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2}
                  placeholder="ملاحظات اختيارية..."
                  className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>

              {editError && <p className="text-sm text-red-500">{editError}</p>}
            </div>

            <div className="flex gap-3 px-5 py-4 border-t border-border">
              <button onClick={closeEditInvoice} className="flex-1 py-2 text-sm border border-border rounded-xl hover:bg-secondary">
                تراجع
              </button>
              <button onClick={handleSaveInvoice} disabled={saving || !editAmount || Number(editAmount) <= 0}
                className="flex-1 py-2 bg-primary text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-primary/90">
                {saving ? 'جاري...' : 'حفظ التعديل'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Refund Modal ── */}
      {refundTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm border border-border" dir="rtl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="font-bold">استرداد الدفعة</h2>
              <button onClick={() => setRefundTarget(null)}><XIcon className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-secondary/40 rounded-xl p-4 text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المريض</span>
                  <span className="font-medium">{refundTarget.appointment?.patient.user.name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">الخدمة</span>
                  <span>{refundTarget.appointment?.service.name ?? '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">المبلغ</span>
                  <span className="font-bold text-red-500">{refundTarget.amount.toFixed(2)} {refundTarget.currency}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">سبب الاسترداد <span className="text-red-500">*</span></label>
                <textarea value={refundReason} onChange={e => setRefundReason(e.target.value)} rows={3}
                  placeholder="أدخل سبب الاسترداد..."
                  className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
              </div>

              <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-3 text-xs text-red-700 dark:text-red-300">
                ⚠️ هذا الإجراء لا يمكن التراجع عنه. سيتم تغيير حالة الدفعة إلى "مسترد".
              </div>

              {refundError && <p className="text-sm text-red-500">{refundError}</p>}
            </div>
            <div className="flex gap-3 px-5 py-4 border-t border-border">
              <button onClick={() => setRefundTarget(null)} className="flex-1 py-2 text-sm border border-border rounded-xl hover:bg-secondary">
                تراجع
              </button>
              <button onClick={() => requestConfirm('تأكيد الاسترداد', `استرداد ${refundTarget?.amount.toFixed(2)} ${refundTarget?.currency} من ${refundTarget?.appointment?.patient.user.name}؟`, handleRefund, true)} disabled={refunding || !refundReason.trim()}
                className="flex-1 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50">
                {refunding ? 'جاري...' : 'تأكيد الاسترداد'}
              </button>
            </div>
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
                <button onClick={() => handlePrintInvoice(invoiceTarget)}
                  className="px-3 py-1.5 text-xs border border-border rounded-lg hover:bg-secondary">
                  طباعة
                </button>
                {invoiceTarget.appointment?.patient?.user?.email ? (
                  <button
                    onClick={() => handleSendInvoice(invoiceTarget)}
                    disabled={sendingInvoice}
                    className="px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 whitespace-nowrap"
                  >
                    {sendingInvoice ? '...' : 'إرسال بالإيميل'}
                  </button>
                ) : (
                  <span className="px-3 py-1.5 text-xs text-muted-foreground border border-border rounded-lg cursor-not-allowed" title="المريض ليس لديه إيميل">
                    لا يوجد إيميل
                  </span>
                )}
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
              {(() => {
                const inv = invoiceTarget;
                const curr = inv.currency;
                const sym = (c: string) => ({ ILS: '₪', USD: '$', JOD: 'د.أ', EUR: '€' }[c] ?? c);
                const orig = (inv.originalAmount ?? inv.amount).toFixed(2);
                const hasDiscount = inv.discountType && inv.discountType !== 'NONE' && (inv.discountValue ?? 0) > 0;
                const discAmt = hasDiscount
                  ? inv.discountType === 'PERCENTAGE'
                    ? ((inv.originalAmount ?? inv.amount) * (inv.discountValue ?? 0) / 100).toFixed(2)
                    : (inv.discountValue ?? 0).toFixed(2)
                  : '0';
                const isDiffCurr  = inv.paidCurrency && inv.paidCurrency !== curr;
                const hasPaid     = inv.paidAmount && inv.paidAmount > 0;
                const paidInCost  = hasPaid ? Math.round((inv.paidAmount ?? 0) * (inv.exchangeRate ?? 1) * 100) / 100 : 0;
                const calcSurplus = hasPaid ? Math.round((paidInCost - inv.amount) * 100) / 100 : 0;
                const surplusReturned = calcSurplus > 0.005 && (inv.surplus === null || inv.surplus === 0 || Math.abs((inv.surplus ?? 0)) < 0.005);
                const surplusSaved   = (inv.surplus ?? 0) > 0.005;
                const deficit        = (inv.surplus ?? 0) < -0.005;
                return (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الخدمة</span>
                      <span className="font-medium">{inv.appointment?.service.name ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">المبلغ الأصلي</span>
                      <span dir="ltr">{orig} {sym(curr)}</span>
                    </div>
                    {hasDiscount && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>خصم {inv.discountType === 'PERCENTAGE' ? `${inv.discountValue}%` : `ثابت ${inv.discountValue} ${sym(curr)}`}</span>
                        <span dir="ltr">-{discAmt} {sym(curr)}</span>
                      </div>
                    )}

                    <div className="border-t border-border pt-2 flex justify-between items-center">
                      <span className="font-bold">الإجمالي المستحق</span>
                      <span className="font-bold text-primary text-base" dir="ltr">{inv.amount.toFixed(2)} {sym(curr)}</span>
                    </div>

                    {hasPaid && (
                      <div className="border-t border-dashed border-border pt-2 space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">المدفوع</span>
                          <span className="font-semibold" dir="ltr">{(inv.paidAmount ?? 0).toFixed(2)} {sym(inv.paidCurrency ?? curr)}</span>
                        </div>
                        {isDiffCurr && (
                          <>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>سعر الصرف</span>
                              <span dir="ltr">1 {sym(inv.paidCurrency!)} = {inv.exchangeRate?.toFixed(4)} {sym(curr)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>المعادل</span>
                              <span dir="ltr">{paidInCost.toFixed(2)} {sym(curr)}</span>
                            </div>
                          </>
                        )}
                        {surplusSaved && (
                          <div className="flex justify-between font-semibold text-purple-600 dark:text-purple-400">
                            <span>رصيد محفوظ في العيادة</span>
                            <span dir="ltr">+{(inv.surplus ?? 0).toFixed(2)} {sym(curr)}</span>
                          </div>
                        )}
                        {surplusReturned && (
                          <div className="flex justify-between font-semibold text-green-600 dark:text-green-400">
                            <span>فائض أُرجع للمريض</span>
                            <span dir="ltr">+{calcSurplus.toFixed(2)} {sym(curr)}</span>
                          </div>
                        )}
                        {deficit && (
                          <div className="flex justify-between font-semibold text-red-500">
                            <span>عجز</span>
                            <span dir="ltr">{(inv.surplus ?? 0).toFixed(2)} {sym(curr)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="border-t border-dashed border-border pt-2 flex justify-between">
                      <span className="text-muted-foreground">طريقة الدفع</span>
                      <span>{methodLabels[inv.method] ?? inv.method}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">الحالة</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[inv.status]?.className}`}>
                        {statusConfig[inv.status]?.label}
                      </span>
                    </div>
                  </div>
                );
              })()}

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
                    <p><span className="text-muted-foreground">الخدمة: </span>{selectedAppt.service.name} <span className="text-muted-foreground text-xs">(سعر مرجعي: {selectedAppt.service.basePrice} ₪)</span></p>
                  </div>

                  {/* Invoice only toggle */}
                  <div className="flex items-center justify-between bg-secondary/30 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">فاتورة بدون دفع</p>
                      <p className="text-xs text-muted-foreground">يُسجَّل الدين ويُدفع لاحقاً</p>
                    </div>
                    <button onClick={() => setInvoiceOnly(v => !v)}
                      className={`w-11 h-6 rounded-full transition-colors relative ${invoiceOnly ? 'bg-primary' : 'bg-border'}`}>
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${invoiceOnly ? 'right-1' : 'left-1'}`} />
                    </button>
                  </div>

                  {/* Surplus deduction (if patient has credit) */}
                  {patientSurplus > 0 && (
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-green-700 dark:text-green-400">خصم الفائض</p>
                        <p className="text-xs text-muted-foreground">رصيد المريض: {patientSurplus.toFixed(2)} ₪</p>
                      </div>
                      <button onClick={() => setApplySurplus(v => !v)}
                        className={`w-11 h-6 rounded-full transition-colors relative ${applySurplus ? 'bg-green-600' : 'bg-border'}`}>
                        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${applySurplus ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  )}

                  {/* Method */}
                  <div>
                    <label className="block text-sm font-medium mb-2">طريقة الدفع</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['CASH', 'CARD', 'BANK_TRANSFER'] as const).map(m => (
                        <button key={m} onClick={() => setPayMethod(m)}
                          className={`py-2 rounded-xl text-sm font-medium border transition-all ${payMethod === m ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/40'}`}>
                          {methodLabels[m]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Cost section ── */}
                  <div className="border border-border rounded-xl p-3 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">التكلفة</p>
                    <div className="flex gap-2">
                      <input type="number" value={costAmount} min="0" step="0.5" placeholder="0.00"
                        onChange={e => setCostAmount(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        dir="ltr" />
                      <div className="flex gap-1">
                        {(['ILS','USD','JOD','EUR'] as const).map(c => (
                          <button key={c} onClick={() => setCostCurrency(c)}
                            className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all ${costCurrency === c ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/40'}`}>
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Discount */}
                    <div className="space-y-2">
                      <div className="flex gap-1">
                        {(['NONE','PERCENTAGE','FIXED'] as const).map(dt => (
                          <button key={dt} onClick={() => { setDiscountType(dt); setDiscountValue(''); }}
                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all ${discountType === dt ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/40'}`}>
                            {dt === 'NONE' ? 'بدون خصم' : dt === 'PERCENTAGE' ? 'خصم %' : 'خصم ثابت'}
                          </button>
                        ))}
                      </div>
                      {discountType !== 'NONE' && (
                        <input type="number" value={discountValue} min="0"
                          placeholder={discountType === 'PERCENTAGE' ? '10' : '50'}
                          onChange={e => setDiscountValue(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                          dir="ltr" />
                      )}
                    </div>
                    {baseCostAmount > 0 && (
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-muted-foreground">التكلفة النهائية</span>
                        <span className="text-foreground">{finalCostAmount.toFixed(2)} {costCurrency}</span>
                      </div>
                    )}
                  </div>

                  {/* ── Payment section — hidden when invoice-only ── */}
                  {!invoiceOnly && <div className="border border-border rounded-xl p-3 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">المبلغ المدفوع</p>
                    <div className="flex gap-2">
                      <input type="number" value={payAmount} min="0" step="0.5" placeholder="0.00"
                        onChange={e => setPayAmount(e.target.value)}
                        className="flex-1 px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                        dir="ltr" />
                      <div className="flex gap-1">
                        {(['ILS','USD','JOD','EUR'] as const).map(c => (
                          <button key={c} onClick={() => { setPayCurrency(c); setRateSource('fallback'); }}
                            className={`px-2 py-1 rounded-lg text-xs font-medium border transition-all ${payCurrency === c ? 'bg-primary text-white border-primary' : 'border-border hover:border-primary/40'}`}>
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Exchange rate */}
                    {costCurrency !== payCurrency && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-xs text-muted-foreground">
                            سعر الصرف (1 {payCurrency} = ? {costCurrency})
                          </label>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            rateSource === 'live'   ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                            rateSource === 'manual' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                            'bg-secondary text-muted-foreground'
                          }`}>
                            {rateSource === 'live' ? '🟢 مباشر' : rateSource === 'manual' ? '✏️ يدوي' : '⚠️ احتياطي'}
                          </span>
                        </div>
                        <input type="number" value={exchangeRate} min="0.0001" step="0.0001"
                          onChange={e => { setExchangeRate(e.target.value); setRateSource('manual'); }}
                          className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                          dir="ltr" />
                      </div>
                    )}
                  </div>}

                  {/* ── Conversion result ── */}
                  {baseCostAmount > 0 && paidAmt > 0 && (
                    <div className={`rounded-xl p-4 border space-y-2 text-sm ${
                      surplus >= 0 ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                                   : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                    }`}>
                      {costCurrency !== payCurrency && (
                        <div className="flex justify-between text-muted-foreground">
                          <span>{paidAmt.toFixed(2)} {payCurrency} =</span>
                          <span className="font-medium text-foreground">{paidInCostCurr.toFixed(2)} {costCurrency}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">التكلفة النهائية</span>
                        <span>{finalCostAmount.toFixed(2)} {costCurrency}</span>
                      </div>
                      <div className={`flex justify-between font-bold text-base border-t pt-2 ${surplus >= 0 ? 'border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' : 'border-red-200 dark:border-red-800 text-red-600 dark:text-red-400'}`}>
                        <span>{surplus >= 0 ? 'فائض' : 'عجز'}</span>
                        <span>{surplus >= 0 ? '+' : ''}{surplus.toFixed(2)} {costCurrency}</span>
                      </div>
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
                <button
                  onClick={submitRecord}
                  disabled={recording || !costAmount || baseCostAmount <= 0 || (!invoiceOnly && paidAmt <= 0)}
                  className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-primary/90">
                  {recording
                    ? 'جاري...'
                    : invoiceOnly
                      ? `تسجيل فاتورة ${finalCostAmount.toFixed(2)} ${costCurrency}`
                      : `تسجيل دفعة ${finalCostAmount.toFixed(2)} ${costCurrency}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
