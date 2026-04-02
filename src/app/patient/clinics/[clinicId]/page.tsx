'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import PatientLayout from '@/components/layouts/PatientLayout';

// Loading placeholder for map
const MapPlaceholder = () => (
  <div className="w-full h-80 rounded-lg bg-secondary flex items-center justify-center border border-border">
    <p className="text-muted-foreground">جاري تحميل الخريطة...</p>
  </div>
);

// Dynamically import map with SSR disabled
const ClinicMapModule = dynamic(() => import('@/components/patient/ClinicMapModule'), {
  ssr: false,
  loading: MapPlaceholder,
});

interface Branch {
  id: number;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
}

interface Service {
  id: number;
  name: string;
  description: string;
  icon: string;
}

interface Rating {
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    name: string;
  };
}

interface Clinic {
  id: number;
  name: string;
  specialty: string;
  branches: Branch[];
  services: Service[];
  ratings: Rating[];
}

export default function ClinicProfile() {
  const params = useParams();
  const clinicId = params.clinicId as string;
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    const fetchClinic = async () => {
      try {
        const response = await fetch(`/api/clinic/${clinicId}`);
        if (!response.ok) throw new Error('Failed to fetch clinic');
        const result = await response.json();
        // Unwrap the response if it's wrapped in { success, data }
        const clinicData = result.data || result;
        setClinic(clinicData);

        // Calculate average rating
        if (clinicData.ratings && clinicData.ratings.length > 0) {
          const avg =
            clinicData.ratings.reduce((sum: number, r: Rating) => sum + r.rating, 0) /
            clinicData.ratings.length;
          setAverageRating(avg);
        }
      } catch (error) {
        console.error('Error fetching clinic:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClinic();
  }, [clinicId]);

  if (loading) {
    return (
      <PatientLayout title="تحميل..." showBackButton backHref="/patient">
        <div className="text-center py-8">
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </PatientLayout>
    );
  }

  if (!clinic) {
    return (
      <PatientLayout title="خطأ" showBackButton backHref="/patient">
        <div className="text-center py-8">
          <p className="text-muted-foreground">العيادة غير موجودة</p>
        </div>
      </PatientLayout>
    );
  }

  return (
    <PatientLayout 
      title={clinic.name}
      subtitle={clinic.specialty}
      showBackButton 
      backHref="/patient"
    >
      <div className="space-y-6">
        {/* Clinic Map */}
        {clinic.branches.length > 0 && (
          <div className="bg-card p-4 rounded-lg border border-border">
            <h2 className="text-lg font-semibold mb-4">موقع العيادة على الخريطة</h2>
            <ClinicMapModule branches={clinic.branches} clinicName={clinic.name} />
          </div>
        )}

        {/* Rating */}
        {clinic.ratings.length > 0 && (
          <div className="bg-card p-4 rounded-lg border border-border">
            <h2 className="text-lg font-semibold mb-2">التقييمات</h2>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl font-bold text-primary">
                {averageRating.toFixed(1)}
              </span>
              <span className="text-yellow-400">{'⭐'.repeat(Math.round(averageRating))}</span>
            </div>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {clinic.ratings.map((rating, idx) => (
                <div key={idx} className="border-t border-border pt-2">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold">{rating.user?.name || 'مستخدم'}</span>
                    <span className="text-yellow-400">{'⭐'.repeat(rating.rating)}</span>
                  </div>
                  {rating.comment && <p className="text-sm text-muted-foreground mt-1">{rating.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Services */}
        {clinic.services.length > 0 && (
          <div className="bg-card p-4 rounded-lg border border-border">
            <h2 className="text-lg font-semibold mb-4">الخدمات</h2>
            <div className="grid grid-cols-2 gap-3">
              {clinic.services.map((service) => (
                <div
                  key={service.id}
                  className="p-3 bg-muted rounded-lg border border-border text-center"
                >
                  <div className="text-2xl mb-1">{service.icon}</div>
                  <h3 className="font-semibold text-sm">{service.name}</h3>
                  {service.description && (
                    <p className="text-xs text-muted-foreground mt-1">{service.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Branches */}
        {clinic.branches.length > 0 && (
          <div className="bg-card p-4 rounded-lg border border-border">
            <h2 className="text-lg font-semibold mb-4">الفروع</h2>
            <div className="space-y-3">
              {clinic.branches.map((branch) => (
                <Link
                  key={branch.id}
                  href={`/patient/booking?branchId=${branch.id}&clinicId=${clinic.id}`}
                  className="block p-4 border border-border rounded-lg hover:bg-muted transition-colors"
                >
                  <h3 className="font-semibold mb-2">{branch.name}</h3>
                  <p className="text-sm text-muted-foreground mb-2">{branch.address}</p>
                  <p className="text-sm font-mono">{branch.phone}</p>
                  <div className="mt-3 text-primary font-semibold">احجز موعد →</div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
