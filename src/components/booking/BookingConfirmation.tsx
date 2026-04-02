'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBooking } from '@/context/BookingContext';
import Link from 'next/link';

interface Service {
  id: number;
  name: string;
}

interface TimeSlot {
  id: number;
  date: string;
  time: string;
}

interface Doctor {
  id: number;
  name: string;
}

interface Branch {
  id: string;
  name: string;
  address: string;
  doctors: Doctor[];
  timeSlots: TimeSlot[];
}

interface Clinic {
  id: number;
  name: string;
  services: Service[];
}

interface BookingConfirmationProps {
  clinic: Clinic;
  branch: Branch;
}

export default function BookingConfirmation({
  clinic,
  branch,
}: BookingConfirmationProps) {
  const router = useRouter();
  const { state, dispatch } = useBooking();
  const [confirming, setConfirming] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedService = clinic.services.find(s => s.id === state.serviceId);
  const selectedDoctor = branch.doctors.find(d => d.id === state.doctorId);
  const selectedSlot = branch.timeSlots.find(t => t.id === state.selectedTimeSlotId);

  const handleConfirmBooking = async () => {
    setConfirming(true);
    setError(null);

    try {
      // Validate that all required selections are made
      if (!selectedSlot) {
        throw new Error('يجب اختيار موعد زمني');
      }

      // Get current user ID (in real app, from auth)
      const userId = 1; // TODO: Get from auth context

      // Extract date and time from selected slot
      const slotDate = new Date(selectedSlot.date).toISOString().split('T')[0];

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          clinicId: clinic.id,
          branchId: parseInt(branch.id),
          doctorId: state.doctorId,
          serviceId: state.serviceId,
          appointmentDate: slotDate,
          appointmentTime: selectedSlot.time,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        const errorMsg = result.error?.message || 'فشل إنشاء الحجز';
        throw new Error(errorMsg);
      }

      const booking = await response.json();
      setBookingId(booking.data?.id || booking.bookingId);
      dispatch({ type: 'SET_BOOKING_ID', payload: booking.data?.id || booking.bookingId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ ما');
    } finally {
      setConfirming(false);
    }
  };

  if (bookingId) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        {/* Success Icon */}
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center text-4xl">
          ✓
        </div>

        <h2 className="text-2xl font-bold text-green-600">تم تأكيد الحجز</h2>

        {/* Booking ID */}
        <div className="bg-muted p-4 rounded-lg border border-border w-full">
          <p className="text-sm text-muted-foreground text-center mb-1">رقم الحجز</p>
          <p className="text-2xl font-mono font-bold text-center text-primary">
            {bookingId}
          </p>
        </div>

        {/* Summary */}
        <div className="w-full bg-card p-4 rounded-lg border border-border space-y-3 text-right">
          <div className="flex justify-between">
            <span className="text-muted-foreground">العيادة</span>
            <span className="font-semibold">{clinic.name}</span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between">
            <span className="text-muted-foreground">الفرع</span>
            <span className="font-semibold">{branch.name}</span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between">
            <span className="text-muted-foreground">الطبيب</span>
            <span className="font-semibold">{selectedDoctor?.name}</span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between">
            <span className="text-muted-foreground">الخدمة</span>
            <span className="font-semibold">{selectedService?.name}</span>
          </div>
          {selectedSlot && (
            <div className="border-t border-border pt-3 flex justify-between">
              <span className="text-muted-foreground">الموعد والوقت</span>
              <span className="font-semibold">
                {selectedSlot.date} • {selectedSlot.time}
              </span>
            </div>
          )}
        </div>

        {/* Message */}
        <p className="text-sm text-muted-foreground text-center">
          سيتم إرسال تفاصيل الحجز إلى بريدك الإلكتروني
        </p>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 w-full mt-6">
          <Link
            href="/patient"
            className="py-3 bg-muted border border-border rounded-lg text-center font-semibold hover:bg-muted/80 transition-colors"
          >
            الصفحة الرئيسية
          </Link>
          <Link
            href="/patient/bookings"
            className="py-3 bg-primary text-primary-foreground rounded-lg text-center font-semibold hover:opacity-90 transition-opacity"
          >
            حجوزاتي
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Booking Summary */}
      <div className="bg-card p-4 rounded-lg border border-border space-y-3 text-right">
        <h3 className="font-semibold text-lg mb-3">تفاصيل الحجز</h3>

        <div className="flex justify-between pb-3 border-b border-border">
          <span className="text-muted-foreground">العيادة</span>
          <span className="font-semibold">{clinic.name}</span>
        </div>

        <div className="flex justify-between pb-3 border-b border-border">
          <span className="text-muted-foreground">الفرع</span>
          <span className="font-semibold">{branch.name}</span>
        </div>

        {selectedDoctor && (
          <div className="flex justify-between pb-3 border-b border-border">
            <span className="text-muted-foreground">الطبيب</span>
            <span className="font-semibold">{selectedDoctor.name}</span>
          </div>
        )}

        {selectedService && (
          <div className="flex justify-between pb-3 border-b border-border">
            <span className="text-muted-foreground">الخدمة</span>
            <span className="font-semibold">{selectedService.name}</span>
          </div>
        )}

        {selectedSlot && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">الموعد والوقت</span>
            <div className="flex flex-col items-end gap-1">
              <span className="font-semibold">{selectedSlot.date}</span>
              <span className="text-sm text-primary font-semibold">
                {selectedSlot.time}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Price (optional) */}
      <div className="bg-muted p-4 rounded-lg border border-border flex justify-between">
        <span className="font-semibold">المجموع</span>
        <span className="text-lg font-bold text-primary">قل. د 50.000</span>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-500/20 text-red-700 p-3 rounded-lg text-center text-sm">
          {error}
        </div>
      )}

      {/* Confirm Button */}
      <button
        onClick={handleConfirmBooking}
        disabled={confirming}
        className={`w-full py-3 font-semibold rounded-lg transition-opacity ${
          confirming
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'bg-primary text-primary-foreground hover:opacity-90'
        }`}
      >
        {confirming ? 'جاري التأكيد...' : 'تأكيد الحجز'}
      </button>

      {/* Terms */}
      <p className="text-xs text-muted-foreground text-center">
        بتأكيدك، فإنك توافق على شروط الخدمة وسياسة الخصوصية
      </p>
    </div>
  );
}
