'use client';

import React from 'react';
import { useBooking } from '@/context/BookingContext';
import { StarIcon } from '@/components/Icons';

interface DoctorService {
  id: number;
  name: string;
}

interface Doctor {
  id: number;
  name?: string;
  specialization: string;
  experience: number;
  bio: string;
  avatar?: string | null;
  rating?: number;
  reviewCount?: number;
  services?: DoctorService[];
  servicesOffered?: DoctorService[];
  user?: {
    name: string;
  };
}

interface DoctorSelectionProps {
  doctors: Doctor[];
}

export default function DoctorSelection({ doctors }: DoctorSelectionProps) {
  const { state, dispatch } = useBooking();

  const filteredDoctors = doctors.filter((doctor) => {
    if (!state.serviceId) {
      return true;
    }

    const services = doctor.services || doctor.servicesOffered || [];
    return services.some((service) => service.id === state.serviceId);
  });

  const hasValidSelectedDoctor = filteredDoctors.some((doctor) => doctor.id === state.doctorId);

  const handleSelectDoctor = (doctorId: number) => {
    dispatch({ type: 'SET_DOCTOR', payload: doctorId });
    dispatch({ type: 'SET_STEP', payload: 3 });
  };

  return (
    <div className="space-y-3">
      {filteredDoctors.length > 0 ? (
        filteredDoctors.map((doctor) => {
          const doctorName = doctor.name || doctor.user?.name || 'طبيب';
          const services = doctor.services || doctor.servicesOffered || [];
          const rating = typeof doctor.rating === 'number' ? doctor.rating.toFixed(1) : '-';
          const avatarUrl = doctor.avatar || '/icons/icon-192x192.png';
          
          return (
          <button
            key={doctor.id}
            onClick={() => handleSelectDoctor(doctor.id)}
            className={`w-full p-4 rounded-lg border-2 transition-all text-right ${
              state.doctorId === doctor.id
                ? 'border-primary bg-primary/10'
                : 'border-border bg-card hover:border-primary/50 hover:bg-muted'
            }`}
          >
            <div className="flex items-start gap-3">
              {/* Avatar */}
              <img
                src={avatarUrl}
                alt={doctorName}
                className="w-12 h-12 rounded-full object-cover flex-shrink-0 bg-primary/20"
              />

              {/* Info */}
              <div className="flex-1">
                <h3 className="font-semibold text-lg">{doctorName}</h3>
                <p className="text-sm text-muted-foreground">
                  {doctor.specialization}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {doctor.experience || 0} سنوات خبرة
                </p>

                {doctor.bio && (
                  <p className="text-sm mt-2 text-muted-foreground">
                    {doctor.bio}
                  </p>
                )}

                {services.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {services.slice(0, 3).map((service) => (
                      <span
                        key={service.id}
                        className="text-xs bg-primary/20 text-primary px-2 py-1 rounded"
                      >
                        {service.name}
                      </span>
                    ))}
                    {services.length > 3 && (
                      <span className="text-xs text-muted-foreground px-2 py-1">
                        +{services.length - 3} خدمات أخرى
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Rating */}
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <StarIcon className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span className="text-xs font-semibold">{rating}</span>
              </div>
            </div>
          </button>
        );
        })
      ) : (
        <div className="text-center py-8">
          <p className="text-muted-foreground">لا يوجد أطباء يقدمون هذه الخدمة في هذا الفرع</p>
        </div>
      )}

      {/* Continue Button */}
      {hasValidSelectedDoctor && (
        <button
          onClick={() => dispatch({ type: 'SET_STEP', payload: 3 })}
          className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity mt-4"
        >
          المتابعة →
        </button>
      )}
    </div>
  );
}
