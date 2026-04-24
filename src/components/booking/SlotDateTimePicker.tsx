'use client';

import React, { useEffect, useMemo, useState } from 'react';

export interface PickerSlot {
  id: number;
  time: string;
  date?: string;
  available: boolean;
  doctorId?: number;
  doctor?: {
    name: string;
  };
}

interface SlotDateTimePickerProps {
  branchId: number;
  doctorId?: number;
  selectedDate: string;
  selectedSlotId: number | null;
  onDateChange: (date: string) => void;
  onSlotSelect: (slot: PickerSlot) => void;
  daysAhead?: number;
}

export default function SlotDateTimePicker({
  branchId,
  doctorId,
  selectedDate,
  selectedSlotId,
  onDateChange,
  onSlotSelect,
  daysAhead = 7,
}: SlotDateTimePickerProps) {
  const [timeSlots, setTimeSlots] = useState<PickerSlot[]>([]);
  const [loading, setLoading] = useState(false);

  const nextDays = useMemo(() => {
    const days: string[] = [];
    for (let i = 0; i < daysAhead; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  }, [daysAhead]);

  useEffect(() => {
    const normalizeSlots = (rawSlots: any[]): PickerSlot[] => {
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

    const fetchTimeSlots = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          branchId: branchId.toString(),
          date: selectedDate,
        });

        if (doctorId) {
          params.append('doctorId', doctorId.toString());
        }

        const response = await fetch(`/api/time-slots?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch time slots');
        }

        const result = await response.json();
        const slots = Array.isArray(result) ? result : (result.data || []);
        setTimeSlots(normalizeSlots(slots));
      } catch (error) {
        console.error('Error fetching time slots:', error);
        setTimeSlots([]);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeSlots();
  }, [selectedDate, branchId, doctorId]);

  const formatDate = (dateStr: string) => {
    const date = new Date(`${dateStr}T00:00:00`);
    const day = date.getDate();
    const month = date.toLocaleString('ar-SA', { month: 'short' });
    const dayName = date.toLocaleString('ar-SA', { weekday: 'short' });
    return `${dayName} ${day} ${month}`;
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold mb-3 text-right">اختر التاريخ</h3>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {nextDays.map((date) => (
            <button
              key={date}
              onClick={() => onDateChange(date)}
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
                onClick={() => onSlotSelect(slot)}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  selectedSlotId === slot.id
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
    </div>
  );
}
