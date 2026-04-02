'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useBooking } from '@/context/BookingContext';
import PatientLayout from '@/components/layouts/PatientLayout';
import ServiceSelection from '@/components/booking/ServiceSelection';
import DoctorSelection from '@/components/booking/DoctorSelection';
import DateTimeSelection from '@/components/booking/DateTimeSelection';
import BookingConfirmation from '@/components/booking/BookingConfirmation';

export default function BookingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { state, dispatch } = useBooking();
  const [clinicData, setClinicData] = useState<any>(null);
  const [branchData, setBranchData] = useState<any>(null);

  const clinicId = parseInt(searchParams.get('clinicId') || '0');
  const branchId = parseInt(searchParams.get('branchId') || '0');

  useEffect(() => {
    // Initialize booking state
    if (clinicId) dispatch({ type: 'SET_CLINIC', payload: clinicId });
    if (branchId) dispatch({ type: 'SET_BRANCH', payload: branchId });

    // Fetch clinic and branch data
    const fetchData = async () => {
      try {
        if (clinicId) {
          const clinicRes = await fetch(`/api/clinic/${clinicId}`);
          if (clinicRes.ok) {
            setClinicData(await clinicRes.json());
          }
        }
        if (branchId) {
          const branchRes = await fetch(`/api/branch/${branchId}`);
          if (branchRes.ok) {
            setBranchData(await branchRes.json());
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    if (clinicId || branchId) {
      fetchData();
    }
  }, [clinicId, branchId, dispatch]);

  const handleBack = () => {
    if (state.currentStep > 1) {
      const previousStep = state.currentStep - 1;
      dispatch({ type: 'SET_STEP', payload: previousStep as 1 | 2 | 3 });
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
      {state.currentStep < 4 && (
        <div className="flex gap-2 mb-6">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`h-2 flex-1 rounded-full transition-colors ${
                step <= state.currentStep ? 'bg-primary' : 'bg-border'
              }`}
            />
          ))}
        </div>
      )}

      {/* Content */}
      <div>
        {state.currentStep === 1 && clinicData && (
          <ServiceSelection services={clinicData.services} />
        )}
        {state.currentStep === 2 && branchData && (
          <DoctorSelection doctors={branchData.doctors} />
        )}
        {state.currentStep === 3 && (
          <DateTimeSelection branchId={branchId} />
        )}
        {state.currentStep === 4 && clinicData && branchData && (
          <BookingConfirmation
            clinic={clinicData}
            branch={branchData}
          />
        )}
      </div>
    </PatientLayout>
  );
}
