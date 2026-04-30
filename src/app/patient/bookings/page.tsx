'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import PatientLayout from '@/components/layouts/PatientLayout';
import { useAuth } from '@/context/AuthContext';
import SlotDateTimePicker, { PickerSlot } from '@/components/booking/SlotDateTimePicker';

interface TimeSlot {
  date: string;
  time: string;
}

interface Booking {
  id: string;
  branchId: number;
  doctorId: number;
  bookingId: string;
  status: string;
  clinic: { name: string };
  branch: { name: string; address: string };
  doctor: { name: string };
  service: { name: string };
  timeSlot: TimeSlot;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<Booking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [rescheduleSlot, setRescheduleSlot] = useState<PickerSlot | null>(null);
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const fetchBookings = async () => {
    if (!user) {
      setBookings([]);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/users/${user.id}/bookings`);
      if (!response.ok) throw new Error('Failed to fetch bookings');
      const result = await response.json();
      const bookingsList = result.data || result;
      const mappedBookings = bookingsList.map((booking: any) => ({
        id: booking.id,
        branchId: booking.branchId,
        doctorId: booking.doctorId,
        bookingId: `#${String(booking.id).slice(-6).toUpperCase()}`,
        status: booking.status,
        clinic: booking.clinic,
        branch: booking.branch,
        doctor: {
          name: booking.doctor?.user?.name || 'غير محدد',
        },
        service: booking.service,
        timeSlot: {
          date: new Date(booking.appointmentDate).toLocaleDateString('ar-EG'),
          time: booking.appointmentTime,
        },
      }));
      setBookings(mappedBookings);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated || !user) {
      setBookings([]);
      setLoading(false);
      return;
    }

    fetchBookings();
  }, [authLoading, isAuthenticated, user]);

  const handleCancel = async (booking: Booking) => {
    const confirmed = window.confirm('هل أنت متأكد من إلغاء هذا الموعد؟');
    if (!confirmed) {
      return;
    }

    setActionLoadingId(booking.id);
    try {
      const response = await fetch(`/api/bookings/${booking.id}/cancel`, {
        method: 'POST',
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || result.message || 'تعذر إلغاء الموعد');
      }

      alert(result.message || 'تم إلغاء الموعد بنجاح');
      await fetchBookings();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر إلغاء الموعد';
      alert(message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReschedule = async (booking: Booking) => {
    setRescheduleBooking(booking);
    setRescheduleDate(new Date().toISOString().split('T')[0]);
    setRescheduleSlot(null);
  };

  const submitReschedule = async () => {
    if (!rescheduleBooking || !rescheduleSlot) {
      alert('يرجى اختيار التاريخ والوقت أولاً');
      return;
    }

    setActionLoadingId(rescheduleBooking.id);
    try {
      const response = await fetch(`/api/bookings/${rescheduleBooking.id}/reschedule`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appointmentDate: rescheduleDate,
          appointmentTime: rescheduleSlot.time,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error?.message || result.message || 'تعذرت إعادة الجدولة');
      }

      alert(result.message || 'تمت إعادة الجدولة بنجاح');
      setRescheduleBooking(null);
      setRescheduleSlot(null);
      await fetchBookings();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذرت إعادة الجدولة';
      alert(message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-green-500/20 text-green-700';
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-700';
      case 'COMPLETED':
        return 'bg-blue-500/20 text-blue-700';
      case 'CANCELLED':
        return 'bg-red-500/20 text-red-700';
      case 'RESCHEDULED':
        return 'bg-indigo-500/20 text-indigo-700';
      default:
        return 'bg-gray-500/20 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return 'مؤكد';
      case 'PENDING':
        return 'قيد الانتظار';
      case 'COMPLETED':
        return 'اكتمل';
      case 'CANCELLED':
        return 'ملغى';
      case 'RESCHEDULED':
        return 'أعيدت الجدولة';
      default:
        return status;
    }
  };

  return (
    <PatientLayout title="حجوزاتي" showBackButton backHref="/patient">
      {loading ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      ) : bookings.length > 0 ? (
        <>
          <div className="space-y-3">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-card border border-border rounded-lg p-4 space-y-3"
              >
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">
                    {booking.clinic.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {booking.service.name}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                    booking.status
                  )}`}
                >
                  {getStatusLabel(booking.status)}
                </span>
              </div>

              {/* Details */}
              <div className="space-y-2 border-t border-border pt-3 text-right">
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">الطبيب</span>
                  <span className="font-semibold text-sm">
                    {booking.doctor.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">الفرع</span>
                  <span className="font-semibold text-sm">
                    {booking.branch.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground text-sm">الموعد</span>
                  <span className="font-semibold text-sm">
                    {booking.timeSlot.date} • {booking.timeSlot.time}
                  </span>
                </div>
              </div>

              {/* Booking ID */}
              <div className="bg-muted p-2 rounded text-center">
                <p className="text-xs text-muted-foreground">رقم الحجز</p>
                <p className="font-mono text-sm font-bold text-primary">
                  {booking.bookingId}
                </p>
              </div>

              {/* Actions */}
                {(booking.status === 'CONFIRMED' || booking.status === 'PENDING') && (
                  <div className="flex gap-2 pt-3 border-t border-border">
                    <button
                      onClick={() => handleReschedule(booking)}
                      disabled={actionLoadingId === booking.id}
                      className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      إعادة جدولة
                    </button>
                    <button
                      onClick={() => handleCancel(booking)}
                      disabled={actionLoadingId === booking.id}
                      className="flex-1 py-2 bg-destructive/20 text-destructive rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      إلغاء
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {rescheduleBooking && (
            <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-xl w-full max-w-2xl p-4 md:p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold">إعادة جدولة الموعد</h2>
                  <button
                    onClick={() => {
                      setRescheduleBooking(null);
                      setRescheduleSlot(null);
                    }}
                    className="px-3 py-1 rounded-md bg-muted text-sm"
                  >
                    إغلاق
                  </button>
                </div>

                <p className="text-sm text-muted-foreground text-right">
                  اختر تاريخاً ووقتاً جديدين لنفس الطبيب والفرع.
                </p>

                <SlotDateTimePicker
                  branchId={rescheduleBooking.branchId}
                  doctorId={rescheduleBooking.doctorId}
                  selectedDate={rescheduleDate}
                  selectedSlotId={rescheduleSlot?.id ?? null}
                  onDateChange={(date) => {
                    setRescheduleDate(date);
                    setRescheduleSlot(null);
                  }}
                  onSlotSelect={(slot) => setRescheduleSlot(slot)}
                />

                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => {
                      setRescheduleBooking(null);
                      setRescheduleSlot(null);
                    }}
                    className="flex-1 py-2 rounded-lg border border-border"
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={submitReschedule}
                    disabled={!rescheduleSlot || actionLoadingId === rescheduleBooking.id}
                    className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoadingId === rescheduleBooking.id ? 'جاري الحفظ...' : 'تأكيد إعادة الجدولة'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <div className="text-4xl mb-3">📋</div>
          <h2 className="text-lg font-semibold mb-2">لا توجد حجوزات</h2>
          <p className="text-muted-foreground mb-4">
            ابدأ بحجز موعد مع أحد العيادات
          </p>
          <Link
            href="/patient"
            className="inline-block bg-primary text-primary-foreground px-6 py-2 rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            ابحث عن عيادة
          </Link>
        </div>
      )}
    </PatientLayout>
  );
}
