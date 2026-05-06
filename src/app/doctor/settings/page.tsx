'use client';

import DoctorLayout from '@/components/layouts/DoctorLayout';
import Tabs from '@/components/ui/Tabs';
import DoctorSettingsPanel from '@/components/doctor/settings/DoctorSettingsPanel';
import ClinicSettingsPanel from '@/components/doctor/settings/ClinicSettingsPanel';
import AccountSwitcherMobile from '@/components/mobile/AccountSwitcherMobile';
import DashboardPasswordResetForm from '@/features/auth/DashboardPasswordResetForm';

export default function SettingsPage() {
  const tabs = [
    {
      id: 'doctor',
      label: 'بيانات الطبيب',
      content: <DoctorSettingsPanel />,
    },
    {
      id: 'clinic',
      label: 'بيانات العيادة',
      content: <ClinicSettingsPanel />,
    },
    {
      id: 'security',
      label: 'الأمان',
      content: <DashboardPasswordResetForm />,
    },
  ];

  return (
    <DoctorLayout title="الإعدادات" subtitle="إدارة بيانات الطبيب والعيادة والإعدادات العامة">
      <div className="grid gap-6">
        {/* Account Switcher — mobile only */}
        <div className="md:hidden">
          <AccountSwitcherMobile />
        </div>

        <div className="bg-card rounded-lg border border-border p-6">
          <Tabs items={tabs} defaultTab="doctor" />
        </div>
      </div>
    </DoctorLayout>
  );
}
