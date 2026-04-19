'use client';

import StaffLayout from '@/components/layouts/StaffLayout';
import StaffLabPanel from '@/components/staff/lab/StaffLabPanel';

export default function StaffLabPage() {
  return (
    <StaffLayout title="المختبرات" subtitle="إدارة حالات المختبر">
      <StaffLabPanel />
    </StaffLayout>
  );
}
