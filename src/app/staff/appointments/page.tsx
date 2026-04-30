'use client';

import StaffLayout from '@/components/layouts/StaffLayout';
import StaffAppointmentsPanel from '@/components/staff/appointments/StaffAppointmentsPanel';

export default function StaffAppointmentsPage() {
  return (
    <StaffLayout title="المواعيد" subtitle="إدارة مواعيد المرضى">
      <StaffAppointmentsPanel />
    </StaffLayout>
  );
}
