'use client';

import StaffLayout from '@/components/layouts/StaffLayout';
import StaffSettingsPanel from '@/components/staff/settings/StaffSettingsPanel';

export default function StaffSettingsPage() {
  return (
    <StaffLayout title="الإعدادات" subtitle="الملف الشخصي والتفضيلات">
      <StaffSettingsPanel />
    </StaffLayout>
  );
}
