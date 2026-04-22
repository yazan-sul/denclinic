'use client';

import { useState, useEffect, useCallback, useContext, useRef } from 'react';
import { CalendarIcon, ClockIcon, UsersIcon } from '@/components/Icons';
import { AuthContext } from '@/context/AuthContext';

interface Appointment {
  id: string;
  patientName: string;
  patientPhone: string;
  service: string;
  date: string;
  time: string;
  status: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW' | 'RESCHEDULED' | 'PAYMENT_FAILED';
  notes?: string;
}

interface Doctor {
  id: number;
  specialization: string;
  user: { id: number; name: string; avatar?: string };
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'قيد الانتظار',
  CONFIRMED: 'مؤكد',
  COMPLETED: 'مكتمل',
  CANCELLED: 'ملغى',
  NO_SHOW: 'لم يحضر',
  RESCHEDULED: 'معاد جدولة',
  PAYMENT_FAILED: 'فشل الدفع',
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-300',
  CONFIRMED: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  COMPLETED: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300',
  CANCELLED: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300',
  NO_SHOW: 'bg-orange-100 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300',
  RESCHEDULED: 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300',
  PAYMENT_FAILED: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
};

const today = new Date().toISOString().split('T')[0];

// Roles that can see all doctors (not scoped to self)
const MANAGER_ROLES = ['CLINIC_OWNER', 'ADMIN', 'STAFF'];

interface Props {
  highlightId?: string;
  initialDate?: string;
}

