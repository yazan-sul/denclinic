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

// ─── Patient balance types ────────────────────────────────────────────────────

interface PendingInvoice {
  appointmentId: string;
  serviceName:   string;
  amount:        number;
  currency:      string;
  date:          string;
  time:          string;
  branchName:    string;
  paymentId:     string | null;
  paymentStatus: string | null;
}

interface PatientBalance {
  patientId:       number;
  patientName:     string;
  patientPhone:    string;
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
  const [patientTxns,     setPatientTxns]     = useState<Payment[]>([]);
  const [loadingTxns,     setLoadingTxns]     = useState(false);
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

  // ── Mark paid modal ───────────────────────────────────────────────────────────
  const [markTarget,  setMarkTarget]  = useState<Payment | null>(null);
  const [marking,     setMarking]     = useState(false);

  // ── Invoice modal ─────────────────────────────────────────────────────────────
  const [invoiceTarget, setInvoiceTarget] = useState<Payment | null>(null);

  const handlePrintInvoice = (p: Payment) => {
    const branch     = p.appointment?.branch.name ?? '';
    const patient    = p.appointment?.patient.user.name ?? '—';
    const doctor     = p.appointment?.doctor.user.name ?? '—';
    const service    = p.appointment?.service.name ?? '—';
    const apptDate   = p.appointment?.appointmentDate?.split('T')[0] ?? '';
    const apptTime   = p.appointment?.appointmentTime ?? '';
    const dateStr    = new Date(p.transactionTime).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const origAmt    = (p.originalAmount ?? p.amount).toFixed(2);
    const finalAmt   = p.amount.toFixed(2);
    const currency   = p.currency;
    const method     = methodLabels[p.method] ?? p.method;
    const status     = statusConfig[p.status]?.label ?? p.status;

    const discountLine = p.discountType && p.discountType !== 'NONE' && (p.discountValue ?? 0) > 0
      ? `<tr>
          <td style="color:#16a34a">خصم ${p.discountType === 'PERCENTAGE' ? p.discountValue + '%' : p.discountValue + ' ' + currency}</td>
          <td style="color:#16a34a;text-align:left">-${p.discountType === 'PERCENTAGE'
            ? (((p.originalAmount ?? p.amount) * (p.discountValue ?? 0)) / 100).toFixed(2)
            : (p.discountValue ?? 0).toFixed(2)} ${currency}</td>
        </tr>`
      : '';

    const paidLine = p.paidAmount && p.paidCurrency && p.paidCurrency !== p.currency
      ? `<tr style="border-top:1px dashed #ccc">
          <td>المدفوع</td>
          <td style="text-align:left">${p.paidAmount.toFixed(2)} ${p.paidCurrency}</td>
        </tr>
        <tr>
          <td>سعر الصرف</td>
          <td style="text-align:left">1 ${p.paidCurrency} = ${p.exchangeRate?.toFixed(4)} ${p.currency}</td>
        </tr>
        ${p.surplus !== null && p.surplus !== undefined ? `
        <tr>
          <td style="color:${(p.surplus ?? 0) >= 0 ? '#16a34a' : '#dc2626'}">${(p.surplus ?? 0) >= 0 ? 'فائض' : 'عجز'}</td>
          <td style="text-align:left;color:${(p.surplus ?? 0) >= 0 ? '#16a34a' : '#dc2626'}">${(p.surplus ?? 0) >= 0 ? '+' : ''}${(p.surplus ?? 0).toFixed(2)} ${p.currency}</td>
        </tr>` : ''}`
      : '';

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>فاتورة</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 32px; max-width: 400px; margin: auto; }
    .header { text-align: center; margin-bottom: 16px; }
    .header h1 { font-size: 18px; font-weight: 700; }
    .header p  { font-size: 12px; color: #666; margin-top: 2px; }
    hr.dashed  { border: none; border-top: 1px dashed #bbb; margin: 12px 0; }
    hr.solid   { border: none; border-top: 2px solid #111; margin: 12px 0; }
    table { width: 100%; border-collapse: collapse; }
    td { padding: 5px 0; vertical-align: top; }
    td:last-child { text-align: left; font-weight: 500; }
    .label { color: #555; }
    .total-row td { font-size: 16px; font-weight: 700; padding-top: 10px; }
    .footer { text-align: center; font-size: 11px; color: #888; margin-top: 20px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 11px; font-weight: 600; }
    .paid    { background: #dcfce7; color: #15803d; }
    .pending { background: #fef3c7; color: #b45309; }
    .refunded{ background: #f3e8ff; color: #7e22ce; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${branch}</h1>
    <p>${dateStr}</p>
  </div>
  <hr class="dashed"/>
  <table>
    <tr><td class="label">المريض</td><td>${patient}</td></tr>
    <tr><td class="label">الطبيب</td><td>${doctor}</td></tr>
    <tr><td class="label">الموعد</td><td dir="ltr">${apptDate} — ${apptTime}</td></tr>
  </table>
  <hr class="dashed"/>
  <table>
    <tr><td class="label">الخدمة</td><td>${service}</td></tr>
    <tr><td class="label">المبلغ الأصلي</td><td>${origAmt} ${currency}</td></tr>
    ${discountLine}
  </table>
  <hr class="solid"/>
  <table>
    <tr class="total-row">
      <td>الإجمالي</td>
      <td style="color:#0ea5e9">${finalAmt} ${currency}</td>
    </tr>
    ${paidLine}
  </table>
  <hr class="dashed"/>
  <table>
    <tr><td class="label">طريقة الدفع</td><td>${method}</td></tr>
    <tr><td class="label">الحالة</td><td>${status}</td></tr>
  </table>
  <div class="footer">شكراً لثقتكم بنا</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=480,height=700');
    if (!win) return;
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 300);
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
      if (json.success) setBalances(json.data ?? []);
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
    fetch(`/api/staff/payments?clinicId=${selectedClinic}&search=${encodeURIComponent(selectedPatient.patientName)}&pageSize=20`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success) setPatientTxns(j.data.payments ?? []); })
      .catch(() => {})
      .finally(() => setLoadingTxns(false));
  }, [selectedPatient, selectedClinic]);

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
              <button onClick={() => setSelectedPatient(null)}><XIcon className="w-5 h-5" /></button>
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
                          <button
                            onClick={() => setExpandedInvoice(expandedInvoice === inv.appointmentId ? null : inv.appointmentId)}
                            className="w-full flex items-center justify-between px-4 py-3 text-sm text-right">
                            <div>
                              <p className="font-medium">{inv.serviceName}</p>
                              <p className="text-xs text-muted-foreground" dir="ltr">{inv.date} — {inv.time}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{inv.amount.toFixed(2)} {inv.currency}</span>
                              <span className="text-xs text-primary">{expandedInvoice === inv.appointmentId ? '▲' : '▼'}</span>
                            </div>
                          </button>
                          {expandedInvoice === inv.appointmentId && (
                            <div className="border-t border-border/50 px-4 py-3 text-xs space-y-1.5 text-muted-foreground">
                              <div className="flex justify-between"><span>الفرع</span><span>{inv.branchName}</span></div>
                              <div className="flex justify-between"><span>الوقت</span><span dir="ltr">{inv.time}</span></div>
                              <div className="flex justify-between"><span>حالة الدفع</span>
                                <span className={inv.paymentStatus === 'PENDING' ? 'text-amber-600' : 'text-muted-foreground'}>
                                  {inv.paymentStatus === 'PENDING' ? 'في الانتظار' : 'لم يُسجَّل بعد'}
                                </span>
                              </div>
                              <div className="flex justify-between font-semibold text-foreground text-sm pt-1">
                                <span>المبلغ</span><span>{inv.amount.toFixed(2)} {inv.currency}</span>
                              </div>
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
                          <label className="block text-xs text-muted-foreground mb-1">سعر الصرف (1 {settleCurrency} = ? ₪)</label>
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
                  <p className="text-xs font-semibold text-muted-foreground">سجل الحركات المالية</p>
                  {loadingTxns ? (
                    <div className="flex justify-center py-6">
                      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : patientTxns.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">لا توجد معاملات مسجلة</p>
                  ) : (
                    patientTxns.map(t => (
                      <div key={t.id} className={`rounded-xl px-4 py-3 text-sm space-y-1 ${t.transactionId?.startsWith('PAYOUT-') ? 'bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800' : 'bg-secondary/40'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {t.transactionId?.startsWith('PAYOUT-')
                              ? '💸 صرف للمريض'
                              : t.appointment?.service.name ?? '—'}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[t.status]?.className}`}>
                            {statusConfig[t.status]?.label}
                          </span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{methodLabels[t.method] ?? t.method}</span>
                          <span dir="ltr">{t.transactionTime?.split('T')[0]}</span>
                        </div>
                        <div className="flex justify-between font-semibold">
                          <span className="text-muted-foreground text-xs">المبلغ</span>
                          <span className={t.transactionId?.startsWith('PAYOUT-') ? 'text-green-700 dark:text-green-400' : ''}>
                            {t.transactionId?.startsWith('PAYOUT-') ? '-' : ''}{t.amount.toFixed(2)} {t.currency}
                          </span>
                        </div>
                        {t.paidAmount && t.paidCurrency && t.paidCurrency !== t.currency && (
                          <p className="text-xs text-muted-foreground">
                            دُفع: {t.paidAmount.toFixed(2)} {t.paidCurrency} (سعر {t.exchangeRate?.toFixed(3)})
                          </p>
                        )}
                        {t.surplus !== null && t.surplus !== undefined && t.surplus !== 0 && (
                          <p className={`text-xs font-medium ${t.surplus > 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {t.surplus > 0 ? `فائض: +${t.surplus.toFixed(2)}` : `عجز: ${t.surplus.toFixed(2)}`} {t.currency}
                          </p>
                        )}
                        {t.description && (
                          <p className="text-xs text-muted-foreground italic">{t.description}</p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-5 py-4 border-t border-border flex-shrink-0">
              <button onClick={() => setSelectedPatient(null)} className="flex-1 py-2.5 text-sm border border-border rounded-xl hover:bg-secondary">إغلاق</button>
              {modalTab === 'INVOICES' && selectedPatient.status === 'DEBT' && (
                <button onClick={handleSettle} disabled={settling || !settleAmount || Number(settleAmount) <= 0}
                  className="flex-1 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl disabled:opacity-50 hover:bg-primary/90">
                  {settling ? 'جاري...' : 'تسجيل الدفعة'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ TRANSACTIONS TAB ══ */}
      {mainTab === 'TRANSACTIONS' && <>

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
                <button onClick={() => handlePrintInvoice(invoiceTarget)}
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

      </>}

    </div>
  );
}
