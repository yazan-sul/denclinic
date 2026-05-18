'use client';

import { useState, useEffect } from 'react';

type SubStatus = 'active' | 'expired' | 'cancelled' | 'trial';

interface Plan {
  tier: string;
  name: string;
  monthlyPrice: number;
  maxBranches: number;
  maxDoctors: number;
  maxStaff: number;
  features: string[];
}

interface Subscription {
  id: number;
  clinicName: string;
  plan: Plan;
  status: SubStatus;
  startDate: string;
  endDate: string;
  autoRenew: boolean;
  branchesUsed: number;
  doctorsUsed: number;
  staffUsed: number;
}

const statusConfig: Record<SubStatus, { label: string; className: string }> = {
  active:    { label: 'نشط',    className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  trial:     { label: 'تجريبي', className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  expired:   { label: 'منتهي',  className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
  cancelled: { label: 'ملغي',   className: 'bg-secondary text-muted-foreground' },
};

const tierConfig: Record<string, { gradient: string; icon: string; barColor: string }> = {
  BASIC:        { gradient: 'from-blue-500 to-blue-600',     icon: '⭐', barColor: 'bg-blue-500'   },
  PROFESSIONAL: { gradient: 'from-indigo-500 to-indigo-600', icon: '💎', barColor: 'bg-indigo-500' },
  ENTERPRISE:   { gradient: 'from-purple-600 to-purple-700', icon: '🏆', barColor: 'bg-purple-600' },
};

function daysUntil(dateStr: string) {
  const diff = new Date(dateStr).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function subscriptionProgress(startDate: string, endDate: string) {
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const elapsed = Date.now() - start;
  return Math.min(Math.max((elapsed / (end - start)) * 100, 0), 100);
}

export default function SubscriptionsPanel() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/subscriptions', { credentials: 'include' });
        if (!res.ok) throw new Error('فشل تحميل بيانات الاشتراك');
        const json = await res.json();
        setSub(json.data);
      } catch {
        setError('تعذّر تحميل بيانات الاشتراك');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">جارٍ التحميل...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3" dir="rtl">
        <p className="text-4xl">⚠️</p>
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3" dir="rtl">
        <p className="text-5xl">📋</p>
        <p className="font-medium">لا يوجد اشتراك نشط لهذه العيادة</p>
      </div>
    );
  }

  const daysLeft = daysUntil(sub.endDate);
  const isExpired = daysLeft <= 0;
  const isExpiringSoon = daysLeft <= 30 && !isExpired;
  const progress = subscriptionProgress(sub.startDate, sub.endDate);
  const tier = tierConfig[sub.plan.tier] ?? tierConfig.PROFESSIONAL;

  return (
    <div className="space-y-5" dir="rtl">

      {/* Expiry warning */}
      {isExpiringSoon && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
            <span className="text-xl">⚠️</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">اشتراكك على وشك الانتهاء</p>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              متبقي <strong>{daysLeft} يوم</strong> فقط — تواصل مع المزود لتجديد الاشتراك
            </p>
          </div>
        </div>
      )}

      {/* Plan hero card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        {/* Gradient header */}
        <div className={`bg-gradient-to-l ${tier.gradient} px-6 py-6`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl shadow-inner">
                {tier.icon}
              </div>
              <div>
                <p className="text-white/70 text-xs font-medium tracking-wide mb-0.5">خطة الاشتراك</p>
                <h2 className="text-white text-2xl font-bold leading-tight">{sub.plan.name}</h2>
              </div>
            </div>
            <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${statusConfig[sub.status].className}`}>
              {statusConfig[sub.status].label}
            </span>
          </div>
        </div>

        {/* Card body */}
        <div className="p-6 flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">التكلفة الشهرية</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-4xl font-bold text-foreground">${sub.plan.monthlyPrice}</span>
              <span className="text-sm text-muted-foreground">/ شهر</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <div className={`bg-card border rounded-2xl p-5 text-center ${
          isExpired       ? 'border-red-200 dark:border-red-800' :
          isExpiringSoon  ? 'border-amber-200 dark:border-amber-800' :
                           'border-border'
        }`}>
          <p className={`text-4xl font-bold ${
            isExpired      ? 'text-red-500' :
            isExpiringSoon ? 'text-amber-500' :
                             'text-primary'
          }`}>
            {isExpired ? '0' : daysLeft}
          </p>
          <p className="text-xs text-muted-foreground mt-1.5">يوم متبقي</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 text-center">
          <p className="text-sm font-semibold text-foreground" dir="ltr">{sub.startDate}</p>
          <p className="text-xs text-muted-foreground mt-1.5">تاريخ البداية</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-5 text-center">
          <p className="text-sm font-semibold text-foreground" dir="ltr">{sub.endDate}</p>
          <p className="text-xs text-muted-foreground mt-1.5">تاريخ الانتهاء</p>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">مدة الاشتراك</h3>
          <span className="text-xs font-medium text-muted-foreground">{Math.round(progress)}% مكتمل</span>
        </div>
        <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isExpired      ? 'bg-red-500' :
              isExpiringSoon ? 'bg-amber-500' :
                               tier.barColor
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-3 text-xs text-muted-foreground">
          <span dir="ltr">{sub.startDate}</span>
          <span dir="ltr">{sub.endDate}</span>
        </div>
      </div>

    </div>
  );
}
