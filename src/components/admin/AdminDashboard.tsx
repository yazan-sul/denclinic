'use client';

import { useContext } from 'react';
import Link from 'next/link';
import { AuthContext } from '@/context/AuthContext';
import { BuildingIcon, UsersIcon, InvoiceIcon, ReportsIcon, ShieldIcon, CalendarIcon } from '@/components/Icons';

const mockStats = {
  branches: 3,
  doctors: 12,
  staff: 8,
  activeSubscription: true,
  subscriptionDaysLeft: 24,
  monthlyRevenue: 18500,
  appointmentsToday: 34,
  pendingPayments: 5,
};

const mockRecentActivity = [
  { id: 1, type: 'branch', text: 'تم إضافة فرع رام الله الجديد', time: 'منذ ساعتين' },
  { id: 2, type: 'team', text: 'انضم د. خالد عبد الله للفرع الرئيسي', time: 'منذ 5 ساعات' },
  { id: 3, type: 'payment', text: 'تم تجديد اشتراك الفرع الرئيسي', time: 'أمس' },
  { id: 4, type: 'permission', text: 'تم تعديل صلاحيات الموظف أحمد', time: 'أمس' },
];

export default function AdminDashboard() {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Welcome */}
      <div className="bg-gradient-to-l from-primary/5 to-primary/10 rounded-2xl p-6 border border-primary/20">
        <h2 className="text-2xl font-bold text-foreground mb-1">
          مرحباً، {user?.name || 'الأدمن'} 👋
        </h2>
        <p className="text-muted-foreground text-sm">
          هذه نظرة عامة على أداء العيادة اليوم
        </p>
        {!mockStats.activeSubscription || mockStats.subscriptionDaysLeft <= 7 ? (
          <div className="mt-3 inline-flex items-center gap-2 bg-destructive/10 text-destructive text-sm px-3 py-1.5 rounded-lg">
            ⚠️ الاشتراك ينتهي خلال {mockStats.subscriptionDaysLeft} أيام
          </div>
        ) : (
          <div className="mt-3 inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 text-sm px-3 py-1.5 rounded-lg">
            ✓ الاشتراك نشط — {mockStats.subscriptionDaysLeft} يوم متبقي
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <BuildingIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{mockStats.branches}</p>
          <p className="text-sm text-muted-foreground mt-1">الفروع</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
              <UsersIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{mockStats.doctors + mockStats.staff}</p>
          <p className="text-sm text-muted-foreground mt-1">فريق العمل</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <InvoiceIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">
            {mockStats.monthlyRevenue.toLocaleString('ar')}
          </p>
          <p className="text-sm text-muted-foreground mt-1">الإيراد الشهري (₪)</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
              <CalendarIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            </div>
          </div>
          <p className="text-2xl font-bold text-foreground">{mockStats.appointmentsToday}</p>
          <p className="text-sm text-muted-foreground mt-1">مواعيد اليوم</p>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">الوصول السريع</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/admin/branches"
            className="flex flex-col items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <BuildingIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">إدارة الفروع</span>
          </Link>

          <Link href="/admin/team"
            className="flex flex-col items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <UsersIcon className="w-6 h-6 text-purple-600 dark:text-purple-400 group-hover:text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">فريق العمل</span>
          </Link>

          <Link href="/admin/subscriptions"
            className="flex flex-col items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <InvoiceIcon className="w-6 h-6 text-green-600 dark:text-green-400 group-hover:text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">الاشتراكات</span>
          </Link>

          <Link href="/admin/permissions"
            className="flex flex-col items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <ShieldIcon className="w-6 h-6 text-red-600 dark:text-red-400 group-hover:text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">الصلاحيات</span>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-foreground">آخر النشاطات</h3>
          <Link href="/admin/reports" className="text-sm text-primary hover:underline">
            عرض التقارير
          </Link>
        </div>
        <div className="space-y-3">
          {mockRecentActivity.map((activity) => (
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

      {/* Team breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-base font-semibold text-foreground mb-4">توزيع الفريق</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">الأطباء</span>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${(mockStats.doctors / (mockStats.doctors + mockStats.staff)) * 100}%` }} />
                </div>
                <span className="text-sm font-bold text-foreground w-6 text-center">{mockStats.doctors}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">الموظفون</span>
              <div className="flex items-center gap-3">
                <div className="w-24 h-2 bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-blue-400 rounded-full" style={{ width: `${(mockStats.staff / (mockStats.doctors + mockStats.staff)) * 100}%` }} />
                </div>
                <span className="text-sm font-bold text-foreground w-6 text-center">{mockStats.staff}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="text-base font-semibold text-foreground mb-4">حالة الاشتراك</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">الخطة الحالية</span>
              <span className="text-sm font-semibold text-foreground">البريميوم</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">الحالة</span>
              <span className="text-sm font-semibold text-green-600">نشط</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">ينتهي في</span>
              <span className="text-sm font-semibold text-foreground">{mockStats.subscriptionDaysLeft} يوم</span>
            </div>
            <Link href="/admin/subscriptions"
              className="block w-full text-center mt-2 py-2 bg-primary/10 text-primary rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors">
              إدارة الاشتراك
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
