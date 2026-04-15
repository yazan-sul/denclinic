'use client';

import { useContext, useState } from 'react';
import { AuthContext } from '@/context/AuthContext';
import { CalendarIcon, UsersIcon, CheckCircleIcon } from '@/components/Icons';

interface Appointment {
  id: number;
  time: string;
  patient: string;
  phone: string;
  service: string;
  status: 'upcoming' | 'completed' | 'cancelled';
}

const DoctorDashboard = () => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;

  // Mock upcoming appointments
  const upcomingAppointments: Appointment[] = [
    {
      id: 1,
      time: '10:00 AM',
      patient: 'أحمد محمد',
      phone: '966500000001',
      service: 'فحص عام',
      status: 'upcoming',
    },
    {
      id: 2,
      time: '10:30 AM',
      patient: 'فاطمة علي',
      phone: '966500000002',
      service: 'تنظيف أسنان',
      status: 'upcoming',
    },
    {
      id: 3,
      time: '11:00 AM',
      patient: 'محمود حسن',
      phone: '966500000003',
      service: 'حشو سن',
      status: 'upcoming',
    },
    {
      id: 4,
      time: '11:30 AM',
      patient: 'نور عبدالله',
      phone: '966500000004',
      service: 'خلع سن',
      status: 'upcoming',
    },
    {
      id: 5,
      time: '2:00 PM',
      patient: 'سارة محمود',
      phone: '966500000005',
      service: 'تقويم أسنان',
      status: 'upcoming',
    },
  ];

  const todayAppointments = upcomingAppointments.filter((a) => a.status === 'upcoming');
  const completedToday = 8;

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-lg border border-border p-6">
        <h2 className="text-2xl font-bold mb-2">مرحبا {user?.name || 'الدكتور'}</h2>
        <p className="text-muted-foreground">
          لديك {todayAppointments.length} مواعيد اليوم - نتمنى لك يوما عمليا منتجا
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Today's Appointments */}
        <div className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">المواعيد اليوم</p>
              <p className="text-3xl font-bold text-primary">{todayAppointments.length}</p>
            </div>
            <div className="p-3 bg-primary/10 rounded-lg">
              <CalendarIcon className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        {/* Completed Today */}
        <div className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">المكتملة اليوم</p>
              <p className="text-3xl font-bold text-green-600">{completedToday}</p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        {/* Total Patients */}
        <div className="bg-card rounded-lg border border-border p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">إجمالي المرضى</p>
              <p className="text-3xl font-bold text-blue-600">45</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <UsersIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Appointments - Main Focus */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold">المواعيد المقبلة</h3>
          <span className="text-sm bg-primary/10 text-primary px-3 py-1 rounded-full font-medium">
            {todayAppointments.length} موعد
          </span>
        </div>

        <div className="space-y-3">
          {todayAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className="flex items-center justify-between p-4 bg-gradient-to-r from-secondary/50 to-transparent rounded-lg border border-border/50 hover:border-border transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4 flex-1">
                {/* Time Badge */}
                <div className="w-16 h-16 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <div className="text-center">
                    <p className="font-bold text-primary text-sm">{appointment.time.split(' ')[0]}</p>
                    <p className="text-xs text-muted-foreground">{appointment.time.split(' ')[1]}</p>
                  </div>
                </div>

                {/* Appointment Details */}
                <div className="flex-1">
                  <p className="font-semibold text-base">{appointment.patient}</p>
                  <p className="text-sm text-muted-foreground">{appointment.service}</p>
                  <p className="text-xs text-muted-foreground mt-1">{appointment.phone}</p>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-2 flex-shrink-0">
                <button className="px-3 py-2 text-xs font-medium bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors cursor-pointer">
                  دخول
                </button>
                <button className="px-3 py-2 text-xs font-medium bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors cursor-pointer">
                  تفاصيل
                </button>
              </div>
            </div>
          ))}
        </div>

        {todayAppointments.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>لا توجد مواعيد قادمة</p>
          </div>
        )}
      </div>

      {/* Quick Navigation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <a
          href="/doctor/schedule"
          className="p-4 bg-primary/10 rounded-lg border border-primary/20 hover:border-primary/50 transition-all text-center font-medium text-primary hover:bg-primary/20 cursor-pointer"
        >
          ⏱️ إدارة جدول العمل
        </a>
        <a
          href="/doctor/patients"
          className="p-4 bg-blue-100/20 dark:bg-blue-900/20 rounded-lg border border-blue-200/20 hover:border-blue-200 transition-all text-center font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100/30 cursor-pointer"
        >
          👥 سجل المرضى
        </a>
      </div>
    </div>
  );
};

export default DoctorDashboard;
