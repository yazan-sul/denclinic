'use client';

import { useState } from 'react';
import { useBranchScope } from '@/hook/useBranchScope';

type PlanTier = 'basic' | 'professional' | 'enterprise';
type SubStatus = 'active' | 'expired' | 'cancelled' | 'trial';

interface Plan {
  id: PlanTier;
  name: string;
  price: number;
  period: 'monthly' | 'yearly';
  features: string[];
  maxBranches: number;
  maxDoctors: number;
  maxStaff: number;
  color: string;
  recommended?: boolean;
}

interface Invoice {
  id: number;
  date: string;
  amount: number;
  status: 'paid' | 'pending' | 'failed';
  plan: string;
}

interface Subscription {
  id: number;
  clinicName: string;
  plan: PlanTier;
  status: SubStatus;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  branchesUsed: number;
  doctorsUsed: number;
  staffUsed: number;
  invoices: Invoice[];
}

const plans: Plan[] = [
  {
    id: 'basic',
    name: 'الأساسي',
    price: 49,
    period: 'monthly',
    maxBranches: 1,
    maxDoctors: 2,
    maxStaff: 3,
    color: 'blue',
    features: ['فرع واحد', 'حتى 2 أطباء', 'حتى 3 موظفين', 'إدارة المواعيد', 'تقارير أساسية'],
  },
  {
    id: 'professional',
    name: 'الاحترافي',
    price: 99,
    period: 'monthly',
    maxBranches: 3,
    maxDoctors: 8,
    maxStaff: 10,
    color: 'primary',
    recommended: true,
    features: ['حتى 3 فروع', 'حتى 8 أطباء', 'حتى 10 موظفين', 'إدارة المواعيد', 'تقارير متقدمة', 'إدارة السجلات الطبية', 'دعم فني مميز'],
  },
  {
    id: 'enterprise',
    name: 'المؤسسي',
    price: 199,
    period: 'monthly',
    maxBranches: 10,
    maxDoctors: 30,
    maxStaff: 50,
    color: 'purple',
    features: ['حتى 10 فروع', 'حتى 30 طبيب', 'حتى 50 موظف', 'جميع الميزات', 'تخصيص كامل', 'مدير حساب مخصص', 'SLA مضمون'],
  },
];

const mockSubscription: Subscription = {
  id: 1,
  clinicName: 'عيادة دن كلينيك',
  plan: 'professional',
  status: 'active',
  startDate: '2026-01-01',
  endDate: '2026-12-31',
  autoRenew: true,
  branchesUsed: 3,
  doctorsUsed: 4,
  staffUsed: 4,
  invoices: [
    { id: 1, date: '2026-04-01', amount: 99, status: 'paid', plan: 'الاحترافي' },
    { id: 2, date: '2026-03-01', amount: 99, status: 'paid', plan: 'الاحترافي' },
    { id: 3, date: '2026-02-01', amount: 99, status: 'paid', plan: 'الاحترافي' },
    { id: 4, date: '2026-01-01', amount: 99, status: 'paid', plan: 'الاحترافي' },
    { id: 5, date: '2025-12-01', amount: 79, status: 'paid', plan: 'الأساسي' },
    { id: 6, date: '2025-11-01', amount: 79, status: 'failed', plan: 'الأساسي' },
  ],
};

