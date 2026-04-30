'use client';

import StaffLayout from '@/components/layouts/StaffLayout';
import StaffSettingsPanel from '@/components/staff/settings/StaffSettingsPanel';
import AccountSwitcherMobile from '@/components/mobile/AccountSwitcherMobile';

export default function StaffSettingsPage() {
  return (
    <StaffLayout title="الإعدادات" subtitle="الملف الشخصي والتفضيلات">
      <div className="md:hidden mb-2">
        <AccountSwitcherMobile />
      </div>
      <StaffSettingsPanel />
    </StaffLayout>
  );
}
