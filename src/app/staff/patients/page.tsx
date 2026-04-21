'use client';

import StaffLayout from '@/components/layouts/StaffLayout';
import ClinicRecordsPanel from '@/components/records/ClinicRecordsPanel';

export default function StaffPatientsPage() {
  return (
    <StaffLayout title="المرضى" subtitle="بحث وسجلات المرضى">
      <ClinicRecordsPanel />
    </StaffLayout>
  );
}
