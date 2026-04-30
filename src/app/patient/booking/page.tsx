'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useBooking } from '@/context/BookingContext';
import PatientLayout from '@/components/layouts/PatientLayout';
import ServiceSelection from '@/components/booking/ServiceSelection';
import DoctorSelection from '@/components/booking/DoctorSelection';
import DateTimeSelection from '@/components/booking/DateTimeSelection';
import BookingConfirmation from '@/components/booking/BookingConfirmation';
import PaymentStep from '@/components/booking/PaymentStep';

function BookingPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { state, dispatch } = useBooking();
  const [clinicData, setClinicData] = useState<any>(null);
  const [branchData, setBranchData] = useState<any>(null);

  const clinicId = parseInt(searchParams.get('clinicId') || '0');
  const branchId = parseInt(searchParams.get('branchId') || '0');

  useEffect(() => {
    // Start each booking entry with a clean state to avoid stale step resume.
    dispatch({ type: 'RESET' });

    if (clinicId) dispatch({ type: 'SET_CLINIC', payload: clinicId });
    if (branchId) dispatch({ type: 'SET_BRANCH', payload: branchId });

    // Fetch clinic and branch data
    const fetchData = async () => {
      try {
        if (clinicId) {
          const clinicRes = await fetch(`/api/clinic/${clinicId}`);
          if (clinicRes.ok) {
            const result = await clinicRes.json();
            setClinicData(result.data || result);
          }
        }
        if (branchId) {
          const branchRes = await fetch(`/api/branch/${branchId}`);
          if (branchRes.ok) {
            const result = await branchRes.json();
            setBranchData(result.data || result);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    if (clinicId || branchId) {
      fetchData();
    }

    // Clear booking draft when leaving the booking page.
    return () => {
      dispatch({ type: 'RESET' });
    };
  }, [clinicId, branchId, dispatch]);

  const handleBack = () => {
    if (state.currentStep > 1) {
      const previousStep = state.currentStep - 1;
      dispatch({ type: 'SET_STEP', payload: previousStep as 1 | 2 | 3 | 4 });
    } else {
      // Navigate back using custom handler, layout will call it via backHref
      router.push('/patient');
    }
  };

  const getStepTitle = () => {
    switch (state.currentStep) {
      case 1:
        return 'اختر الخدمة';
      case 2:
        return 'اختر الطبيب';
      case 3:
        return 'اختر الموعد والوقت';
      case 4:
        return 'تأكيد الحجز';
      case 5:
        return 'الدفع';
      default:
        return '';
    }
  };

  return (
    <PatientLayout 
      title={getStepTitle()}
      showBackButton 
      backHref="/patient"
      onBack={handleBack}
    >
      {/* Progress bar */}
      {state.currentStep < 5 && (
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((step) => (
            <button
              key={step}
              onClick={() => {
                if (step < state.currentStep) {
                  dispatch({ type: 'SET_STEP', payload: step as 1 | 2 | 3 | 4 | 5 });
                }
              }}
              disabled={step >= state.currentStep}
              className={`h-2 flex-1 rounded-full transition-all ${
                step <= state.currentStep ? 'bg-primary' : 'bg-border'
              } ${
                step < state.currentStep
                  ? 'cursor-pointer hover:opacity-80 active:opacity-70'
                  : 'cursor-default'
              } disabled:cursor-default`}
              title={step < state.currentStep ? `العودة إلى الخطوة ${step}` : ''}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div>
        {state.currentStep === 1 && (
          <ServiceSelection services={branchData?.services || []} />
        )}
        {state.currentStep === 2 && branchData && (
          <DoctorSelection doctors={branchData.doctors || []} />
        )}
        {state.currentStep === 3 && (
          <DateTimeSelection branchId={branchId} />
        )}
        {state.currentStep === 4 && clinicData && branchData && (
          <BookingConfirmation
            clinic={clinicData}
            branch={branchData}
            services={branchData.services || []}
          />
        )}
        {state.currentStep === 5 && clinicData && branchData && (
          <PaymentStep
            clinic={clinicData}
            branch={branchData}
            services={branchData.services || []}
          />
        )}
      </div>
    </PatientLayout>
  );
}

export default function BookingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">جاري التحميل...</p>
      </div>
    }>
      <BookingPageContent />
    </Suspense>
  );
}