const statusConfig: Record<SubStatus, { label: string; className: string }> = {
  active:    { label: 'نشط',       className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  trial:     { label: 'تجريبي',    className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  expired:   { label: 'منتهي',     className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  cancelled: { label: 'ملغي',      className: 'bg-secondary text-muted-foreground' },
};

const invoiceStatusConfig = {
  paid:    { label: 'مدفوع', className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  pending: { label: 'معلق',  className: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300' },
  failed:  { label: 'فشل',   className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
};

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function UsageBar({ used, max, color }: { used: number; max: number; color: string }) {
  const pct = Math.min((used / max) * 100, 100);
  const colorClass = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : `bg-${color}-500`;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{used} / {max}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function SubscriptionsPanel() {
  const [sub, setSub] = useState<Subscription>(mockSubscription);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>(sub.plan);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [showInvoices, setShowInvoices] = useState(false);
  const branchScope = useBranchScope();

  const currentPlan = plans.find((p) => p.id === sub.plan)!;
  const daysLeft = daysUntil(sub.endDate);
  const isExpiringSoon = daysLeft <= 30 && daysLeft > 0;

  // Limited read-only view for BRANCH_MANAGER
  if (branchScope) {
    return (
      <div className="space-y-5" dir="rtl">
        {/* Branch context */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-primary/10 border border-primary/20 rounded-xl text-sm text-primary">
          <span>🏥</span>
          <span>معلومات الاشتراك لفرع: <strong>{branchScope.branchName}</strong></span>
        </div>

        {/* Expiry warning */}
        {isExpiringSoon && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300 text-sm">
            <span className="text-xl">⚠️</span>
            <span>اشتراك العيادة سينتهي خلال <strong>{daysLeft} يوم</strong>. تواصل مع الإدارة للتجديد.</span>
          </div>
        )}

        {/* Status card */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-bold text-foreground">خطة {currentPlan.name}</h2>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusConfig[sub.status].className}`}>
              {statusConfig[sub.status].label}
            </span>
          </div>

          {/* Days remaining - prominent */}
          <div className="flex items-center gap-4 p-4 bg-secondary/40 rounded-xl mb-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex flex-col items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-primary leading-none">{daysLeft > 0 ? daysLeft : 0}</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">يوم</span>
            </div>
            <div>
              <p className="font-semibold text-foreground">متبقي على انتهاء الاشتراك</p>
              <p className="text-sm text-muted-foreground">تاريخ الانتهاء: {sub.endDate}</p>
            </div>
          </div>

          {/* Features */}
          <h3 className="font-semibold text-foreground mb-3">ما يشمله الاشتراك</h3>
          <div className="grid grid-cols-2 gap-2">
            {currentPlan.features.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm text-foreground">
                <span className="text-green-500 flex-shrink-0">✓</span>
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const handleUpgrade = () => {
    setSub((p) => ({ ...p, plan: selectedPlan }));
    setShowUpgradeModal(false);
  };

  return (
    <div className="space-y-6" dir="rtl">

      {/* Expiry warning */}
      {isExpiringSoon && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-700 dark:text-amber-300 text-sm">
          <span className="text-xl">⚠️</span>
          <span>اشتراكك سينتهي خلال <strong>{daysLeft} يوم</strong>. قم بالتجديد لتجنب انقطاع الخدمة.</span>
          <button
            onClick={() => setShowUpgradeModal(true)}
            className="mr-auto px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-semibold hover:bg-amber-700 transition-colors"
          >
            تجديد الآن
          </button>
        </div>
      )}

      {/* Current subscription card */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-foreground">خطة {currentPlan.name}</h2>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusConfig[sub.status].className}`}>
                {statusConfig[sub.status].label}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {sub.startDate} — {sub.endDate} · {daysLeft > 0 ? `متبقي ${daysLeft} يوم` : 'منتهي'}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-3xl font-bold text-foreground">${currentPlan.price}</span>
              <span className="text-sm text-muted-foreground">/ شهر</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSub((p) => ({ ...p, autoRenew: !p.autoRenew }))}
              className={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                sub.autoRenew
                  ? 'border-green-300 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                  : 'border-border text-muted-foreground hover:bg-secondary'
              }`}
            >
              {sub.autoRenew ? '✓ تجديد تلقائي' : 'تفعيل التجديد التلقائي'}
            </button>
            <button
              onClick={() => { setSelectedPlan(sub.plan); setShowUpgradeModal(true); }}
              className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              تغيير الخطة
            </button>
          </div>
        </div>

        {/* Usage */}
        <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">الفروع</p>
            <UsageBar used={sub.branchesUsed} max={currentPlan.maxBranches} color="primary" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">الأطباء</p>
            <UsageBar used={sub.doctorsUsed} max={currentPlan.maxDoctors} color="purple" />
          </div>
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">الموظفون</p>
            <UsageBar used={sub.staffUsed} max={currentPlan.maxStaff} color="blue" />
          </div>
        </div>
      </div>

      {/* Features included */}
      <div className="bg-card border border-border rounded-xl p-5">
        <h3 className="font-semibold text-foreground mb-3">ما يشمله اشتراكك</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {currentPlan.features.map((f) => (
            <div key={f} className="flex items-center gap-2 text-sm text-foreground">
              <span className="text-green-500 flex-shrink-0">✓</span>
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowInvoices((p) => !p)}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/40 transition-colors"
        >
          <span className="font-semibold text-foreground">سجل الفواتير</span>
          <span className="text-muted-foreground text-sm">{showInvoices ? '▲' : '▼'} {sub.invoices.length} فاتورة</span>
        </button>
        {showInvoices && (
          <div className="border-t border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="text-right px-4 py-2.5 font-semibold text-foreground">التاريخ</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-foreground">الخطة</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-foreground">المبلغ</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-foreground">الحالة</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {sub.invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border/50 hover:bg-secondary/20">
                    <td className="px-4 py-3 text-muted-foreground" dir="ltr">{inv.date}</td>
                    <td className="px-4 py-3 text-foreground">{inv.plan}</td>
                    <td className="px-4 py-3 font-medium text-foreground" dir="ltr">${inv.amount}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${invoiceStatusConfig[inv.status].className}`}>
                        {invoiceStatusConfig[inv.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-xs text-primary hover:underline">تنزيل</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upgrade / Change Plan Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
            <div className="flex items-center justify-between p-6 pb-4 sticky top-0 bg-card border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">تغيير خطة الاشتراك</h2>
                <p className="text-sm text-muted-foreground mt-0.5">اختر الخطة المناسبة لعيادتك</p>
              </div>
              <button onClick={() => setShowUpgradeModal(false)} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
            </div>

            {/* Billing toggle */}
            <div className="flex justify-center gap-1 p-6 pb-4">
              <div className="flex bg-secondary rounded-xl p-1 gap-1">
                {(['monthly', 'yearly'] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setBillingCycle(c)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      billingCycle === c ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {c === 'monthly' ? 'شهري' : 'سنوي'}
                    {c === 'yearly' && <span className="mr-1.5 text-xs text-green-600 font-bold">وفّر 20%</span>}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6 pb-6">
              {plans.map((plan) => {
                const price = billingCycle === 'yearly' ? Math.round(plan.price * 0.8) : plan.price;
                const isCurrent = plan.id === sub.plan;
                const isSelected = plan.id === selectedPlan;
                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all ${
                      isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                    }`}
                  >
                    {plan.recommended && (
                      <div className="absolute -top-3 right-1/2 translate-x-1/2 px-3 py-0.5 bg-primary text-white text-xs font-semibold rounded-full whitespace-nowrap">
                        الأكثر شيوعاً
                      </div>
                    )}
                    {isCurrent && (
                      <div className="absolute -top-3 left-3 px-2 py-0.5 bg-green-500 text-white text-xs font-semibold rounded-full">
                        الحالية
                      </div>
                    )}
                    <h3 className="font-bold text-foreground">{plan.name}</h3>
                    <div className="flex items-baseline gap-1 mt-1 mb-3">
                      <span className="text-2xl font-bold text-foreground">${price}</span>
                      <span className="text-xs text-muted-foreground">/{billingCycle === 'monthly' ? 'شهر' : 'سنة'}</span>
                    </div>
                    <ul className="space-y-1.5">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                          <span className="text-green-500 mt-0.5">✓</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    {isSelected && (
                      <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-primary font-medium">
                        <span>●</span> محدد
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 px-6 pb-6">
              <button onClick={() => setShowUpgradeModal(false)}
                className="flex-1 py-2.5 border border-border rounded-xl text-sm font-medium hover:bg-secondary transition-colors">
                إلغاء
              </button>
              <button
                onClick={handleUpgrade}
                disabled={selectedPlan === sub.plan}
                className="flex-1 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {selectedPlan === sub.plan ? 'هذه خطتك الحالية' : `الترقية إلى ${plans.find(p => p.id === selectedPlan)?.name}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
