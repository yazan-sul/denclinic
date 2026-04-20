'use client';

import StaffLayout from '@/components/layouts/StaffLayout';
import StaffPaymentsPanel from '@/components/staff/payments/StaffPaymentsPanel';

export default function StaffPaymentsPage() {
  return (
    <StaffLayout title="المدفوعات" subtitle="تسجيل مدفوعات واستردادات">
      <StaffPaymentsPanel />
    </StaffLayout>
  );
}