const AppointmentsSchedule = ({ highlightId, initialDate }: Props) => {
  const authContext = useContext(AuthContext);
  const user = authContext?.user;
  const activeRole = authContext?.activeRole;

  const isManager = activeRole ? MANAGER_ROLES.includes(activeRole) : false;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(initialDate || today);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const highlightRef = useRef<HTMLDivElement>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Doctor filter — only shown for managers
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('all');

  // Fetch doctors list (for manager roles)
  useEffect(() => {
    if (!isManager) return;
    fetch('/api/clinic/doctors', { credentials: 'include' })
      .then((r) => r.json())
      .then((json) => { if (json.success) setDoctors(json.data); })
      .catch(() => {});
  }, [isManager]);

  const fetchAppointments = useCallback(async (date: string, doctorId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ from: date, to: date, pageSize: '100' });
      // For managers: pass selected doctor filter (or all)
      if (isManager && doctorId !== 'all') params.set('doctorId', doctorId);
      // For doctor role: API auto-scopes to own doctorId (via resolveClinicScope)

      const res = await fetch(`/api/clinic/records?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'فشل تحميل المواعيد');

      const mapped: Appointment[] = json.data.map((apt: any) => ({
        id: apt.id,
        patientName: apt.patient?.user?.name ?? 'غير معروف',
        patientPhone: apt.patient?.user?.phoneNumber ?? '',
        service: apt.service?.name ?? '',
        date: apt.appointmentDate?.split('T')[0] ?? date,
        time: apt.appointmentTime ?? '',
        status: apt.status,
        notes: apt.notes ?? undefined,
      }));

      setAppointments(mapped);
    } catch (err: any) {
      setError(err.message ?? 'حدث خطأ');
    } finally {
      setIsLoading(false);
    }
  }, [isManager]);

  useEffect(() => {
    fetchAppointments(selectedDate, selectedDoctorId);
  }, [selectedDate, selectedDoctorId, fetchAppointments]);

  // Scroll to highlighted appointment after data loads
  useEffect(() => {
    if (!highlightId || isLoading) return;
    const timer = setTimeout(() => {
      highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 150);
    return () => clearTimeout(timer);
  }, [highlightId, isLoading]);

  const updateAppointmentStatus = async (id: string, newStatus: string) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/clinic/records/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'فشل التحديث');
      setAppointments((prev) =>
        prev.map((apt) => (apt.id === id ? { ...apt, status: newStatus as Appointment['status'] } : apt))
      );
    } catch (err: any) {
      alert(err.message ?? 'حدث خطأ أثناء التحديث');
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredAppointments = (() => {
    const list = filterStatus === 'all' ? appointments : appointments.filter((a) => a.status === filterStatus);
    if (!highlightId) return list;
    return [...list].sort((a, b) => (a.id === highlightId ? -1 : b.id === highlightId ? 1 : 0));
  })();

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-card rounded-lg border border-border p-4 md:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Date */}
          <div>
            <label className="block text-sm font-medium mb-2">التاريخ</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium mb-2">الحالة</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">الكل</option>
              <option value="PENDING">قيد الانتظار</option>
              <option value="CONFIRMED">مؤكد</option>
              <option value="COMPLETED">مكتمل</option>
              <option value="CANCELLED">ملغى</option>
              <option value="NO_SHOW">لم يحضر</option>
            </select>
          </div>

          {/* Doctor filter — managers only */}
          {isManager && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">الطبيب</label>
              <select
                value={selectedDoctorId}
                onChange={(e) => setSelectedDoctorId(e.target.value)}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">جميع الأطباء</option>
                {doctors.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.user.name} — {d.specialization}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-card rounded-lg border border-border p-4 text-center">
          <p className="text-2xl font-bold text-primary">{appointments.length}</p>
          <p className="text-xs text-muted-foreground">المجموع</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">
            {appointments.filter((a) => a.status === 'CONFIRMED' || a.status === 'PENDING').length}
          </p>
          <p className="text-xs text-muted-foreground">مؤكد / انتظار</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 text-center">
          <p className="text-2xl font-bold text-green-600">
            {appointments.filter((a) => a.status === 'COMPLETED').length}
          </p>
          <p className="text-xs text-muted-foreground">مكتمل</p>
        </div>
        <div className="bg-card rounded-lg border border-border p-4 text-center">
          <p className="text-2xl font-bold text-red-600">
            {appointments.filter((a) => a.status === 'CANCELLED').length}
          </p>
          <p className="text-xs text-muted-foreground">ملغى</p>
        </div>
      </div>

      {/* Appointments List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">
            <p>جاري التحميل...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">
            <p>{error}</p>
            <button
              onClick={() => fetchAppointments(selectedDate, selectedDoctorId)}
              className="mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm"
            >
              إعادة المحاولة
            </button>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>لا توجد مواعيد لهذا التاريخ</p>
          </div>
        ) : (
          filteredAppointments.map((appointment) => {
            const isHighlighted = appointment.id === highlightId;
            return (
            <div
              key={appointment.id}
              ref={isHighlighted ? highlightRef : null}
              className={`bg-card rounded-lg border p-4 md:p-6 hover:shadow-md transition-shadow ${
                isHighlighted
                  ? 'border-primary ring-2 ring-primary/30 shadow-md'
                  : 'border-border'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
                        {appointment.patientPhone && <span>{appointment.patientPhone}</span>}
                      </div>
                      {appointment.notes && (
                        <p className="text-sm mt-2 p-2 bg-secondary rounded border border-border/50">
                          <strong>ملاحظات:</strong> {appointment.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[appointment.status] ?? ''}`}>
                    {STATUS_LABELS[appointment.status] ?? appointment.status}
                  </div>
                  <div className="flex gap-2 w-full md:w-auto">
                    {(appointment.status === 'CONFIRMED' || appointment.status === 'PENDING') && (
                      <>
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'COMPLETED')}
                          disabled={updatingId === appointment.id}
                          className="flex-1 md:flex-none px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors text-sm cursor-pointer disabled:opacity-50"
                        >
                          مكتمل
                        </button>
                        <button
                          onClick={() => updateAppointmentStatus(appointment.id, 'NO_SHOW')}
                          disabled={updatingId === appointment.id}
                          className="flex-1 md:flex-none px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition-colors text-sm cursor-pointer disabled:opacity-50"
                        >
                          لم يحضر
                        </button>
                      </>
                    )}
                    <button className="flex-1 md:flex-none px-3 py-1 bg-secondary rounded hover:bg-secondary/80 transition-colors text-sm cursor-pointer">
                      التفاصيل
                    </button>
                  </div>
                </div>
              </div>
            </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AppointmentsSchedule;
