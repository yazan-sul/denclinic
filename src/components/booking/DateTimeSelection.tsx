'use client';

import React, { useState } from 'react';
import { useBooking } from '@/context/BookingContext';
import SlotDateTimePicker, { PickerSlot } from './SlotDateTimePicker';

interface DateTimeSelectionProps {
  branchId: number;
}

export default function DateTimeSelection({ branchId }: DateTimeSelectionProps) {
  const { state, dispatch } = useBooking();
  const [selectedDate, setSelectedDate] = useState<string>(
    state.selectedDate || new Date().toISOString().split('T')[0]
  );

  const handleSelectTimeSlot = (slot: PickerSlot) => {
    dispatch({ type: 'SET_DATE', payload: selectedDate });
    dispatch({ type: 'SET_TIME_SLOT', payload: slot.id });
    dispatch({ type: 'SET_STEP', payload: 4 });
  };

  return (
    <div className="space-y-4">
      <SlotDateTimePicker
        branchId={branchId}
        doctorId={state.doctorId ?? undefined}
        selectedDate={selectedDate}
        selectedSlotId={state.selectedTimeSlotId}
        onDateChange={(date) => {
          setSelectedDate(date);
          dispatch({ type: 'CLEAR_DATE_TIME' });
          dispatch({ type: 'SET_DATE', payload: date });
        }}
        onSlotSelect={handleSelectTimeSlot}
      />

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
