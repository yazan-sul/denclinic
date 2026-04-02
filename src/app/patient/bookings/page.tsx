'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import PatientLayout from '@/components/layouts/PatientLayout';

interface TimeSlot {
  date: string;
  time: string;
}

interface Booking {
  id: number;
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
  const userId = 1; // TODO: Get from auth context

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const response = await fetch(`/api/users/${userId}/bookings`);
        if (!response.ok) throw new Error('Failed to fetch bookings');
        const result = await response.json();
        // Unwrap the response
        const bookingsList = result.data || result;
        // Map API response to component interface
        const mappedBookings = bookingsList.map((booking: any) => ({
          id: booking.id,
          bookingId: `#${String(booking.id).padStart(5, '0')}`,
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

    fetchBookings();
  }, [userId]);

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
              {booking.status === 'CONFIRMED' && (
                <div className="flex gap-2 pt-3 border-t border-border">
                  <button className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
                    إعادة جدولة
                  </button>
                  <button className="flex-1 py-2 bg-destructive/20 text-destructive rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
                    إلغاء
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
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
