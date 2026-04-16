'use client';

import React, { useState, useEffect } from 'react';
import { useBooking } from '@/context/BookingContext';

interface TimeSlot {
  id: number;
  time: string;
  date?: string;
  available: boolean;
  doctorId?: number;
  doctor?: {
    name: string;
  };
}

interface DateTimeSelectionProps {
  branchId: number;
}

export default function DateTimeSelection({ branchId }: DateTimeSelectionProps) {
  const { state, dispatch } = useBooking();
  const [selectedDate, setSelectedDate] = useState<string>(
    state.selectedDate || new Date().toISOString().split('T')[0]
  );
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const normalizeSlots = (rawSlots: any[]): TimeSlot[] => {
    if (!Array.isArray(rawSlots)) return [];

    return rawSlots
      .map((slot) => ({
        id: slot.id,
        time: slot.time ?? slot.startTime ?? '',
        date: slot.date ?? slot.slotDate,
        available: slot.available ?? slot.isAvailable ?? false,
        doctorId: slot.doctorId,
        doctor: slot.doctor,
      }))
      .filter((slot) => slot.id && slot.time);
  };

  // Generate next 7 days
  const getNextDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  const nextDays = getNextDays();

  useEffect(() => {
    const fetchTimeSlots = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          branchId: branchId.toString(),
          date: selectedDate,
        });

        if (state.doctorId) {
          params.append('doctorId', state.doctorId.toString());
        }

        const response = await fetch(`/api/time-slots?${params}`);
        if (!response.ok) throw new Error('Failed to fetch time slots');

        const result = await response.json();
        const slots = Array.isArray(result) ? result : (result.data || []);
        const normalizedSlots = normalizeSlots(slots);
        setTimeSlots(normalizedSlots);
      } catch (error) {
        console.error('Error fetching time slots:', error);
        setTimeSlots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeSlots();
  }, [selectedDate, branchId, state.doctorId]);

  const handleSelectTimeSlot = (timeSlotId: number) => {
    dispatch({ type: 'SET_DATE', payload: selectedDate });
    dispatch({ type: 'SET_TIME_SLOT', payload: timeSlotId });
    dispatch({ type: 'SET_STEP', payload: 4 });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    const day = date.getDate();
    const month = date.toLocaleString('ar-SA', { month: 'short' });
    const dayName = date.toLocaleString('ar-SA', { weekday: 'short' });
    return `${dayName} ${day} ${month}`;
  };

  return (
    <div className="space-y-4">
      {/* Date Selector */}
      <div>
        <h3 className="font-semibold mb-3 text-right">اختر التاريخ</h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {nextDays.map((date) => (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`flex flex-col items-center gap-1 p-3 rounded-lg border-2 whitespace-nowrap transition-all flex-shrink-0 ${
                selectedDate === date
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card hover:border-primary/50'
              }`}
            >
              <span className="text-xs">{formatDate(date)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Time Slots */}
      <div>
        <h3 className="font-semibold mb-3 text-right">اختر الوقت</h3>

        {loading ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">جاري التحميل...</p>
          </div>
        ) : timeSlots.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {timeSlots.map((slot) => (
              <button
                key={slot.id}
                onClick={() => handleSelectTimeSlot(slot.id)}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  state.selectedTimeSlotId === slot.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card hover:border-primary/50'
                }`}
                disabled={!slot.available}
              >
                <span className="font-semibold text-sm">{slot.time}</span>
                {slot.doctor?.name && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {slot.doctor.name}
                  </p>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">لا توجد مواعيد متاحة في هذا التاريخ</p>
          </div>
        )}
      </div>

      {/* Summary */}
      {state.selectedTimeSlotId && (
        <div className="bg-muted p-3 rounded-lg border border-border text-right">
          <p className="text-sm text-muted-foreground">الموعد المختار</p>
          <p className="font-semibold mt-1">
            {formatDate(selectedDate)} - {timeSlots.find(s => s.id === state.selectedTimeSlotId)?.time}
          </p>
        </div>
      )}

      {/* Continue Button */}
      {state.selectedTimeSlotId && (
        <button
          onClick={() => dispatch({ type: 'SET_STEP', payload: 4 })}
          className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          تأكيد الحجز →
        </button>
      )}
    </div>
  );
}
