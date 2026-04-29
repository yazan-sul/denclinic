'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { StarIcon } from '@/components/Icons';
import { formatPhone } from '@/lib/format';

interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  distance?: number;
  clinic: {
    id: number;
    name: string;
    specialty: string;
    rating: number;
    reviewCount: number;
    logo: string | null;
  };
}

interface Props {
  branches: Branch[];
}

const NearbyClinicsList = ({ branches }: Props) => {
  const itemRefs = useRef<Record<number, HTMLDivElement | null>>({});

  return (
    <div className="space-y-3">
      <style jsx>{`
        @keyframes selection-pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4); }
          50% { transform: scale(1.02); box-shadow: 0 0 0 10px rgba(37, 99, 235, 0); }
          100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
        }
        .animate-selection {
          animation: selection-pulse 0.8s cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

      {branches.map((branch) => (
        <div
          key={branch.id}
          ref={(el) => { itemRefs.current[branch.id] = el; }}
          className="bg-card rounded-xl p-4 shadow border border-border hover:shadow-md transition-all"
        >
          {/* Header: clinic name + specialty + distance */}
          <div className="flex items-start justify-between mb-2">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-foreground truncate">{branch.clinic.name}</h3>
              <p className="text-xs text-muted-foreground">{branch.clinic.specialty}</p>
            </div>
            {branch.distance !== undefined && (
              <div className="text-right bg-secondary px-2.5 py-1 rounded-lg shrink-0 mr-2">
                <p className="text-xs text-muted-foreground">المسافة</p>
                <p className="text-sm font-bold text-foreground">{branch.distance.toFixed(1)} كم</p>
              </div>
            )}
          </div>

          {/* Branch name (if different from clinic) */}
          {branch.name && branch.name !== branch.clinic.name && (
            <p className="text-sm font-medium text-primary mb-2">🏢 {branch.name}</p>
          )}

          {/* Address */}
          <p className="text-sm text-foreground mb-2 leading-relaxed">📍 {branch.address}</p>

          {/* Phone */}
          {branch.phone && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
              <span>📞</span>
              <span dir="ltr">{formatPhone(branch.phone)}</span>
            </div>
          )}

          {/* Rating */}
          <div className="flex items-center gap-2 mb-3">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <StarIcon
                  key={i}
                  className={`w-3.5 h-3.5 ${i < Math.round(branch.clinic.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                />
              ))}
            </div>
            <span className="text-sm font-medium">{branch.clinic.rating.toFixed(1)}</span>
            <span className="text-xs text-muted-foreground">({branch.clinic.reviewCount} تقييم)</span>
          </div>

          {/* 3 Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <Link
              href={`/patient/booking?clinicId=${branch.clinic.id}&branchId=${branch.id}`}
              className="py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity text-center"
            >
              احجز موعد
            </Link>
            <Link
              href={`/patient/clinics/${branch.clinic.id}`}
              className="py-2 bg-secondary text-foreground rounded-lg text-xs font-semibold border border-border hover:bg-muted transition-colors text-center"
            >
              صفحة العيادة
            </Link>
            <Link
              href={`/patient/branches/${branch.id}`}
              className="py-2 bg-secondary text-foreground rounded-lg text-xs font-semibold border border-border hover:bg-muted transition-colors text-center"
            >
              صفحة الفرع
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NearbyClinicsList;