'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useBooking } from '@/context/BookingContext';

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

interface PaymentStepProps {
  clinic: Clinic;
  branch: Branch;
  services: Service[];
}

export default function PaymentStep({ clinic, branch, services }: PaymentStepProps) {
  const { state, dispatch } = useBooking();
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentCancelled, setPaymentCancelled] = useState(false);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'CARD' | 'CASH'>(() => (
    state.allowedPaymentMethods.includes('CARD') ? 'CARD' : 'CASH'
  ));
  const [finalPaymentStatus, setFinalPaymentStatus] = useState<'COMPLETED' | 'PENDING' | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [simulationResult, setSimulationResult] = useState<'success' | 'failure'>('success');
  const [error, setError] = useState<string | null>(null);
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [retryDeadline, setRetryDeadline] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!retryDeadline) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((retryDeadline - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        setPaymentCancelled(true);
        dispatch({ type: 'CLEAR_PENDING_BOOKING' });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [retryDeadline, dispatch]);

  const selectedService = services.find((s) => s.id === state.serviceId);
  const selectedDoctor = branch.doctors.find((d) => d.id === state.doctorId);
  const selectedSlot = branch.timeSlots.find((t) => t.id === state.selectedTimeSlotId);
  const canUseCard = state.allowedPaymentMethods.includes('CARD');
  const canUseCash = state.allowedPaymentMethods.includes('CASH');
  const showMethodSelector = canUseCard && canUseCash;
  const isCardMethod = selectedMethod === 'CARD';

  const handlePayAndConfirm = async () => {
    setProcessingPayment(true);
    setError(null);

    try {
      if (!state.pendingBookingId) {
        throw new Error('لا يوجد حجز معلق للدفع');
      }

      if (selectedMethod === 'CARD') {
        if (!/^\d{12,19}$/.test(cardNumber.replace(/\s+/g, ''))) {
          throw new Error('رقم البطاقة غير صالح');
        }

        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
          throw new Error('تاريخ الانتهاء غير صالح');
        }

        if (!/^\d{3,4}$/.test(cvv)) {
          throw new Error('CVV غير صالح');
        }
      }

      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointmentId: state.pendingBookingId,
          method: selectedMethod,
          cardNumber: selectedMethod === 'CARD' ? cardNumber.replace(/\s+/g, '') : undefined,
          expiry: selectedMethod === 'CARD' ? expiry : undefined,
          cvv: selectedMethod === 'CARD' ? cvv : undefined,
          simulationResult,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg = result.error?.message || result.message || 'فشل الدفع';
        throw new Error(errorMsg);
      }

      const appointmentStatus = result.data?.appointmentStatus;
      if (appointmentStatus === 'CONFIRMED') {
        setConfirmedBookingId(state.pendingBookingId);
        setFinalPaymentStatus(result.data?.paymentStatus === 'PENDING' ? 'PENDING' : 'COMPLETED');
        dispatch({ type: 'SET_BOOKING_ID', payload: state.pendingBookingId });
        dispatch({ type: 'CLEAR_PENDING_BOOKING' });
        return;
      } else if (appointmentStatus === 'PAYMENT_FAILED') {
        setPaymentFailed(true);
        setRetryDeadline(Date.now() + 15 * 60 * 1000);
        setError('فشلت عملية الدفع. يرجى المحاولة باستخدام بطاقة أخرى.');
        return;
      }

      dispatch({ type: 'CLEAR_PENDING_BOOKING' });
      setPaymentCancelled(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ أثناء الدفع');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCancelPendingBooking = async () => {
    if (!state.pendingBookingId) {
      return;
    }

    try {
      await fetch(`/api/bookings/${state.pendingBookingId}/cancel`, {
        method: 'POST',
      });
    } catch {
      // Best-effort cancel request.
    } finally {
      dispatch({ type: 'CLEAR_PENDING_BOOKING' });
      setPaymentCancelled(true);
    }
  };

  if (confirmedBookingId) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center text-4xl">
          ✓
        </div>

        <h2 className="text-2xl font-bold text-green-600">تم تأكيد الحجز</h2>

        <div className="bg-muted p-4 rounded-lg border border-border w-full">
          <p className="text-sm text-muted-foreground text-center mb-1">رقم الحجز</p>
          <p className="text-2xl font-mono font-bold text-center text-primary">{confirmedBookingId}</p>
        </div>

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
            <span className="font-semibold">{selectedDoctor?.name || selectedDoctor?.user?.name}</span>
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

        <p className="text-sm text-muted-foreground text-center">
          {finalPaymentStatus === 'PENDING'
            ? 'تم تأكيد الحجز. الدفع كاش سيكون في العيادة.'
            : 'تم تأكيد الحجز بعد نجاح عملية الدفع.'}
        </p>

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

  if (paymentCancelled) {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="w-20 h-20 rounded-full bg-red-500/20 flex items-center justify-center text-4xl text-red-600">!</div>

        <h2 className="text-2xl font-bold text-red-600">تم إلغاء الحجز</h2>

        <p className="text-sm text-muted-foreground text-center">
          لم تكتمل عملية الدفع، لذلك تم إلغاء الحجز تلقائياً
        </p>

        <div className="grid grid-cols-2 gap-3 w-full mt-6">
          <button
            onClick={() => {
              dispatch({ type: 'SET_STEP', payload: 4 });
              setPaymentCancelled(false);
              setError(null);
            }}
            className="py-3 bg-primary text-primary-foreground rounded-lg text-center font-semibold hover:opacity-90 transition-opacity"
          >
            رجوع للتأكيد
          </button>
          <Link
            href="/patient"
            className="py-3 bg-muted border border-border rounded-lg text-center font-semibold hover:bg-muted/80 transition-colors"
          >
            الصفحة الرئيسية
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card p-4 rounded-lg border border-border space-y-3 text-right">
        <h3 className="font-semibold text-lg mb-3">الدفع</h3>

        <div className="flex justify-between pb-3 border-b border-border">
          <span className="text-muted-foreground">رقم الحجز</span>
          <span className="font-semibold">{state.pendingBookingId}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-muted-foreground">المبلغ المطلوب</span>
          <span className="text-lg font-bold text-primary">قل. د {state.paymentAmount.toFixed(3)}</span>
        </div>
      </div>

      {timeLeft !== null && timeLeft > 0 && (
        <div className="bg-amber-500/20 p-4 rounded-lg border border-amber-500/50 text-center">
          <p className="text-amber-800 font-semibold">
            لديك {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')} لإعادة المحاولة قبل إلغاء الحجز تلقائياً.
          </p>
        </div>
      )}

      <div className="bg-card p-4 rounded-lg border border-border space-y-3 text-right">
        <h3 className="font-semibold text-lg">طريقة الدفع</h3>

        {showMethodSelector && (
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">اختر طريقة الدفع</label>
            <div className="flex gap-4 justify-end">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={selectedMethod === 'CARD'}
                  onChange={() => setSelectedMethod('CARD')}
                />
                بطاقة
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="paymentMethod"
                  checked={selectedMethod === 'CASH'}
                  onChange={() => setSelectedMethod('CASH')}
                />
                نقداً في العيادة
              </label>
            </div>
          </div>
        )}

        {state.requiresPrepayment && (
          <div className="bg-amber-500/20 text-amber-800 p-3 rounded-lg text-sm">
            هذه أول زيارة لهذا الموعد. مطلوب الدفع بالبطاقة قبل تأكيد الحجز.
          </div>
        )}

        {isCardMethod && (
          <>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">رقم البطاقة</label>
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="4111111111111111"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-right"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">تاريخ الانتهاء</label>
                <input
                  type="text"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  placeholder="MM/YY"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">CVV</label>
                <input
                  type="password"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value)}
                  placeholder="123"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">نتيجة الدفع التجريبي</label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="paymentResult"
                    checked={simulationResult === 'success'}
                    onChange={() => setSimulationResult('success')}
                  />
                  نجاح
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="paymentResult"
                    checked={simulationResult === 'failure'}
                    onChange={() => setSimulationResult('failure')}
                  />
                  فشل
                </label>
              </div>
            </div>
          </>
        )}

        {selectedMethod === 'CASH' && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              سيتم تأكيد الحجز الآن، وستكون حالة الدفع معلقة حتى يتم التحصيل نقداً في العيادة.
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-500/20 text-red-700 p-3 rounded-lg text-center text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleCancelPendingBooking}
          disabled={processingPayment}
          className="py-3 bg-muted border border-border rounded-lg text-center font-semibold hover:bg-muted/80 transition-colors"
        >
          إلغاء العملية
        </button>
        <button
          onClick={handlePayAndConfirm}
          disabled={processingPayment || (!canUseCard && !canUseCash)}
          className={`py-3 font-semibold rounded-lg transition-opacity ${
            processingPayment
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-primary text-primary-foreground hover:opacity-90'
          }`}
        >
          {processingPayment
            ? 'جاري المعالجة...'
            : paymentFailed
              ? 'إعادة المحاولة'
              : selectedMethod === 'CASH'
                ? 'تأكيد الحجز مع الدفع نقداً'
                : 'ادفع الآن و أكد الحجز'}
        </button>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {selectedMethod === 'CARD'
          ? 'لن يتم تأكيد الحجز إلا بعد نجاح الدفع التجريبي.'
          : 'سيتم تأكيد الحجز الآن، وستبقى حالة الدفع معلقة حتى التحصيل في العيادة.'}
      </p>
    </div>
  );
}
