'use client';

import { useContext, useState } from 'react';
import Link from 'next/link';
import { AuthContext } from '@/context/AuthContext';
import { CalendarIcon, UsersIcon, SearchIcon, CheckCircleIcon } from '@/components/Icons';

type PaymentStatus = 'paid' | 'unpaid';
type AppointmentStatus = 'upcoming' | 'completed' | 'no-show';

interface TodayAppointment {
  id: number;
  time: string;
  patient: string;
  phone: string;
  service: string;
  doctor: string;
  payment: PaymentStatus;
  status: AppointmentStatus;
}

const mockTodayAppointments: TodayAppointment[] = [
  { id: 1, time: '09:00', patient: 'أحمد محمد', phone: '0599000001', service: 'مراجعة دورية', doctor: 'د. عبد اللطيف', payment: 'paid', status: 'completed' },
  { id: 2, time: '09:30', patient: 'فاطمة علي', phone: '0599000002', service: 'تنظيف أسنان', doctor: 'د. خالد', payment: 'paid', status: 'completed' },
  { id: 3, time: '10:00', patient: 'محمود حسن', phone: '0599000003', service: 'استشارة جديدة', doctor: 'د. عبد اللطيف', payment: 'unpaid', status: 'upcoming' },
  { id: 4, time: '10:30', patient: 'نور عبدالله', phone: '0599000004', service: 'حشو سن', doctor: 'د. خالد', payment: 'paid', status: 'upcoming' },
  { id: 5, time: '11:00', patient: 'سارة محمود', phone: '0599000005', service: 'خلع سن', doctor: 'د. عبد اللطيف', payment: 'unpaid', status: 'upcoming' },
  { id: 6, time: '11:30', patient: 'عمر ياسين', phone: '0599000006', service: 'تبييض أسنان', doctor: 'د. خالد', payment: 'paid', status: 'upcoming' },
  { id: 7, time: '02:00', patient: 'ليلى أحمد', phone: '0599000007', service: 'تقويم أسنان', doctor: 'د. عبد اللطيف', payment: 'paid', status: 'upcoming' },
];

const statusConfig: Record<AppointmentStatus, { label: string; className: string }> = {
  upcoming:  { label: 'قادم', className: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  completed: { label: 'مكتمل', className: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' },
  'no-show': { label: 'لم يحضر', className: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' },
};

const paymentConfig: Record<PaymentStatus, { label: string; className: string }> = {
  paid:   { label: 'مدفوع', className: 'text-green-600 dark:text-green-400' },
  unpaid: { label: 'غير مدفوع', className: 'text-red-600 dark:text-red-400' },
};

export default function StaffDashboard() {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const [search, setSearch] = useState('');

  const filtered = mockTodayAppointments.filter(
    (a) => a.patient.includes(search) || a.phone.includes(search)
  );

  const totalToday = mockTodayAppointments.length;
  const completedToday = mockTodayAppointments.filter((a) => a.status === 'completed').length;
  const upcomingToday = mockTodayAppointments.filter((a) => a.status === 'upcoming').length;
  const unpaidToday = mockTodayAppointments.filter((a) => a.payment === 'unpaid').length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Welcome */}
      <div className="bg-gradient-to-l from-primary/5 to-primary/10 rounded-2xl p-6 border border-primary/20">
        <h2 className="text-2xl font-bold text-foreground mb-1">
          مرحباً، {user?.name || 'السكرتير'} 👋
        </h2>
        <p className="text-muted-foreground text-sm">
          لديك {upcomingToday} مواعيد قادمة اليوم من أصل {totalToday}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-3">
            <CalendarIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-foreground">{totalToday}</p>
          <p className="text-sm text-muted-foreground mt-1">مواعيد اليوم</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-3">
            <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-2xl font-bold text-foreground">{completedToday}</p>
          <p className="text-sm text-muted-foreground mt-1">مكتمل</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-3">
            <CalendarIcon className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <p className="text-2xl font-bold text-foreground">{upcomingToday}</p>
          <p className="text-sm text-muted-foreground mt-1">قادم</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mb-3">
            <UsersIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-2xl font-bold text-foreground">{unpaidToday}</p>
          <p className="text-sm text-muted-foreground mt-1">غير مدفوع</p>
        </div>
      </div>

      {/* Today's Appointments Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="flex items-center justify-between flex-wrap gap-3 p-4 border-b border-border">
          <h3 className="text-lg font-bold text-foreground">حجوزات المرضى اليومية</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="ابحث عن مريض..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-9 pl-4 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary w-48"
              />
            </div>
            <Link
              href="/staff/appointments"
              className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/90 transition-colors whitespace-nowrap"
            >
              + موعد جديد
            </Link>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-secondary/50">
                <th className="text-right px-4 py-3 font-semibold text-foreground">المريض</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground">التوقيت</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground hidden sm:table-cell">نوع الكشف</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground hidden md:table-cell">الطبيب</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground">الدفع</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground">الحالة</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    لا توجد نتائج
                  </td>
                </tr>
              ) : (
                filtered.map((appt) => (
                  <tr key={appt.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                          {appt.patient.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{appt.patient}</p>
                          <p className="text-xs text-muted-foreground" dir="ltr">{appt.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground font-medium" dir="ltr">{appt.time}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{appt.service}</td>
                    <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{appt.doctor}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium ${paymentConfig[appt.payment].className}`}>
                        {paymentConfig[appt.payment].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[appt.status].className}`}>
                        {statusConfig[appt.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button className="text-xs text-primary hover:underline">تفاصيل</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-4">الوصول السريع</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Link href="/staff/appointments"
            className="flex flex-col items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <CalendarIcon className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover:text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">إدارة المواعيد</span>
          </Link>

          <Link href="/staff/patients"
            className="flex flex-col items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <UsersIcon className="w-6 h-6 text-purple-600 dark:text-purple-400 group-hover:text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">قائمة المرضى</span>
          </Link>

          <Link href="/staff/payments"
            className="flex flex-col items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400 group-hover:text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">المدفوعات</span>
          </Link>

          <Link href="/staff/lab"
            className="flex flex-col items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all group">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <SearchIcon className="w-6 h-6 text-amber-600 dark:text-amber-400 group-hover:text-primary" />
            </div>
            <span className="text-sm font-medium text-foreground">المختبرات</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
