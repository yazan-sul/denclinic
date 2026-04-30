'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import PatientLayout from '@/components/layouts/PatientLayout';
import { formatPhone } from '@/lib/format';

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

        {/* Branches */}
        {clinic.branches.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold">الفروع</h2>
            {clinic.branches.map((branch) => (
              <div key={branch.id} className="bg-card border border-border rounded-xl p-4">
                <div className="mb-3">
                  <h3 className="font-semibold text-base">{branch.name}</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">📍 {branch.address}</p>
                  {branch.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>📞</span>
                      <span dir="ltr">{formatPhone(branch.phone)}</span>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Link
                    href={`/patient/booking?clinicId=${clinic.id}&branchId=${branch.id}`}
                    className="py-2.5 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:opacity-90 transition-opacity text-center"
                  >
                    احجز موعد
                  </Link>
                  <Link
                    href={`/patient/branches/${branch.id}`}
                    className="py-2.5 bg-secondary text-foreground rounded-lg text-xs font-semibold border border-border hover:bg-muted transition-colors text-center"
                  >
                    صفحة الفرع
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
