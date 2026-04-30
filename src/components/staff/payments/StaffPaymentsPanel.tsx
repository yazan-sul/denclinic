'use client';

import { useState } from 'react';
import { SearchIcon, XIcon, CheckCircleIcon } from '@/components/Icons';

/* ─── Types ────────────────────────────────────────────── */
type PaymentMethod = 'cash' | 'card' | 'online';
type PaymentStatus = 'paid' | 'pending' | 'refunded' | 'partial';
type TabId = 'all' | 'pending' | 'paid' | 'refunded';

interface Payment {
  id: number;
  patient: string;
  phone: string;
  service: string;
  doctor: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  date: string;
  receiptNo: string;
}

/* ─── Mock Data ────────────────────────────────────────── */
const mockPayments: Payment[] = [
  { id: 1, patient: 'أحمد محمد', phone: '0599000001', service: 'مراجعة دورية', doctor: 'د. عبد اللطيف', amount: 100, method: 'cash', status: 'paid', date: '2026-04-18', receiptNo: 'RCP-1001' },
  { id: 2, patient: 'فاطمة علي', phone: '0599000002', service: 'تنظيف أسنان', doctor: 'د. خالد', amount: 150, method: 'card', status: 'paid', date: '2026-04-18', receiptNo: 'RCP-1002' },
  { id: 3, patient: 'محمود حسن', phone: '0599000003', service: 'استشارة جديدة', doctor: 'د. عبد اللطيف', amount: 80, method: 'cash', status: 'pending', date: '2026-04-18', receiptNo: '' },
  { id: 4, patient: 'نور عبدالله', phone: '0599000004', service: 'حشو سن', doctor: 'د. خالد', amount: 250, method: 'online', status: 'paid', date: '2026-04-17', receiptNo: 'RCP-1003' },
  { id: 5, patient: 'سارة محمود', phone: '0599000005', service: 'خلع سن', doctor: 'د. عبد اللطيف', amount: 200, method: 'cash', status: 'refunded', date: '2026-04-17', receiptNo: 'RCP-1004' },
  { id: 6, patient: 'عمر ياسين', phone: '0599000006', service: 'تبييض أسنان', doctor: 'د. خالد', amount: 300, method: 'card', status: 'paid', date: '2026-04-16', receiptNo: 'RCP-1005' },
  { id: 7, patient: 'ليلى أحمد', phone: '0599000007', service: 'تقويم أسنان', doctor: 'د. عبد اللطيف', amount: 500, method: 'online', status: 'pending', date: '2026-04-16', receiptNo: '' },
  { id: 8, patient: 'خالد عبدالله', phone: '0599000008', service: 'زراعة سن', doctor: 'د. خالد', amount: 1200, method: 'card', status: 'paid', date: '2026-04-15', receiptNo: 'RCP-1006' },
];

