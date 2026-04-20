'use client';

import React, { useState, useMemo } from 'react';
import { useBooking } from '@/context/BookingContext';
import { SearchIcon } from '@/components/Icons';

interface Service {
  id: number;
  name: string;
  description: string;
  icon: string;
}

interface ServiceSelectionProps {
  services: Service[];
}

export default function ServiceSelection({ services }: ServiceSelectionProps) {
  const { state, dispatch } = useBooking();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredServices = useMemo(() => {
    return services.filter(
      (service) =>
        service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        service.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [services, searchTerm]);

  const handleSelectService = (serviceId: number) => {
    if (state.serviceId !== serviceId) {
      dispatch({ type: 'CLEAR_DOCTOR' });
      dispatch({ type: 'CLEAR_DATE_TIME' });
    }

    dispatch({ type: 'SET_SERVICE', payload: serviceId });
    dispatch({ type: 'SET_STEP', payload: 2 });
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative">
        <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="text"
          placeholder="ابحث عن خدمة..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-4 pr-10 py-3 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
        />
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 gap-3">
        {filteredServices.length > 0 ? (
          filteredServices.map((service) => (
            <button
              key={service.id}
              onClick={() => handleSelectService(service.id)}
              className={`p-4 rounded-lg border-2 transition-all text-right ${
                state.serviceId === service.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-primary/50 hover:bg-muted'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="text-3xl">{service.icon}</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {service.description}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">لا توجد خدمات مطابقة</p>
          </div>
        )}
      </div>

      {/* Continue Button */}
      {state.serviceId && (
        <button
          onClick={() => dispatch({ type: 'SET_STEP', payload: 2 })}
          className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-lg hover:opacity-90 transition-opacity"
        >
          المتابعة →
        </button>
      )}
    </div>
  );
}
