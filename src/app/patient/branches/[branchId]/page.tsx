'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import PatientLayout from '@/components/layouts/PatientLayout';

interface BranchProfile {
  id: number;
  name: string;
  address: string;
  phone: string;
  rating: number;
  reviewCount: number;
  clinic: {
    id: number;
    name: string;
    specialty: string;
  };
  services: {
    id: number;
    name: string;
    description?: string;
    icon: string;
  }[];
  doctors: {
    id: number;
    specialization: string;
    experience?: number;
    bio?: string;
    rating?: number;
    user?: {
      name: string;
    };
  }[];
}

export default function BranchProfilePage() {
  const params = useParams();
  const branchIdParam = params.branchId;
  const branchId = Array.isArray(branchIdParam) ? branchIdParam[0] : branchIdParam;
  const [branch, setBranch] = useState<BranchProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!branchId || Number.isNaN(Number(branchId))) {
      setErrorMessage('معرف الفرع غير صالح');
      setLoading(false);
      return;
    }

    const fetchBranch = async () => {
      try {
        const response = await fetch(`/api/branch/${encodeURIComponent(branchId)}`);
        if (!response.ok) {
          let apiMessage = '';

          try {
            const errorBody = await response.json();
            apiMessage =
              errorBody?.error?.message ||
              errorBody?.message ||
              '';
          } catch {
            apiMessage = '';
          }

          throw new Error(apiMessage || `Failed to fetch branch (${response.status})`);
        }

        const result = await response.json();
        setBranch(result.data || result);
        setErrorMessage(null);
      } catch (error) {
        console.error('Error fetching branch:', error);
        setErrorMessage(error instanceof Error ? error.message : 'حدث خطأ أثناء تحميل بيانات الفرع');
      } finally {
        setLoading(false);
      }
    };

    fetchBranch();
  }, [branchId]);

  if (loading) {
    return (
      <PatientLayout title="تحميل..." showBackButton backHref="/patient">
        <div className="text-center py-8">
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </PatientLayout>
    );
  }

  if (!branch) {
    return (
      <PatientLayout title="خطأ" showBackButton backHref="/patient">
        <div className="text-center py-8">
          <p className="text-muted-foreground">{errorMessage || 'الفرع غير موجود'}</p>
        </div>
      </PatientLayout>
    );
  }

  const reserveHref = `/patient/booking?branchId=${branch.id}&clinicId=${branch.clinic.id}`;
  const roundedRating = Math.max(1, Math.round(branch.rating));

  return (
    <PatientLayout
      title={branch.name}
      subtitle={`${branch.clinic.name} • ${branch.clinic.specialty}`}
      showBackButton
      backHref={`/patient/clinics/${branch.clinic.id}`}
    >
      <div className="mx-auto w-full max-w-6xl space-y-5 md:space-y-7">
        <section className="rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/40 p-5 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <span className="inline-flex items-center rounded-full border border-border bg-background/80 px-3 py-1 text-xs text-muted-foreground">
                {branch.clinic.name}
              </span>
              <h2 className="mt-3 text-xl md:text-2xl font-bold tracking-tight">{branch.name}</h2>
              <p className="mt-2 text-sm md:text-base text-muted-foreground">{branch.address}</p>
            </div>
            <Link
              href={reserveHref}
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              احجز موعد
            </Link>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <div className="rounded-lg border border-border bg-background/80 p-3">
              <p className="text-xs text-muted-foreground mb-1">التقييم</p>
              <p className="text-lg font-bold text-primary">{branch.rating.toFixed(1)}</p>
            </div>
            <div className="rounded-lg border border-border bg-background/80 p-3">
              <p className="text-xs text-muted-foreground mb-1">المراجعات</p>
              <p className="text-lg font-bold">{branch.reviewCount}</p>
            </div>
            <div className="rounded-lg border border-border bg-background/80 p-3">
              <p className="text-xs text-muted-foreground mb-1">الخدمات</p>
              <p className="text-lg font-bold">{branch.services.length}</p>
            </div>
            <div className="rounded-lg border border-border bg-background/80 p-3">
              <p className="text-xs text-muted-foreground mb-1">الأطباء</p>
              <p className="text-lg font-bold">{branch.doctors.length}</p>
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-5">
            {branch.services.length > 0 && (
              <section className="bg-card p-4 md:p-6 rounded-xl border border-border">
                <h3 className="text-base md:text-lg font-semibold mb-4">الخدمات المتاحة</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {branch.services.map((service) => (
                    <div
                      key={service.id}
                      className="group rounded-lg border border-border bg-muted/50 p-4 transition-colors hover:bg-muted"
                    >
                      <div className="mb-2 text-2xl">{service.icon}</div>
                      <h4 className="font-semibold text-sm md:text-base">{service.name}</h4>
                      {service.description && (
                        <p className="mt-1 text-xs md:text-sm text-muted-foreground line-clamp-2">
                          {service.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {branch.doctors.length > 0 && (
              <section className="bg-card p-4 md:p-6 rounded-xl border border-border">
                <h3 className="text-base md:text-lg font-semibold mb-4">الأطباء في هذا الفرع</h3>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {branch.doctors.map((doctor) => (
                    <article key={doctor.id} className="rounded-lg border border-border bg-muted/40 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-sm md:text-base">{doctor.user?.name || 'طبيب'}</h4>
                          <p className="text-sm text-muted-foreground">{doctor.specialization}</p>
                        </div>
                        {typeof doctor.rating === 'number' && (
                          <span className="rounded-md bg-background px-2 py-1 text-xs font-medium text-yellow-600">
                            ⭐ {doctor.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                      {doctor.experience ? (
                        <p className="mt-2 text-xs text-muted-foreground">
                          سنوات الخبرة: {doctor.experience}
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="h-fit lg:sticky lg:top-6">
            <section className="rounded-xl border border-border bg-card p-4 md:p-5">
              <h3 className="text-sm font-semibold mb-3">ملخص الفرع</h3>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                  <p className="font-mono mt-1">{branch.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">التقييم العام</p>
                  <p className="mt-1 font-semibold">
                    {branch.rating.toFixed(1)} <span className="text-yellow-500">{'⭐'.repeat(roundedRating)}</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">التخصص</p>
                  <p className="mt-1">{branch.clinic.specialty}</p>
                </div>
              </div>

           
            </section>
          </aside>
        </div>
      </div>
    </PatientLayout>
  );
}
