'use client';

import { useState } from 'react';
import { CalendarIcon, ClockIcon, UsersIcon, CheckCircleIcon, XIcon } from '@/components/Icons';

interface Appointment {
  id: number;
  patientName: string;
  patientPhone: string;
  service: string;
  date: string;
  time: string;
  status: 'verified' | 'completed' | 'cancelled' | 'no-show';
  duration: number;
  notes?: string;
}

const AppointmentsSchedule = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([
    {
      id: 1,
      patientName: 'أحمد محمد',
      patientPhone: '+966501234567',
      service: 'فحص عام',
      date: '2026-04-14',
      time: '10:00',
      status: 'verified',
      duration: 30,
      notes: 'مريض جديد',
    },
    {
      id: 2,
      patientName: 'فاطمة علي',
      patientPhone: '+966501234568',
      service: 'تنظيف أسنان',
      date: '2026-04-14',
      time: '10:30',
      status: 'verified',
      duration: 45,
    },
    {
      id: 3,
      patientName: 'محمود حسن',
      patientPhone: '+966501234569',
      service: 'حشو سن',
      date: '2026-04-14',
      time: '11:00',
      status: 'completed',
      duration: 30,
    },
    {
      id: 4,
      patientName: 'سارة أحمد',
      patientPhone: '+966501234570',
      service: 'خلع سن',
      date: '2026-04-14',
      time: '14:00',
      status: 'cancelled',
      duration: 45,
      notes: 'ألغاها المريض',
    },
  ]);

  const [selectedDate, setSelectedDate] = useState('2026-04-14');
  const [filterStatus, setFilterStatus] = useState<string | 'all'>('all');

  const filteredAppointments =
    filterStatus === 'all'
      ? appointments.filter((a) => a.date === selectedDate)
      : appointments.filter((a) => a.date === selectedDate && a.status === filterStatus);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300';
      case 'completed':
        return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300';
      case 'no-show':
        return 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'verified':
        return 'مؤكد';
      case 'completed':
        return 'مكتمل';
      case 'cancelled':
        return 'ملغى';
      case 'no-show':
        return 'لم يحضر';
      default:
        return status;
    }
  };

  const updateAppointmentStatus = (id: number, newStatus: string) => {
    setAppointments(
      appointments.map((apt) =>
        apt.id === id ? { ...apt, status: newStatus as Appointment['status'] } : apt
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-card rounded-lg border border-border p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date Picker */}
          <div>
            <label className="block text-sm font-medium mb-2">التاريخ</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium mb-2">الحالة</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">الكل</option>
              <option value="verified">مؤكد</option>
              <option value="completed">مكتمل</option>
              <option value="cancelled">ملغى</option>
              <option value="no-show">لم يحضر</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-lg border border-border p-4 text-center">
          <p className="text-2xl font-bold text-primary">{filteredAppointments.length}</p>
          <p className="text-xs text-muted-foreground">المجموع</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {filteredAppointments.filter((a) => a.status === 'verified').length}
          </p>
          <p className="text-xs text-muted-foreground">مؤكد</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {filteredAppointments.filter((a) => a.status === 'completed').length}
          </p>
          <p className="text-xs text-muted-foreground">مكتمل</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 text-center">
          <p className="text-2xl font-bold text-red-600">
            {filteredAppointments.filter((a) => a.status === 'cancelled').length}
          </p>
          <p className="text-xs text-muted-foreground">ملغى</p>
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {filteredAppointments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد مواعيد لهذا التاريخ</p>
          </div>
        ) : (
          filteredAppointments.map((appointment) => (
            <div
              key={appointment.id}
              className="bg-card rounded-lg border border-border p-4 md:p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Appointment Info */}
                <div className="flex-1">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <UsersIcon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">{appointment.patientName}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{appointment.service}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <ClockIcon className="w-4 h-4" />
                          {appointment.time}
                        </span>
                        <span className="flex items-center gap-1">
                          <CalendarIcon className="w-4 h-4" />
                          {appointment.date}
                        </span>
                        <span>~ {appointment.duration} دقيقة</span>
                      </div>
                      {appointment.notes && (
                        <p className="text-sm mt-2 p-2 bg-secondary rounded border border-border/50">
                          <strong>ملاحظات:</strong> {appointment.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status and Actions */}
                <div className="flex flex-col items-end gap-3">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
                    {getStatusLabel(appointment.status)}
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 w-full md:w-auto">
                    {appointment.status === 'verified' && (
                      <>
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'completed')}
                          className="flex-1 md:flex-none px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-sm"
                        >
                          مكتمل
                        </button>
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'no-show')}
                          className="flex-1 md:flex-none px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors text-sm"
                        >
                          لم يحضر
                        </button>
                      </>
                    )}
                    <button className="flex-1 md:flex-none px-3 py-1 bg-secondary rounded hover:bg-secondary/80 transition-colors text-sm">
                      التفاصيل
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AppointmentsSchedule;