/* ─── Config ───────────────────────────────────────────── */
const statusConfig: Record<PaymentStatus, { label: string; className: string }> = {
  paid:     { label: 'مدفوع',     className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  pending:  { label: 'معلّق',     className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  refunded: { label: 'مسترد',     className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  partial:  { label: 'جزئي',      className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
};

const methodLabels: Record<PaymentMethod, string> = {
  cash: 'نقدي',
  card: 'بطاقة',
  online: 'إلكتروني',
};

const tabs: { id: TabId; label: string }[] = [
  { id: 'all', label: 'الكل' },
  { id: 'pending', label: 'معلّقة' },
  { id: 'paid', label: 'مدفوعة' },
  { id: 'refunded', label: 'مستردة' },
];

const emptyRecordForm = {
  patient: '',
  phone: '',
  service: '',
  amount: '',
  method: 'cash' as PaymentMethod,
};

/* ─── Component ────────────────────────────────────────── */
export default function StaffPaymentsPanel() {
  const [payments, setPayments] = useState<Payment[]>(mockPayments);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabId>('all');
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState<Payment | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState<Payment | null>(null);
  const [recordForm, setRecordForm] = useState(emptyRecordForm);
  const [refundReason, setRefundReason] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  /* ── Filtering ── */
  const filtered = payments.filter((p) => {
    const matchSearch = p.patient.includes(search) || p.phone.includes(search) || p.receiptNo.includes(search);
    const matchTab = activeTab === 'all' || p.status === activeTab;
    return matchSearch && matchTab;
  });

  /* ── Stats ── */
  const todayPayments = payments.filter((p) => p.date === '2026-04-18');
  const todayTotal = todayPayments.filter((p) => p.status === 'paid').reduce((s, p) => s + p.amount, 0);
  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const pendingTotal = payments.filter((p) => p.status === 'pending').reduce((s, p) => s + p.amount, 0);
  const refundedTotal = payments.filter((p) => p.status === 'refunded').reduce((s, p) => s + p.amount, 0);

  /* ── Handlers ── */
  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleRecordPayment = () => {
    if (!recordForm.patient.trim() || !recordForm.amount) return;
    const newPayment: Payment = {
      id: Date.now(),
      patient: recordForm.patient,
      phone: recordForm.phone,
      service: recordForm.service,
      doctor: '',
      amount: Number(recordForm.amount),
      method: recordForm.method,
      status: 'paid',
      date: '2026-04-18',
      receiptNo: `RCP-${Date.now().toString().slice(-4)}`,
    };
    setPayments((prev) => [newPayment, ...prev]);
    setRecordForm(emptyRecordForm);
    setShowRecordModal(false);
    showSuccess('تم تسجيل الدفعة بنجاح');
  };

  const handleRefund = () => {
    if (!showRefundModal) return;
    setPayments((prev) =>
      prev.map((p) => p.id === showRefundModal.id ? { ...p, status: 'refunded' as PaymentStatus } : p)
    );
    setShowRefundModal(null);
    setRefundReason('');
    showSuccess('تم الاسترداد بنجاح');
  };

  const handleMarkPaid = (id: number) => {
    setPayments((prev) =>
      prev.map((p) => p.id === id ? { ...p, status: 'paid' as PaymentStatus, receiptNo: `RCP-${Date.now().toString().slice(-4)}` } : p)
    );
    showSuccess('تم تأكيد الدفع');
  };

  return (
    <div className="space-y-6" dir="rtl">

      {/* Success toast */}
      {successMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">إيرادات اليوم</p>
          <p className="text-2xl font-bold text-foreground">{todayTotal.toLocaleString('ar')} <span className="text-sm font-normal text-muted-foreground">₪</span></p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">معاملات اليوم</p>
          <p className="text-2xl font-bold text-foreground">{todayPayments.length}</p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">معلّقة</p>
          <p className="text-2xl font-bold text-amber-600">{pendingCount} <span className="text-sm font-normal">({pendingTotal.toLocaleString('ar')} ₪)</span></p>
        </div>
        <div className="bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-muted-foreground mb-1">مستردات</p>
          <p className="text-2xl font-bold text-red-600">{refundedTotal.toLocaleString('ar')} <span className="text-sm font-normal text-muted-foreground">₪</span></p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        {/* Tabs */}
        <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="ابحث (مريض، هاتف، إيصال)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 pl-4 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary w-56"
            />
          </div>
          <button
            onClick={() => { setRecordForm(emptyRecordForm); setShowRecordModal(true); }}
            className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            + تسجيل دفعة
          </button>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-right px-4 py-3 font-semibold text-foreground">المريض</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground hidden sm:table-cell">الخدمة</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground">المبلغ</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground hidden md:table-cell">طريقة الدفع</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground">الحالة</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground hidden lg:table-cell">التاريخ</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground hidden lg:table-cell">الإيصال</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-muted-foreground">
                    لا توجد معاملات
                  </td>
                </tr>
              ) : (
                filtered.map((p) => (
                  <tr key={p.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                          {p.patient.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{p.patient}</p>
                          <p className="text-xs text-muted-foreground" dir="ltr">{p.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{p.service}</td>
                    <td className="px-4 py-3 font-bold text-foreground">{p.amount.toLocaleString('ar')} ₪</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{methodLabels[p.method]}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[p.status].className}`}>
                        {statusConfig[p.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell" dir="ltr">{p.date}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell font-mono text-xs">{p.receiptNo || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.status === 'pending' && (
                          <button
                            onClick={() => handleMarkPaid(p.id)}
                            className="text-xs text-green-600 hover:underline font-medium"
                          >
                            تأكيد
                          </button>
                        )}
                        {p.status === 'paid' && (
                          <>
                            <button
                              onClick={() => setShowReceiptModal(p)}
                              className="text-xs text-primary hover:underline"
                            >
                              إيصال
                            </button>
                            <button
                              onClick={() => { setShowRefundModal(p); setRefundReason(''); }}
                              className="text-xs text-red-500 hover:underline"
                            >
                              استرداد
                            </button>
                          </>
                        )}
                        {p.status === 'refunded' && (
                          <span className="text-xs text-muted-foreground">مسترد</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Record Payment Modal ── */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md border border-border" dir="rtl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">تسجيل دفعة جديدة</h2>
              <button onClick={() => setShowRecordModal(false)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">اسم المريض *</label>
                <input
                  value={recordForm.patient}
                  onChange={(e) => setRecordForm({ ...recordForm, patient: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="أدخل اسم المريض"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">رقم الهاتف</label>
                <input
                  value={recordForm.phone}
                  onChange={(e) => setRecordForm({ ...recordForm, phone: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="05xxxxxxxx"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">الخدمة</label>
                <input
                  value={recordForm.service}
                  onChange={(e) => setRecordForm({ ...recordForm, service: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="نوع الكشف / العلاج"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">المبلغ (₪) *</label>
                  <input
                    type="number"
                    value={recordForm.amount}
                    onChange={(e) => setRecordForm({ ...recordForm, amount: e.target.value })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="0"
                    min="0"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">طريقة الدفع</label>
                  <select
                    value={recordForm.method}
                    onChange={(e) => setRecordForm({ ...recordForm, method: e.target.value as PaymentMethod })}
                    className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="cash">نقدي</option>
                    <option value="card">بطاقة</option>
                    <option value="online">إلكتروني</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
              <button
                onClick={() => setShowRecordModal(false)}
                className="px-4 py-2 text-sm border border-border rounded-xl hover:bg-secondary transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleRecordPayment}
                disabled={!recordForm.patient.trim() || !recordForm.amount}
                className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                تسجيل الدفع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Refund Modal ── */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm border border-border" dir="rtl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">استرداد المبلغ</h2>
              <button onClick={() => setShowRefundModal(null)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-secondary/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المريض</span>
                  <span className="font-medium text-foreground">{showRefundModal.patient}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">المبلغ</span>
                  <span className="font-bold text-foreground">{showRefundModal.amount} ₪</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">الإيصال</span>
                  <span className="font-mono text-foreground">{showRefundModal.receiptNo}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">سبب الاسترداد *</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  placeholder="أدخل السبب..."
                />
              </div>
              <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-700 dark:text-red-300">
                ⚠️ هذا الإجراء لا يمكن التراجع عنه. سيتم استرداد المبلغ كاملاً.
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
              <button
                onClick={() => setShowRefundModal(null)}
                className="px-4 py-2 text-sm border border-border rounded-xl hover:bg-secondary transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleRefund}
                disabled={!refundReason.trim()}
                className="px-5 py-2 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                تأكيد الاسترداد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Receipt Modal ── */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-card rounded-2xl shadow-2xl w-full max-w-sm border border-border" dir="rtl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <h2 className="text-lg font-bold text-foreground">إيصال الدفع</h2>
              <button onClick={() => setShowReceiptModal(null)} className="text-muted-foreground hover:text-foreground">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              <div className="bg-secondary/30 rounded-xl p-5 space-y-3 text-sm">
                <div className="text-center mb-4">
                  <p className="text-lg font-bold text-foreground">عيادة دن كلينيك</p>
                  <p className="text-xs text-muted-foreground">رام الله - شارع الإرسال</p>
                </div>
                <div className="border-t border-dashed border-border pt-3 space-y-2">
                  <div className="flex justify-between"><span className="text-muted-foreground">رقم الإيصال</span><span className="font-mono font-bold">{showReceiptModal.receiptNo}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">التاريخ</span><span>{showReceiptModal.date}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">المريض</span><span className="font-medium">{showReceiptModal.patient}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">الخدمة</span><span>{showReceiptModal.service}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">الطبيب</span><span>{showReceiptModal.doctor}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">طريقة الدفع</span><span>{methodLabels[showReceiptModal.method]}</span></div>
                </div>
                <div className="border-t border-dashed border-border pt-3">
                  <div className="flex justify-between text-lg">
                    <span className="font-bold text-foreground">المبلغ</span>
                    <span className="font-bold text-primary">{showReceiptModal.amount} ₪</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-5 py-4 border-t border-border">
              <button
                onClick={() => setShowReceiptModal(null)}
                className="px-4 py-2 text-sm border border-border rounded-xl hover:bg-secondary transition-colors"
              >
                إغلاق
              </button>
              <button
                onClick={() => window.print()}
                className="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
              >
                طباعة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
