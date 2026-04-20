'use client';

import React, { useState } from 'react';
import { useBooking } from '@/context/BookingContext';
import { useAuth } from '@/context/AuthContext';

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
  name?: string;
  user?: {
    name: string;
  };
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
  services: Service[];
}

export default function BookingConfirmation({ clinic, branch, services }: BookingConfirmationProps) {
  const { isAuthenticated } = useAuth();
  const { state, dispatch } = useBooking();
  const [creatingBooking, setCreatingBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedService = services.find((s) => s.id === state.serviceId);
  const selectedDoctor = branch.doctors.find((d) => d.id === state.doctorId);
  const selectedSlot = branch.timeSlots.find((t) => t.id === state.selectedTimeSlotId);

  const handleCreatePendingBooking = async () => {
    setCreatingBooking(true);
    setError(null);

    try {
      if (!selectedSlot) {
        throw new Error('يجب اختيار موعد زمني');
      }

      if (!isAuthenticated) {
        throw new Error('يرجى تسجيل الدخول أولاً');
      }

      const slotDate = new Date(selectedSlot.date).toISOString().split('T')[0];

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        const errorMsg = result.error?.message || result.message || 'فشل إنشاء الحجز';
        throw new Error(errorMsg);
      }

      const result = await response.json();
      const createdBookingId = String(result.data?.id || result.bookingId);
      const amount = Number(result.payment?.amount || 50);

      dispatch({
        type: 'SET_PENDING_BOOKING',
        payload: { bookingId: createdBookingId, amount },
      });
      dispatch({ type: 'SET_STEP', payload: 5 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ ما');
    } finally {
      setCreatingBooking(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-card p-4 rounded-lg border border-border space-y-3 text-right">
        <h3 className="font-semibold text-lg mb-3">تأكيد الحجز</h3>

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
            <span className="font-semibold">{selectedDoctor.name || selectedDoctor.user?.name}</span>
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
              <span className="text-sm text-primary font-semibold">{selectedSlot.time}</span>
            </div>
          </div>
        )}
      </div>

      <div className="bg-muted p-4 rounded-lg border border-border flex justify-between">
        <span className="font-semibold">المجموع</span>
        <span className="text-lg font-bold text-primary">قل. د {state.paymentAmount.toFixed(3)}</span>
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-700 p-3 rounded-lg text-center text-sm">
          {error}
        </div>
      )}

      <button
        onClick={handleCreatePendingBooking}
        disabled={creatingBooking}
        className={`w-full py-3 font-semibold rounded-lg transition-opacity ${
          creatingBooking
            ? 'bg-muted text-muted-foreground cursor-not-allowed'
            : 'bg-primary text-primary-foreground hover:opacity-90'
        }`}
      >
        {creatingBooking ? 'جاري إنشاء الحجز...' : 'التالي: الدفع'}
      </button>

      <p className="text-xs text-muted-foreground text-center">
        سيتم إنشاء حجز معلق ثم الانتقال إلى خطوة الدفع
      </p>
    </div>
  );
}
