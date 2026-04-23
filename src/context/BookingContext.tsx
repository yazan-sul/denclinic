'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';

export interface BookingState {
  clinicId: number | null;
  branchId: number | null;
  serviceId: number | null;
  doctorId: number | null;
  selectedDate: string | null;
  selectedTimeSlotId: number | null;
  currentStep: 1 | 2 | 3 | 4 | 5;
  bookingId: string | null;
  pendingBookingId: string | null;
  paymentAmount: number;
  allowedPaymentMethods: Array<'CARD' | 'CASH'>;
  isFirstTimeAtScope: boolean;
  requiresPrepayment: boolean;
}

/**
 * Type-safe booking actions using discriminated union
 * This ensures that each action type has the correct payload type
 */
export type BookingAction =
  | { type: 'SET_CLINIC'; payload: number }
  | { type: 'SET_BRANCH'; payload: number }
  | { type: 'SET_SERVICE'; payload: number }
  | { type: 'SET_DOCTOR'; payload: number }
  | { type: 'CLEAR_DOCTOR' }
  | { type: 'CLEAR_DATE_TIME' }
  | { type: 'SET_DATE'; payload: string }
  | { type: 'SET_TIME_SLOT'; payload: number }
  | { type: 'SET_STEP'; payload: 1 | 2 | 3 | 4 | 5 }
  | { type: 'SET_BOOKING_ID'; payload: string }
  | {
      type: 'SET_PENDING_BOOKING';
      payload: {
        bookingId: string;
        amount: number;
        allowedPaymentMethods: Array<'CARD' | 'CASH'>;
        isFirstTimeAtScope: boolean;
        requiresPrepayment: boolean;
      };
    }
  | { type: 'CLEAR_PENDING_BOOKING' }
  | { type: 'RESET' };

const initialState: BookingState = {
  clinicId: null,
  branchId: null,
  serviceId: null,
  doctorId: null,
  selectedDate: null,
  selectedTimeSlotId: null,
  currentStep: 1,
  bookingId: null,
  pendingBookingId: null,
  paymentAmount: 50,
  allowedPaymentMethods: ['CARD'],
  isFirstTimeAtScope: true,
  requiresPrepayment: true,
};

function bookingReducer(state: BookingState, action: BookingAction): BookingState {
  switch (action.type) {
    case 'SET_CLINIC':
      return { ...state, clinicId: action.payload };
    case 'SET_BRANCH':
      return { ...state, branchId: action.payload };
    case 'SET_SERVICE':
      return { ...state, serviceId: action.payload };
    case 'SET_DOCTOR':
      return { ...state, doctorId: action.payload };
    case 'CLEAR_DOCTOR':
      return { ...state, doctorId: null };
    case 'CLEAR_DATE_TIME':
      return { ...state, selectedDate: null, selectedTimeSlotId: null };
    case 'SET_DATE':
      return { ...state, selectedDate: action.payload };
    case 'SET_TIME_SLOT':
      return { ...state, selectedTimeSlotId: action.payload };
    case 'SET_STEP':
      return { ...state, currentStep: action.payload };
    case 'SET_BOOKING_ID':
      return { ...state, bookingId: action.payload };
    case 'SET_PENDING_BOOKING':
      return {
        ...state,
        pendingBookingId: action.payload.bookingId,
        paymentAmount: action.payload.amount,
        allowedPaymentMethods: action.payload.allowedPaymentMethods,
        isFirstTimeAtScope: action.payload.isFirstTimeAtScope,
        requiresPrepayment: action.payload.requiresPrepayment,
      };
    case 'CLEAR_PENDING_BOOKING':
      return {
        ...state,
        pendingBookingId: null,
        paymentAmount: 50,
        allowedPaymentMethods: ['CARD'],
        isFirstTimeAtScope: true,
        requiresPrepayment: true,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface BookingContextType {
  state: BookingState;
  dispatch: (action: BookingAction) => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

export function BookingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(bookingReducer, initialState);

  return (
    <BookingContext.Provider value={{ state, dispatch }}>
      {children}
    </BookingContext.Provider>
  );
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error('useBooking must be used within BookingProvider');
  }
  return context;
}
