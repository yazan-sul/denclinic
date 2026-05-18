'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

interface DashboardData {
  branches: number;
  doctors: number;
  staff: number;
  appointmentsToday: number;
  pendingAppointments: number;
  monthlyRevenue: number;
  subscription: { active: boolean; planName: string; daysLeft: number };
  revenueMonthly: { label: string; value: number }[];
  revenueQuarterly: { label: string; value: number }[];
  appointmentVolume: { label: string; patients: number }[];
  newPatients: number;
  returningPatients: number;
  servicePopularity: { name: string; pct: number }[];
  branchEfficiency: { name: string; occupancy: number; grade: string; color: string }[];
}

function CircularProgress({ percentage, size = 140 }: { percentage: number; size?: number }) {
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--border)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#22c55e"
        strokeWidth={strokeWidth} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
    </svg>
  );
}

const tooltipStyle = {
  contentStyle: {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderRadius: '8px',
    fontSize: 12,
  },
  labelStyle: { color: 'var(--foreground)', fontWeight: 600 },
  itemStyle: { color: 'var(--muted-foreground)' },
};

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revenuePeriod, setRevenuePeriod] = useState<'monthly' | 'quarterly'>('quarterly');

  useEffect(() => {
    fetch('/api/admin/dashboard', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => setData(json.data))
      .catch(() => setError('تعذّر تحميل بيانات لوحة التحكم'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground" dir="rtl">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">جارٍ تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3" dir="rtl">
        <p className="text-4xl">⚠️</p>
        <p className="text-destructive text-sm">{error ?? 'حدث خطأ غير متوقع'}</p>
      </div>
    );
  }

  const { subscription } = data;
  const revenueChart = revenuePeriod === 'monthly' ? data.revenueMonthly : data.revenueQuarterly;
  const totalPatients = data.newPatients + data.returningPatients;
  const newPct = totalPatients > 0 ? Math.round((data.newPatients / totalPatients) * 100) : 0;

  // Management Focus: subscription alert is real; the rest are placeholders
  // (inventory and staff reviews are not in the data model)
  const subscriptionAlert = subscription.planName && subscription.daysLeft <= 30;

  return (
    <div className="space-y-5" dir="rtl">

      {/* ── 1. شريط مؤشرات الأداء ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard label="إجمالي الفروع"     value={data.branches}           badge="+2"           badgeColor="green" />
        <KpiCard label="الأطباء النشطون"   value={data.doctors}            badge="98%"          badgeColor="green" />
        <KpiCard label="إجمالي الموظفين"   value={data.staff}              badge="+5"           badgeColor="green" />
        <KpiCard label="مواعيد اليوم"      value={data.appointmentsToday}  badge={`${data.pendingAppointments} متبقي`} badgeColor="amber" />
        <KpiCard
          label="الإيراد الشهري"
          value={`₪${data.monthlyRevenue.toLocaleString('ar')}`}
          badge="↑ 14.2%"
          badgeColor="green"
          className="col-span-2 md:col-span-1"
        />
      </div>

      {/* ── 2. اتجاهات الإيرادات + استقطاب المرضى ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[65fr_35fr] gap-4">

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-foreground">اتجاهات الإيرادات</h3>
              <p className="text-xs text-muted-foreground mt-0.5">الأداء الصافي عبر جميع المواقع</p>
            </div>
            <div className="flex items-center bg-muted rounded-lg p-1 gap-0.5">
              {(['monthly', 'quarterly'] as const).map((p) => (
                <button key={p}
                  onClick={() => setRevenuePeriod(p)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                    revenuePeriod === p ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p === 'monthly' ? 'شهري' : 'ربع سنوي'}
                </button>
              ))}
            </div>
          </div>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueChart} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                <Tooltip {...tooltipStyle} />
                <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">استقطاب المرضى</h3>
            <p className="text-xs text-muted-foreground mt-0.5">المرضى الجدد مقابل العائدين</p>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center gap-3">
            <div className="relative">
              <CircularProgress percentage={newPct} size={140} />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                <p className="text-[10px] font-semibold text-muted-foreground leading-tight">تسجيلات</p>
                <p className="text-[10px] font-semibold text-muted-foreground leading-tight">جديدة</p>
                <p className="text-xl font-bold text-foreground leading-tight mt-0.5">{data.newPatients}</p>
              </div>
            </div>
            {newPct > 0 && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
                ↑ {newPct}% من إجمالي المرضى
              </span>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">المرضى العائدون:</span>
              <span className="font-semibold text-foreground">{data.returningPatients.toLocaleString('ar')}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">إجمالي هذا الشهر:</span>
              <span className="font-semibold text-foreground">{totalPatients.toLocaleString('ar')}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. حجم المواعيد + شعبية الخدمات ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[65fr_35fr] gap-4">

        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-start justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-foreground">اتجاهات حجم المواعيد</h3>
              <p className="text-xs text-muted-foreground mt-0.5">تدفق المرضى الأسبوعي — الشهر الحالي</p>
            </div>
            <span className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1.5 rounded-full">أسبوعي</span>
          </div>
          <div className="h-52">
            {data.appointmentVolume.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.appointmentVolume} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
                  <Tooltip {...tooltipStyle} />
                  <Bar dataKey="patients" fill="var(--primary)" radius={[4, 4, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm">لا توجد مواعيد هذا الشهر</div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 flex flex-col">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-foreground">شعبية التخصصات</h3>
            <p className="text-xs text-muted-foreground mt-0.5">حجم المرضى حسب التخصص</p>
          </div>
          <div className="flex-1 space-y-4">
            {data.servicePopularity.length > 0 ? data.servicePopularity.map((s) => (
              <div key={s.name}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-foreground font-medium">{s.name}</span>
                  <span className="text-muted-foreground">{s.pct}%</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${s.pct}%` }} />
                </div>
              </div>
            )) : (
              <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات بعد</p>
            )}
          </div>
          {data.servicePopularity.length > 0 && (
            <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
              الأعلى أداءً: {data.servicePopularity[0].name}
            </p>
          )}
        </div>
      </div>

      {/* ── 4. العمليات وضوابط النظام ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* محور الإدارة */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground">محور الإدارة</h3>
            {subscriptionAlert && (
              <span className="text-[11px] font-bold bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-1 rounded-full">
                تنبيه
              </span>
            )}
          </div>
          <div className="space-y-2.5">
            {subscriptionAlert && (
              <div className="flex items-start gap-3 p-2.5 border rounded-lg bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800">
                <span className="text-base mt-0.5 flex-shrink-0">⏰</span>
                <div>
                  <p className="text-xs font-semibold text-red-700 dark:text-red-400">تجديد الاشتراك</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    ينتهي خلال {subscription.daysLeft} {subscription.daysLeft === 1 ? 'يوم' : 'أيام'} — {subscription.planName}
                  </p>
                </div>
              </div>
            )}
            {!subscriptionAlert && subscription.planName && (
              <div className="flex items-start gap-3 p-2.5 border rounded-lg bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                <span className="text-base mt-0.5 flex-shrink-0">✅</span>
                <div>
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400">الاشتراك نشط</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{subscription.planName} — {subscription.daysLeft} يوم متبقي</p>
                </div>
              </div>
            )}
            {!subscription.planName && (
              <div className="flex items-start gap-3 p-2.5 border rounded-lg bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800">
                <span className="text-base mt-0.5 flex-shrink-0">⚠️</span>
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">لا يوجد اشتراك نشط</p>
                  <p className="text-xs text-muted-foreground mt-0.5">يرجى تفعيل خطة اشتراك</p>
                </div>
              </div>
            )}
            <div className="flex items-start gap-3 p-2.5 border rounded-lg bg-card border-border">
              <span className="text-base mt-0.5 flex-shrink-0">📅</span>
              <div>
                <p className="text-xs font-semibold text-foreground">مواعيد اليوم</p>
                <p className="text-xs text-muted-foreground mt-0.5">{data.appointmentsToday} موعد — {data.pendingAppointments} بانتظار التأكيد</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-2.5 border rounded-lg bg-card border-border">
              <span className="text-base mt-0.5 flex-shrink-0">👥</span>
              <div>
                <p className="text-xs font-semibold text-foreground">مرضى جدد هذا الشهر</p>
                <p className="text-xs text-muted-foreground mt-0.5">{data.newPatients} مريض جديد</p>
              </div>
            </div>
          </div>
        </div>

        {/* كفاءة الفروع */}
        <div className="bg-card border border-border rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-foreground">كفاءة الفروع</h3>
            <span className="text-xs text-muted-foreground">الشهر الحالي</span>
          </div>
          {data.branchEfficiency.length > 0 ? (
            <div className="space-y-3">
              {data.branchEfficiency.map((b) => (
                <div key={b.name} className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${b.color} flex items-center justify-center flex-shrink-0`}>
                    <span className="text-white text-xs font-bold">{b.grade}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{b.name}</p>
                    <p className="text-xs text-muted-foreground">حصة المواعيد: {b.occupancy}%</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">لا توجد بيانات بعد</p>
          )}
        </div>

      </div>
    </div>
  );
}

function KpiCard({
  label, value, badge, badgeColor, className = '',
}: {
  label: string;
  value: string | number;
  badge: string;
  badgeColor: 'green' | 'amber';
  className?: string;
}) {
  const badgeClass = badgeColor === 'green'
    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
  return (
    <div className={`bg-card border border-border rounded-xl p-4 ${className}`}>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">{label}</p>
      <div className="flex items-end justify-between gap-2">
        <span className="text-2xl font-bold text-foreground leading-none">{value}</span>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${badgeClass}`}>{badge}</span>
      </div>
    </div>
  );
}
