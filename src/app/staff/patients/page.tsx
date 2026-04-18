'use client';

import StaffLayout from '@/components/layouts/StaffLayout';
import StaffPatientsPanel from '@/components/staff/patients/StaffPatientsPanel';

export default function StaffPatientsPage() {
  return (
    <StaffLayout title="المرضى" subtitle="بحث وسجلات المرضى">
      <StaffPatientsPanel />
    </StaffLayout>
  );
}
