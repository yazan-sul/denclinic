'use client';

import PatientLayout from '@/components/layouts/PatientLayout';
import SectionCard from '../components/SectionCard';
import DashboardPasswordResetForm from '@/features/auth/DashboardPasswordResetForm';

export default function ChangePasswordPage() {
  return (
    <PatientLayout
      title="تغيير كلمة المرور"
      subtitle="حدّث كلمة مرورك للحفاظ على أمان حسابك"
      showBackButton
      backHref="/patient/settings"
    >
      <div className="flex justify-center">
        <div className="w-full max-w-lg space-y-6 pb-8">
          <SectionCard title="كلمة المرور">
            <div className="px-6 py-4">
              <DashboardPasswordResetForm />
            </div>
          </SectionCard>
        </div>
      </div>
    </PatientLayout>
  );
}
