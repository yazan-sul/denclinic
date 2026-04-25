'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { StarIcon } from '@/components/Icons';

interface Clinic {
  id: number;
  name: string;
  specialty: string;
  address: string;
  city: string;
  phone: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  distance?: number;
  branches?: Array<{
    id: number;
    name?: string;
  }>;
}

interface NearbyClinicListProps {
  clinics: Clinic[];
  selectedClinicId?: number | null;
  onClinicSelect?: (id: number) => void;
}

const NearbyClinicsList = ({ clinics, selectedClinicId, onClinicSelect }: NearbyClinicListProps) => {
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    if (selectedClinicId && itemRefs.current[selectedClinicId]) {
      itemRefs.current[selectedClinicId]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedClinicId]);

  return (
    <div ref={listRef} className="space-y-3">
      {clinics.map((clinic) => {
        const firstBranchId = clinic.branches?.[0]?.id;
        const isSelected = selectedClinicId === clinic.id;

        return (
        <div 
          key={clinic.id} 
          ref={(el) => { itemRefs.current[clinic.id] = el; }}
          onClick={() => onClinicSelect?.(clinic.id)}
          className={`bg-card rounded-lg p-4 shadow border transition-all cursor-pointer ${
            isSelected 
              ? 'border-primary ring-2 ring-primary/20 shadow-lg' 
              : 'border-border hover:shadow-md'
          }`}
        >
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="text-lg font-bold text-foreground">{clinic.name}</h3>
              <p className="text-sm text-muted-foreground">{clinic.specialty}</p>
            </div>
            {clinic.distance && (
              <div className="text-right bg-secondary px-3 py-1 rounded-lg">
                <p className="text-xs text-muted-foreground">المسافة</p>
                <p className="text-sm font-bold text-foreground">
                  {clinic.distance.toFixed(1)} كم
                </p>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="mb-3">
            <p className="text-sm text-foreground">
              📍 {clinic.address}, {clinic.city}
            </p>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <StarIcon
                  key={i}
                  className={`w-4 h-4 ${
                    i < Math.round(clinic.rating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm font-medium text-foreground">
              {clinic.rating.toFixed(1)} / 5
            </span>
            <span className="text-xs text-muted-foreground">
              ({clinic.reviewCount} تقييم)
            </span>
          </div>

          {/* Phone */}
          {clinic.phone && (
            <div className="mb-4">
              <p className="text-sm text-foreground">☎️ {clinic.phone}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
            {firstBranchId ? (
              <Link
                href={`/patient/booking?clinicId=${clinic.id}&branchId=${firstBranchId}`}
                className="flex-1 bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity text-center"
              >
                احجز الآن
              </Link>
            ) : (
              <span className="flex-1 bg-muted text-muted-foreground px-4 py-2 rounded-lg font-medium text-center cursor-not-allowed">
                لا يوجد فرع متاح
              </span>
            )}
            <Link
              href={`/patient/clinics/${clinic.id}`}
              className="flex-1 bg-secondary text-foreground px-4 py-2 rounded-lg font-medium border border-border hover:bg-muted transition-colors text-center"
            >
              صفحة العيادة
            </Link>
          </div>
        </div>
      );
      })}
    </div>
  );
};

export default NearbyClinicsList;
