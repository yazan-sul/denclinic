'use client';

import { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import { AuthContext } from '@/context/AuthContext';
import {
  BuildingIcon,
  UsersIcon,
  InvoiceIcon,
  ReportsIcon,
  ShieldIcon,
  CalendarIcon,
} from '@/components/Icons';
import { useBranchScope } from '@/hook/useBranchScope';

type DashboardData = {
  scope: 'admin' | 'clinic_owner' | 'branch_manager';
  scopeLabel: string;
  branchScope: {
    branchId: number;
    branchName: string;
  } | null;
  stats: {
    branches: number;
    doctors: number;
    staff: number;
    teamTotal: number;
    monthlyRevenue: number;
    appointmentsToday: number;
    appointmentsWeek: number;
    pendingAppointments: number;
  };
  subscription: {
    active: boolean;
    status: string;
    planName: string;
    clinicName: string | null;
    daysLeft: number | null;
    activeCount: number;
  };
  recentActivity: Array<{
    id: string;
    text: string;
    time: string;
  }>;
};

function StatCard({
  icon,
  value,
  label,
  iconClassName,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  iconClassName: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${iconClassName}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function QuickLink({
  href,
  label,
  icon,
  iconClassName,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  iconClassName: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group"
    >
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors ${iconClassName}`}>
        {icon}
      </div>
      <span className="text-sm font-medium text-foreground">{label}</span>
    </Link>
  );
}

function ProgressRow({ label, value, total, barClassName }: { label: string; value: number; total: number; barClassName: string }) {
  const width = total > 0 ? (value / total) * 100 : 0;

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <div className="w-24 h-2 bg-border rounded-full overflow-hidden">
          <div className={`h-full rounded-full ${barClassName}`} style={{ width: `${width}%` }} />
        </div>
        <span className="text-sm font-bold text-foreground w-6 text-center">{value}</span>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const branchScope = useBranchScope();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/admin/dashboard', {
          credentials: 'include',
          cache: 'no-store',
        });
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error?.message || result.message || 'Failed to load dashboard');
        }

        if (active) {
          setDashboard(result.data);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Failed to load dashboard');
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive" dir="rtl">
        {error || 'تعذر تحميل بيانات لوحة التحكم'}
      </div>
    );
  }

  const subscriptionDaysLeft = dashboard.subscription.daysLeft ?? 0;
  const subscriptionWarning = !dashboard.subscription.active || subscriptionDaysLeft <= 7;

  if (branchScope) {
    return (
      <div className="space-y-6" dir="rtl">
        <div className="bg-gradient-to-l from-primary/5 to-primary/10 rounded-2xl p-6 border border-primary/20">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-1">
                مرحباً، {user?.name || 'مدير الفرع'}
              </h2>
              <p className="text-muted-foreground text-sm">لوحة تحكم {branchScope.branchName}</p>
            </div>
            <div className="flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-sm px-3 py-2 rounded-xl">
              <span className="font-medium">{branchScope.branchName}</span>
            </div>
          </div>
          <div className="mt-3 inline-flex items-center gap-2 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-sm px-3 py-1.5 rounded-lg">
            الاشتراك ينتهي خلال {subscriptionDaysLeft} يوم
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<UsersIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
            value={dashboard.stats.doctors}
            label="أطباء الفرع"
            iconClassName="bg-purple-100 dark:bg-purple-900/30"
          />
          <StatCard
            icon={<UsersIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
            value={dashboard.stats.staff}
            label="مشرفو الفرع"
            iconClassName="bg-blue-100 dark:bg-blue-900/30"
          />
          <StatCard
            icon={<CalendarIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
            value={dashboard.stats.appointmentsToday}
            label="مواعيد اليوم"
            iconClassName="bg-orange-100 dark:bg-orange-900/30"
          />
          <StatCard
            icon={<InvoiceIcon className="w-5 h-5 text-green-600 dark:text-green-400" />}
            value={dashboard.stats.monthlyRevenue.toLocaleString('ar')}
            label="إيراد الشهر (EGP)"
            iconClassName="bg-green-100 dark:bg-green-900/30"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-orange-100 dark:bg-orange-900/20 flex flex-col items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-orange-600 dark:text-orange-400 leading-none">
                {dashboard.stats.pendingAppointments}
              </span>
            </div>
            <div>
              <p className="font-semibold text-foreground">مواعيد تنتظر التأكيد</p>
              <Link href="/admin/reports" className="text-sm text-primary hover:underline mt-0.5 block">
                عرض الكل
              </Link>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-blue-100 dark:bg-blue-900/20 flex flex-col items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 leading-none">
                {dashboard.stats.appointmentsWeek}
              </span>
            </div>
            <div>
              <p className="font-semibold text-foreground">مواعيد هذا الأسبوع</p>
              <Link href="/admin/reports" className="text-sm text-primary hover:underline mt-0.5 block">
                عرض التقارير
              </Link>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-foreground mb-4">الوصول السريع</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <QuickLink
              href="/admin/team"
              label="فريق الفرع"
              icon={<UsersIcon className="w-6 h-6 text-purple-600 dark:text-purple-400 group-hover:text-primary" />}
              iconClassName="bg-purple-100 dark:bg-purple-900/30"
            />
            <QuickLink
              href="/admin/reports"
              label="تقارير الفرع"
              icon={<ReportsIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:text-primary" />}
              iconClassName="bg-blue-100 dark:bg-blue-900/30"
            />
            <QuickLink
              href="/admin/subscriptions"
              label="الاشتراك"
              icon={<InvoiceIcon className="w-6 h-6 text-amber-600 dark:text-amber-400 group-hover:text-primary" />}
              iconClassName="bg-amber-100 dark:bg-amber-900/30"
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-base font-semibold text-foreground mb-4">آخر نشاطات الفرع</h3>
          <div className="space-y-3">
            {dashboard.recentActivity.length === 0 && (
              <p className="text-sm text-muted-foreground">لا توجد نشاطات حديثة بعد.</p>
            )}
            {dashboard.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-foreground">{activity.text}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir="rtl">
      <div className="bg-gradient-to-l from-primary/5 to-primary/10 rounded-2xl p-6 border border-primary/20">
        <h2 className="text-2xl font-bold text-foreground mb-1">
          مرحباً، {user?.name || 'الأدمن'}
        </h2>
        <p className="text-muted-foreground text-sm">
          هذه نظرة عامة على أداء {dashboard.scopeLabel} اليوم
        </p>
        {subscriptionWarning ? (
          <div className="mt-3 inline-flex items-center gap-2 bg-destructive/10 text-destructive text-sm px-3 py-1.5 rounded-lg">
            حالة الاشتراك تحتاج متابعة - {subscriptionDaysLeft} يوم متبقي
          </div>
        ) : (
          <div className="mt-3 inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm px-3 py-1.5 rounded-lg">
            الاشتراك نشط - {subscriptionDaysLeft} يوم متبقي
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<BuildingIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
          value={dashboard.stats.branches}
          label="الفروع"
          iconClassName="bg-blue-100 dark:bg-blue-900/30"
        />
        <StatCard
          icon={<UsersIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
          value={dashboard.stats.teamTotal}
          label="فريق العمل"
          iconClassName="bg-purple-100 dark:bg-purple-900/30"
        />
        <StatCard
          icon={<InvoiceIcon className="w-5 h-5 text-green-600 dark:text-green-400" />}
          value={dashboard.stats.monthlyRevenue.toLocaleString('ar')}
          label="إيراد الشهر (EGP)"
          iconClassName="bg-green-100 dark:bg-green-900/30"
        />
        <StatCard
          icon={<CalendarIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
          value={dashboard.stats.appointmentsToday}
          label="مواعيد اليوم"
          iconClassName="bg-orange-100 dark:bg-orange-900/30"
        />
      </div>

      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">الوصول السريع</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickLink
            href="/admin/branches"
            label="إدارة الفروع"
            icon={<BuildingIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:text-primary" />}
            iconClassName="bg-blue-100 dark:bg-blue-900/30"
          />
          <QuickLink
            href="/admin/team"
            label="فريق العمل"
            icon={<UsersIcon className="w-6 h-6 text-purple-600 dark:text-purple-400 group-hover:text-primary" />}
            iconClassName="bg-purple-100 dark:bg-purple-900/30"
          />
          <QuickLink
            href="/admin/subscriptions"
            label="الاشتراكات"
            icon={<InvoiceIcon className="w-6 h-6 text-green-600 dark:text-green-400 group-hover:text-primary" />}
            iconClassName="bg-green-100 dark:bg-green-900/30"
          />
          <QuickLink
            href="/admin/permissions"
            label="الصلاحيات"
            icon={<ShieldIcon className="w-6 h-6 text-red-600 dark:text-red-400 group-hover:text-primary" />}
            iconClassName="bg-red-100 dark:bg-red-900/30"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">آخر النشاطات</h3>
          <Link href="/admin/reports" className="text-sm text-primary hover:underline">
            عرض التقارير
          </Link>
        </div>
        <div className="space-y-3">
          {dashboard.recentActivity.length === 0 && (
            <p className="text-sm text-muted-foreground">لا توجد نشاطات حديثة بعد.</p>
          )}
          {dashboard.recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
              <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-foreground">{activity.text}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-base font-semibold text-foreground mb-4">توزيع الفريق</h3>
          <div className="space-y-3">
            <ProgressRow
              label="الأطباء"
              value={dashboard.stats.doctors}
              total={dashboard.stats.teamTotal}
              barClassName="bg-primary"
            />
            <ProgressRow
              label="المشرفون"
              value={dashboard.stats.staff}
              total={dashboard.stats.teamTotal}
              barClassName="bg-blue-400"
            />
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-base font-semibold text-foreground mb-4">حالة الاشتراك</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">الخطة الحالية</span>
              <span className="text-sm font-semibold text-foreground">{dashboard.subscription.planName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">الحالة</span>
              <span className={`text-sm font-semibold ${dashboard.subscription.active ? 'text-green-600' : 'text-destructive'}`}>
                {dashboard.subscription.active ? 'نشط' : 'غير نشط'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">ينتهي في</span>
              <span className="text-sm font-semibold text-foreground">{subscriptionDaysLeft} يوم</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">الاشتراكات النشطة</span>
              <span className="text-sm font-semibold text-foreground">{dashboard.subscription.activeCount}</span>
            </div>
            <Link
              href="/admin/subscriptions"
              className="block w-full text-center mt-2 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              إدارة الاشتراك
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
