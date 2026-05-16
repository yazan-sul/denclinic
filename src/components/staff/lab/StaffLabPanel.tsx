'use client';

import { useCallback, useEffect, useState } from 'react';
import { SearchIcon, XIcon, CheckCircleIcon } from '@/components/Icons';
import { formatPhone } from '@/lib/format';

// ── Types ─────────────────────────────────────────────────────────────────────

type LabOrderStatus =
  | 'DRAFT' | 'SENT_TO_LAB' | 'UNDER_CONSTRUCTION'
  | 'DELAYED' | 'RECEIVED_AT_CLINIC' | 'COMPLETED_FITTED' | 'REJECTED' | 'CANCELLED';

interface LabOrderItem {
  id:          number;
  category:    string;
  workType:    string;
  toothNumbers: number[];
  material:    string | null;
  shade:       string | null;
  stumpShade:  string | null;
  notes:       string | null;
  cost:        number;
}

interface LabOrder {
  id:            string;
  clinicId:      number;
  patientId:     number;
  branchId:      number;
  labId:         number;
  status:        LabOrderStatus;
  impressionType: string;
  totalCost:     string;  // تكلفة المختبر
  patientPrice:  string;  // سعر المريض
  orderDate:     string;
  sentDate:      string | null;
  expectedDate:  string | null;
  receivedDate:  string | null;
  completedDate: string | null;
  notes:         string | null;
  parentOrder:   { id: string } | null;
  remakeOrders:  { id: string; status: string; createdAt: string }[];
  lab:     { id: number; name: string; phones: string[] };
  patient: { id: number; user: { name: string; phoneNumber: string } };
  doctor:  { id: number; user: { name: string } } | null;
  branch:  { id: number; name: string };
  items:   LabOrderItem[];
  orderAppointment:   { id: string; appointmentDate: string; appointmentTime: string } | null;
  fittingAppointment: { id: string; appointmentDate: string; appointmentTime: string } | null;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<LabOrderStatus, string> = {
  DRAFT:               'مسودة',
  SENT_TO_LAB:         'مُرسل للمختبر',
  UNDER_CONSTRUCTION:  'قيد التصنيع',
  DELAYED:             'متأخر',
  RECEIVED_AT_CLINIC:  'وصل للعيادة',
  COMPLETED_FITTED:    'مكتمل',
  REJECTED:            'مرفوض',
  CANCELLED:           'ملغي',
};

const STATUS_COLORS: Record<LabOrderStatus, string> = {
  DRAFT:               'bg-secondary text-muted-foreground',
  SENT_TO_LAB:         'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  UNDER_CONSTRUCTION:  'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
  DELAYED:             'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  RECEIVED_AT_CLINIC:  'bg-teal-100 dark:bg-teal-900/20 text-teal-700 dark:text-teal-300',
  COMPLETED_FITTED:    'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  REJECTED:            'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  CANCELLED:           'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 line-through',
};

// Next status options per status (can be multiple)
const CANCEL_ALLOWED: LabOrderStatus[] = ['DRAFT', 'SENT_TO_LAB', 'UNDER_CONSTRUCTION', 'DELAYED'];

const STATUS_ACTIONS: Partial<Record<LabOrderStatus, { status: LabOrderStatus; label: string; color: string }[]>> = {
  DRAFT: [
    { status: 'SENT_TO_LAB', label: 'إرسال للمختبر', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
  ],
  SENT_TO_LAB: [
    { status: 'UNDER_CONSTRUCTION', label: 'بدء التصنيع', color: 'bg-purple-600 hover:bg-purple-700 text-white' },
    { status: 'DELAYED',            label: 'تأخير',       color: 'bg-amber-600 hover:bg-amber-700 text-white' },
  ],
  UNDER_CONSTRUCTION: [
    { status: 'RECEIVED_AT_CLINIC', label: 'استلام',  color: 'bg-teal-600 hover:bg-teal-700 text-white' },
    { status: 'DELAYED',            label: 'تأخير',   color: 'bg-amber-600 hover:bg-amber-700 text-white' },
  ],
  DELAYED: [
    { status: 'UNDER_CONSTRUCTION', label: 'استئناف التصنيع', color: 'bg-purple-600 hover:bg-purple-700 text-white' },
    { status: 'RECEIVED_AT_CLINIC', label: 'استلام',          color: 'bg-teal-600 hover:bg-teal-700 text-white' },
  ],
  RECEIVED_AT_CLINIC: [
    { status: 'COMPLETED_FITTED', label: 'تسليم ناجح', color: 'bg-green-600 hover:bg-green-700 text-white' },
    { status: 'REJECTED',         label: 'رفض',        color: 'bg-red-600 hover:bg-red-700 text-white' },
  ],
};

const WORK_TYPE_LABELS: Record<string, string> = {
  SINGLE_CROWN:           'تاج',
  DENTAL_BRIDGE:          'جسر',
  VENEER_EMAX:            'قشرة / إيماكس',
  INLAY_ONLAY:            'حشوة مختبر',
  IMPLANT_CROWN:          'تاج زرعة',
  COMPLETE_DENTURE:       'طقم كامل (طارة)',
  PARTIAL_ACRYLIC_DENTURE:'طقم جزئي (طارة)',
  CAST_PARTIAL_DENTURE:   'طقم كروم كوبلت (طارة)',
  FLEXIBLE_DENTURE:       'طقم مرن (طارة)',
  ORTHODONTIC_RETAINER:   'ريتينر',
  NIGHT_GUARD:            'جبيرة ليلية',
  CLEAR_ALIGNERS:         'تقويم شفاف',
  STUDY_MODEL:            'موديل دراسي',
};


// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(d: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' });
}

function itemSummary(items: LabOrderItem[]) {
  return items.map(it =>
    `${WORK_TYPE_LABELS[it.workType] ?? it.workType} (${it.toothNumbers.join('، ')})`
  ).join(' · ');
}

// ── Remake Modal ──────────────────────────────────────────────────────────────

function RemakeModal({ order, onClose, onSaved }: { order: LabOrder; onClose: () => void; onSaved: () => void }) {
  const [expectedDate, setExpectedDate] = useState('');
  const [notes,        setNotes]        = useState('');
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const submit = async () => {
    setSaving(true); setError(null);
    try {
      const res  = await fetch(`/api/clinic/lab-orders/${order.id}/remake`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedDate: expectedDate || null, notes: notes || null }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'حدث خطأ');
      onSaved();
    } catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl shadow-2xl p-6" dir="rtl">
        <h3 className="font-bold text-lg mb-1">إعادة صنع</h3>
        <p className="text-sm text-muted-foreground mb-4">سيتم إنشاء طلب جديد بتكلفة 0 مرتبط بالطلب الأصلي</p>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="space-y-3 mb-4">
          <div>
            <label className="text-sm font-medium block mb-1">تاريخ التسليم المتوقع</label>
            <input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-xl bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">ملاحظات</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-border rounded-xl bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="سبب الرفض أو تعليمات خاصة..." />
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-secondary text-sm hover:bg-secondary/80 transition-colors">إلغاء</button>
          <button onClick={submit} disabled={saving}
            className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors">
            {saving ? 'جاري الإنشاء...' : 'إنشاء طلب إعادة'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Details Modal ─────────────────────────────────────────────────────────────

interface AppointmentOption {
  id: string;
  appointmentDate: string;
  appointmentTime: string;
  service: { name: string };
}

function DetailsModal({ order, onClose, onStatusChange, onEditOrder }: {
  order: LabOrder;
  onClose: () => void;
  onStatusChange: (orderId: string, status: LabOrderStatus) => Promise<void>;
  onEditOrder?: (order: LabOrder) => void;
}) {
  const [updating,          setUpdating]          = useState<LabOrderStatus | null>(null);
  const [remake,            setRemake]            = useState(false);
  const [fittingApptId,     setFittingApptId]     = useState(order.fittingAppointment?.id ?? '');
  const [appointments,      setAppointments]      = useState<AppointmentOption[]>([]);
  const [loadingAppts,      setLoadingAppts]      = useState(false);
  const [savingFitting,     setSavingFitting]     = useState(false);
  const [fittingMsg,        setFittingMsg]        = useState('');
  const [payment,           setPayment]           = useState<{ id: string; amount: number; status: string } | null>(null);
  const [markingPaid,       setMarkingPaid]       = useState(false);
  const [paymentMsg,        setPaymentMsg]        = useState('');

  const actions = STATUS_ACTIONS[order.status] ?? [];

  useEffect(() => {
    if (order.status !== 'RECEIVED_AT_CLINIC') return;
    setLoadingAppts(true);
    const params = new URLSearchParams({
      patientId: String(order.patientId),
      clinicId:  String(order.clinicId),
      branchId:  String(order.branchId),
      activeRole: 'STAFF',
      pageSize:  '50',
    });
    fetch(`/api/clinic/records?${params}`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success) setAppointments(j.data ?? []); })
      .catch(() => {})
      .finally(() => setLoadingAppts(false));
  }, [order.status, order.patientId, order.clinicId, order.branchId]);

  useEffect(() => {
    if (order.status !== 'RECEIVED_AT_CLINIC' && order.status !== 'COMPLETED_FITTED') return;
    fetch(`/api/staff/payments?labOrderId=${order.id}&pageSize=1`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => {
        const p = j.data?.payments?.[0];
        if (p) setPayment({ id: p.id, amount: Number(p.amount), status: p.status });
      })
      .catch(() => {});
  }, [order.id, order.status]);

  const advance = async (status: LabOrderStatus) => {
    setUpdating(status);
    await onStatusChange(order.id, status);
    setUpdating(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto" dir="rtl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <h3 className="font-bold text-lg">{order.patient.user.name}</h3>
            <p className="text-xs text-muted-foreground">{order.lab.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[order.status]}`}>
              {STATUS_LABELS[order.status]}
            </span>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
              <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">

          {/* Info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 text-sm">
            {[
              ['المريض',   order.patient.user.name],
              ['الهاتف',   formatPhone(order.patient.user.phoneNumber)],
              ['المختبر',  order.lab.name],
              ['الفرع',    order.branch.name],
              ['الطبيب',   order.doctor?.user.name ?? '—'],
              ['البصمة',   order.impressionType === 'PHYSICAL' ? 'مادية' : 'رقمية'],
              ['التسليم المتوقع', formatDate(order.expectedDate)],
            ].map(([label, value]) => (
              <div key={label} className="bg-secondary/30 rounded-lg px-3 py-2">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-medium text-sm">{value}</p>
              </div>
            ))}
          </div>

          {/* Cost summary */}
          {(() => {
            const labCost      = parseFloat(order.totalCost)   || 0;
            const patientPrice = parseFloat(order.patientPrice) || 0;
            const profit       = patientPrice - labCost;
            return (
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-secondary/40 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-muted-foreground mb-1">تكلفة المختبر</p>
                  <p className="font-bold text-sm font-mono">{labCost.toLocaleString()} ₪</p>
                </div>
                <div className="bg-primary/10 rounded-xl px-3 py-2.5">
                  <p className="text-[10px] text-muted-foreground mb-1">سعر المريض</p>
                  <p className="font-bold text-sm font-mono text-primary">{patientPrice.toLocaleString()} ₪</p>
                </div>
                <div className={`rounded-xl px-3 py-2.5 ${profit >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  <p className="text-[10px] text-muted-foreground mb-1">الربح الصافي</p>
                  <p className={`font-bold text-sm font-mono ${profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                    {profit.toLocaleString()} ₪
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Payment status */}
          {payment && (
            <div className={`rounded-xl px-3 py-3 border flex items-center justify-between gap-3 ${
              payment.status === 'COMPLETED'
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800'
            }`}>
              <div>
                <p className="text-xs font-medium text-muted-foreground">دفعة المريض</p>
                <p className="font-bold text-sm font-mono mt-0.5">{payment.amount.toLocaleString()} ₪</p>
                <p className={`text-xs font-medium mt-0.5 ${payment.status === 'COMPLETED' ? 'text-green-600 dark:text-green-400' : 'text-orange-600 dark:text-orange-400'}`}>
                  {payment.status === 'COMPLETED' ? '✓ مدفوعة' : '● بانتظار التحصيل'}
                </p>
              </div>
              {payment.status === 'PENDING' && (
                <button
                  onClick={async () => {
                    setMarkingPaid(true);
                    try {
                      const res  = await fetch(`/api/payments/${payment.id}/mark-paid`, { method: 'POST', credentials: 'include' });
                      const json = await res.json();
                      if (!json.success) throw new Error(json.error?.message || 'حدث خطأ');
                      setPayment(p => p ? { ...p, status: 'COMPLETED' } : p);
                      setPaymentMsg('تم التحصيل');
                    } catch (e: any) { setPaymentMsg(e.message); }
                    finally { setMarkingPaid(false); setTimeout(() => setPaymentMsg(''), 3000); }
                  }}
                  disabled={markingPaid}
                  className="px-3 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
                >
                  {markingPaid ? '...' : paymentMsg || 'تحصيل'}
                </button>
              )}
              {paymentMsg && payment.status === 'COMPLETED' && (
                <span className="text-xs text-green-600 font-medium">{paymentMsg}</span>
              )}
            </div>
          )}

          {/* Dates timeline */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">التواريخ</p>
            <div className="space-y-1 text-sm">
              {([
                ['تاريخ الطلب',    order.orderDate],
                ['تاريخ الإرسال',  order.sentDate],
                ['تاريخ الاستلام', order.receivedDate],
                ['موعد التركيب',   order.fittingAppointment?.appointmentDate ?? null],
                ['تاريخ الإكمال',  order.completedDate],
              ] as [string, string | null][]).map(([label, date]) => date && (
                <div key={label} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span dir="ltr" className="text-xs">
                    {formatDate(date)}
                    {label === 'موعد التركيب' && order.fittingAppointment?.appointmentTime && (
                      <span className="mr-1 text-teal-600 dark:text-teal-400">
                        {order.fittingAppointment.appointmentTime}
                      </span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Items */}
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">العناصر ({order.items.length})</p>
            <div className="space-y-2">
              {order.items.map(item => (
                <div key={item.id} className="bg-secondary/30 rounded-xl px-3 py-2.5 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium">{WORK_TYPE_LABELS[item.workType] ?? item.workType}</span>
                    <span className="text-xs text-muted-foreground font-mono">
                      {item.toothNumbers.join('، ')}
                    </span>
                  </div>
                  <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                    {item.material  && <span>المادة: {item.material}</span>}
                    {item.shade     && <span>اللون: {item.shade}</span>}
                    {item.stumpShade && <span>Stump: {item.stumpShade}</span>}
                    {item.notes     && <span className="text-foreground/70">{item.notes}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-3 py-2.5 text-sm">
              <span className="font-medium">ملاحظات: </span>{order.notes}
            </div>
          )}

          {/* Fitting appointment — shown when received or already set */}
          {(order.status === 'RECEIVED_AT_CLINIC' || order.fittingAppointment) && (
            <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-xl px-3 py-3 space-y-2">
              <p className="text-xs font-medium text-teal-700 dark:text-teal-300">
                موعد التركيب
              </p>
              {order.fittingAppointment && fittingApptId === order.fittingAppointment.id ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-teal-800 dark:text-teal-200 font-medium">
                    {new Date(order.fittingAppointment.appointmentDate).toLocaleDateString('ar', { year: 'numeric', month: 'short', day: 'numeric' })}
                    {order.fittingAppointment.appointmentTime && ` — ${order.fittingAppointment.appointmentTime}`}
                  </span>
                  {order.status === 'RECEIVED_AT_CLINIC' && (
                    <button
                      onClick={() => setFittingApptId('')}
                      className="text-xs text-teal-600 hover:underline"
                    >
                      تغيير
                    </button>
                  )}
                </div>
              ) : order.status === 'RECEIVED_AT_CLINIC' ? (
                <div className="flex gap-2">
                  <select
                    value={fittingApptId}
                    onChange={e => setFittingApptId(e.target.value)}
                    disabled={loadingAppts}
                    className="flex-1 px-2 py-1.5 border border-border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="">{loadingAppts ? 'جاري التحميل...' : '— اختر موعداً —'}</option>
                    {appointments.map(a => (
                      <option key={a.id} value={a.id}>
                        {new Date(a.appointmentDate).toLocaleDateString('ar', { month: 'short', day: 'numeric' })}
                        {a.appointmentTime ? ` ${a.appointmentTime}` : ''}
                        {a.service?.name ? ` — ${a.service.name}` : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={async () => {
                      if (!fittingApptId) return;
                      setSavingFitting(true);
                      try {
                        await fetch(`/api/clinic/lab-orders/${order.id}`, {
                          method: 'PATCH', credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ fittingAppointmentId: fittingApptId }),
                        });
                        setFittingMsg('تم');
                        setTimeout(() => setFittingMsg(''), 2000);
                      } finally { setSavingFitting(false); }
                    }}
                    disabled={!fittingApptId || savingFitting}
                    className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-xs font-medium disabled:opacity-40 hover:bg-teal-700 transition-colors whitespace-nowrap"
                  >
                    {savingFitting ? '...' : fittingMsg || 'حفظ'}
                  </button>
                </div>
              ) : null}
            </div>
          )}

          {/* History / remake chain */}
          {(order.parentOrder || (order.remakeOrders?.length ?? 0) > 0) && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground">سجل الطلب</p>
              {order.parentOrder && (
                <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2.5 text-xs">
                  <span className="text-lg leading-none">↩</span>
                  <div>
                    <p className="font-medium text-amber-700 dark:text-amber-300">إعادة صنع من طلب مرفوض</p>
                    <p className="text-amber-600/70 dark:text-amber-400/70 font-mono mt-0.5">
                      الطلب الأصلي: #{order.parentOrder.id.slice(-6).toUpperCase()}
                    </p>
                  </div>
                </div>
              )}
              {(order.remakeOrders?.length ?? 0) > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] text-muted-foreground px-1">طلبات إعادة الصنع ({order.remakeOrders!.length})</p>
                  {order.remakeOrders!.map((r, i) => (
                    <div key={r.id} className="flex items-center justify-between bg-secondary/40 border border-border rounded-lg px-3 py-2 text-xs gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-muted-foreground shrink-0">#{i + 1}</span>
                        <span className="font-mono text-muted-foreground truncate">#{r.id.slice(-6).toUpperCase()}</span>
                        <span className="text-muted-foreground/60 shrink-0">
                          {new Date(r.createdAt).toLocaleDateString('ar', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[r.status as LabOrderStatus] ?? ''}`}>
                        {STATUS_LABELS[r.status as LabOrderStatus] ?? r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {(actions.length > 0 || order.status === 'REJECTED' || CANCEL_ALLOWED.includes(order.status)) && (
          <div className="flex flex-wrap gap-2 px-5 py-4 border-t border-border sticky bottom-0 bg-card">
            {/* Edit button — DRAFT only */}
            {order.status === 'DRAFT' && onEditOrder && (
              <button
                onClick={() => { onEditOrder(order); onClose(); }}
                className="flex-1 py-2 rounded-xl text-sm font-semibold bg-secondary hover:bg-secondary/80 transition-colors border border-border"
              >
                ✎ تعديل الطلب
              </button>
            )}
            {actions.map(action => (
              <button
                key={action.status}
                onClick={() => advance(action.status)}
                disabled={!!updating}
                className={`flex-1 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors ${action.color}`}
              >
                {updating === action.status ? '...' : action.label}
              </button>
            ))}
            {order.status === 'REJECTED' && (
              <button
                onClick={() => setRemake(true)}
                className="flex-1 py-2 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                إعادة صنع
              </button>
            )}
            {/* Cancel button */}
            {CANCEL_ALLOWED.includes(order.status) && (
              <button
                onClick={() => advance('CANCELLED')}
                disabled={!!updating}
                className="w-full py-2 rounded-xl text-sm font-semibold border border-gray-300 dark:border-gray-700 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
              >
                {updating === 'CANCELLED' ? '...' : '✕ إلغاء الطلب'}
              </button>
            )}
          </div>
        )}
      </div>

      {remake && (
        <RemakeModal
          order={order}
          onClose={() => setRemake(false)}
          onSaved={() => { setRemake(false); onClose(); }}
        />
      )}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

interface StaffLabPanelProps {
  actionButton?: React.ReactNode;
  onEditOrder?:  (order: LabOrder) => void;
  refreshKey?:   number;
}

export default function StaffLabPanel({ actionButton, onEditOrder, refreshKey }: StaffLabPanelProps = {}) {
  const [orders,      setOrders]      = useState<LabOrder[]>([]);
  const [isLoading,   setIsLoading]   = useState(true);
  const [error,       setError]       = useState<string | null>(null);
  const [page,        setPage]        = useState(1);
  const [totalPages,  setTotalPages]  = useState(1);
  const [total,       setTotal]       = useState(0);

  const [statusTab,   setStatusTab]   = useState<LabOrderStatus | 'ALL'>('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [search,      setSearch]      = useState('');
  const [sortBy,         setSortBy]         = useState<'orderDate'|'expectedDate'>('orderDate');
  const [sortDir,        setSortDir]        = useState<'asc'|'desc'>('asc');
  const [labFilter,      setLabFilter]      = useState('');
  const [branchFilter,   setBranchFilter]   = useState('');
  const [fromDate,       setFromDate]       = useState('');
  const [toDate,         setToDate]         = useState('');
  const [expectedFrom,   setExpectedFrom]   = useState('');
  const [expectedTo,     setExpectedTo]     = useState('');
  const [labs,           setLabs]           = useState<{id:number;name:string}[]>([]);
  const [clinics,        setClinics]        = useState<{id:number;name:string}[]>([]);
  const [branches,       setBranches]       = useState<{id:number;name:string}[]>([]);
  const [clinicFilter,   setClinicFilter]   = useState('');

  const [viewOrder,   setViewOrder]   = useState<LabOrder | null>(null);
  const [updatingId,  setUpdatingId]  = useState<string | null>(null);
  const [successMsg,  setSuccessMsg]  = useState('');

  // Load clinics + labs on mount
  useEffect(() => {
    fetch('/api/doctor/clinics', { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success) setClinics(j.data ?? []); })
      .catch(() => {});
    fetch('/api/clinic/labs?includeInactive=false', { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success) setLabs(j.data ?? []); })
      .catch(() => {});
  }, []);

  // Load branches when clinic filter changes
  useEffect(() => {
    if (!clinicFilter) { setBranches([]); setBranchFilter(''); return; }
    fetch(`/api/clinic/branches?clinicId=${clinicFilter}`, { credentials: 'include' })
      .then(r => r.json())
      .then(j => { if (j.success) setBranches(j.data ?? []); })
      .catch(() => {});
    setBranchFilter('');
  }, [clinicFilter]);

  // Debounce search
  useEffect(() => {
    const t = window.setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

  const hasFilters = labFilter || branchFilter || clinicFilter || fromDate || toDate || expectedFrom || expectedTo || search || statusTab !== 'ALL';

  const clearFilters = () => {
    setLabFilter(''); setBranchFilter(''); setClinicFilter('');
    setFromDate(''); setToDate(''); setExpectedFrom(''); setExpectedTo('');
    setSearch(''); setSearchInput(''); setStatusTab('ALL'); setPage(1);
  };

  const fetchOrders = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '15', sortBy, sortDir });
      if (statusTab !== 'ALL') params.set('status', statusTab);
      if (search)              params.set('search', search);
      if (labFilter)           params.set('labId',        labFilter);
      if (branchFilter)        params.set('branchId',     branchFilter);
      if (fromDate)            params.set('from',         fromDate);
      if (toDate)              params.set('to',           toDate);
      if (expectedFrom)        params.set('expectedFrom', expectedFrom);
      if (expectedTo)          params.set('expectedTo',   expectedTo);
      const res  = await fetch(`/api/clinic/lab-orders?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'تعذر التحميل');
      setOrders(json.data);
      setTotalPages(json.pagination.pages);
      setTotal(json.pagination.total);
    } catch (e: any) { setError(e.message); }
    finally { setIsLoading(false); }
  }, [page, statusTab, search, labFilter, branchFilter, fromDate, toDate, expectedFrom, expectedTo, sortBy, sortDir, refreshKey]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const deleteOrder = async (orderId: string) => {
    if (!confirm('هل تريد حذف هذا الطلب؟')) return;
    try {
      const res  = await fetch(`/api/clinic/lab-orders/${orderId}`, { method: 'DELETE', credentials: 'include' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'حدث خطأ');
      setOrders(prev => prev.filter(o => o.id !== orderId));
      showSuccess('تم حذف الطلب');
    } catch (e: any) { setError(e.message); }
  };

  const changeStatus = async (orderId: string, status: LabOrderStatus) => {
    setUpdatingId(orderId);
    try {
      const res  = await fetch(`/api/clinic/lab-orders/${orderId}`, {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'حدث خطأ');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      showSuccess(`تم تحديث الحالة إلى: ${STATUS_LABELS[status]}`);
    } catch (e: any) { setError(e.message); }
    finally { setUpdatingId(null); }
  };

  const isOverdue = (order: LabOrder) =>
    order.expectedDate &&
    new Date(order.expectedDate) < new Date() &&
    !['COMPLETED_FITTED', 'REJECTED'].includes(order.status);

  return (
    <div className="space-y-4" dir="rtl">

      {/* Success toast */}
      {successMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4" /> {successMsg}
        </div>
      )}


      {/* Search + count + optional action */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[160px]">
          <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="بحث باسم المريض أو المختبر..."
            className="w-full pr-9 pl-4 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        {!isLoading && (
          <span className="text-sm text-muted-foreground whitespace-nowrap">{total} طلب</span>
        )}
        {actionButton && <div className="mr-auto">{actionButton}</div>}
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-3 space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-9 gap-2">

          {/* Status */}
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">حالة الطلب</label>
            <select value={statusTab} onChange={e => { setStatusTab(e.target.value as LabOrderStatus | 'ALL'); setPage(1); }}
              className="w-full px-2 py-2 border border-border rounded-xl bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="ALL">الكل</option>
              {(Object.entries(STATUS_LABELS) as [LabOrderStatus, string][]).map(([v, l]) => (
                <option key={v} value={v}>{l}</option>
              ))}
            </select>
          </div>

          {/* Clinic */}
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">العيادة</label>
            <select value={clinicFilter} onChange={e => { setClinicFilter(e.target.value); setPage(1); }}
              className="w-full px-2 py-2 border border-border rounded-xl bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">الكل</option>
              {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Branch */}
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">الفرع</label>
            <select value={branchFilter} onChange={e => { setBranchFilter(e.target.value); setPage(1); }}
              disabled={!clinicFilter}
              className="w-full px-2 py-2 border border-border rounded-xl bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-40">
              <option value="">الكل</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Lab */}
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">المختبر</label>
            <select value={labFilter} onChange={e => { setLabFilter(e.target.value); setPage(1); }}
              className="w-full px-2 py-2 border border-border rounded-xl bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">الكل</option>
              {labs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>

          {/* Order date from/to */}
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">تاريخ الطلب — من</label>
            <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }}
              className="w-full px-2 py-2 border border-border rounded-xl bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">تاريخ الطلب — إلى</label>
            <input type="date" value={toDate} min={fromDate} onChange={e => { setToDate(e.target.value); setPage(1); }}
              className="w-full px-2 py-2 border border-border rounded-xl bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          {/* Sort */}
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">الترتيب حسب</label>
            <select value={sortBy} onChange={e => { setSortBy(e.target.value as 'orderDate'|'expectedDate'); setPage(1); }}
              className="w-full px-2 py-2 border border-border rounded-xl bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="orderDate">تاريخ الإنشاء</option>
              <option value="expectedDate">تاريخ التسليم</option>
            </select>
          </div>

          {/* Sort direction */}
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">الاتجاه</label>
            <button onClick={() => { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); setPage(1); }}
              className="w-full py-2 rounded-xl border border-border bg-background text-xs hover:bg-secondary transition-colors">
              {sortDir === 'asc' ? '↑ الأقرب أولاً' : '↓ الأبعد أولاً'}
            </button>
          </div>

          {/* Clear */}
          <div className="flex items-end">
            <button onClick={clearFilters} disabled={!hasFilters}
              className="w-full py-2 rounded-xl border border-border text-xs text-muted-foreground hover:bg-secondary disabled:opacity-40 transition-colors">
              تنظيف
            </button>
          </div>
        </div>

        {/* Expected delivery date row */}
        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border/50">
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">تاريخ التسليم المتوقع — من</label>
            <input type="date" value={expectedFrom} onChange={e => { setExpectedFrom(e.target.value); setPage(1); }}
              className="w-full px-2 py-2 border border-border rounded-xl bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">تاريخ التسليم المتوقع — إلى</label>
            <input type="date" value={expectedTo} min={expectedFrom} onChange={e => { setExpectedTo(e.target.value); setPage(1); }}
              className="w-full px-2 py-2 border border-border rounded-xl bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {/* Orders list */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-28 bg-card border border-border rounded-xl animate-pulse" />
          ))
        ) : orders.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground bg-card border border-border rounded-xl">
            <p className="text-4xl mb-3">🔬</p>
            <p className="font-medium">لا توجد طلبات</p>
            <p className="text-sm mt-1">يمكن إنشاء طلبات من صفحة الموعد</p>
          </div>
        ) : (
          orders.map(order => {
            const actions    = STATUS_ACTIONS[order.status] ?? [];
            const overdue    = isOverdue(order);
            const isUpdating = updatingId === order.id;

            return (
              <div
                key={order.id}
                className={`bg-card border rounded-xl p-3 md:p-4 transition-all hover:shadow-md ${
                  overdue ? 'border-amber-300 dark:border-amber-700' : 'border-border'
                }`}
              >
                {/* Info */}
                <div className="space-y-1.5 mb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="font-semibold text-sm md:text-base">{order.patient.user.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${STATUS_COLORS[order.status]}`}>
                        {STATUS_LABELS[order.status]}
                      </span>
                      {overdue && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 font-medium flex-shrink-0">
                          ⚠ متأخر
                        </span>
                      )}
                    </div>
                    {order.parentOrder && (
                      <span className="text-xs text-muted-foreground flex-shrink-0">إعادة صنع</span>
                    )}
                  </div>

                  <p className="text-xs md:text-sm text-muted-foreground">
                    {order.lab.name}
                    {order.doctor && <span className="hidden sm:inline"> · {order.doctor.user.name}</span>}
                  </p>

                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {itemSummary(order.items)}
                  </p>

                  <div className="flex gap-3 md:gap-4 text-xs text-muted-foreground flex-wrap">
                    <span>الطلب: {formatDate(order.orderDate)}</span>
                    {order.expectedDate && (
                      <span className={overdue ? 'text-amber-600 dark:text-amber-400 font-medium' : ''}>
                        التسليم: {formatDate(order.expectedDate)}
                      </span>
                    )}
                    <span>{parseFloat(order.totalCost).toFixed(0)} ₪</span>
                  </div>
                </div>

                {/* Actions row — full width on mobile */}
                <div className="flex gap-2 pt-2 border-t border-border/50">
                  <button
                    onClick={() => setViewOrder(order)}
                    className="flex-1 py-2 rounded-lg bg-secondary text-xs font-medium hover:bg-secondary/80 transition-colors"
                  >
                    تفاصيل
                  </button>
                  {actions.slice(0, 1).map(action => (
                    <button
                      key={action.status}
                      onClick={() => changeStatus(order.id, action.status)}
                      disabled={isUpdating}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors ${action.color}`}
                    >
                      {isUpdating ? '...' : action.label}
                    </button>
                  ))}
                  {order.status === 'DRAFT' && (
                    <button
                      onClick={() => deleteOrder(order.id)}
                      className="px-3 py-2 rounded-lg border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      حذف
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            className="px-4 py-2 rounded-lg bg-secondary disabled:opacity-50 text-sm">السابق</button>
          <span className="text-sm text-muted-foreground">صفحة {page} من {totalPages}</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            className="px-4 py-2 rounded-lg bg-secondary disabled:opacity-50 text-sm">التالي</button>
        </div>
      )}

      {/* Details Modal */}
      {viewOrder && (
        <DetailsModal
          order={viewOrder}
          onClose={() => { setViewOrder(null); fetchOrders(); }}
          onStatusChange={changeStatus}
          onEditOrder={onEditOrder}
        />
      )}
    </div>
  );
}
