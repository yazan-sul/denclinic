'use client';

import { useRouter } from 'next/navigation';
import PatientLayout from '@/components/layouts/PatientLayout';
import ProfileCard from './components/ProfileCard';
import SectionCard from './components/SectionCard';
import SettingRow from './components/SettingRow';
import { useSettingsState } from './hooks/useSettingsState';
import { useAuth } from '@/context/AuthContext';
import AccountSwitcherMobile from '@/components/mobile/AccountSwitcherMobile';

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const state = useSettingsState(user);

  const handleLogout = async () => {
    if (confirm('هل أنت متأكد من رغبتك في تسجيل الخروج؟')) {
      await logout();
      router.push('/');
    }
  };

  return (
    <PatientLayout
      title="الإعدادات"
      subtitle="إدارة حسابك والتفضيلات"
      showBackButton
      backHref="/patient"
    >
      <div className="flex justify-center">
        <div className="w-full max-w-lg space-y-4 pb-8">
        {/* Profile Card */}
        <div onClick={() => router.push('/patient/profile')} className="cursor-pointer">
          <ProfileCard
            name={state.profile.name}
            email={state.profile.email}
            onEditPhoto={() => console.log('Edit photo')}
          />
        </div>

        {/* Account Switcher — mobile only */}
        <div className="md:hidden">
          <AccountSwitcherMobile />
        </div>

        {/* Account Settings Section */}
        <SectionCard title="إعدادات الحساب">
          <SettingRow
            icon="👤"
            label="تعديل الملف الشخصي"
            description="تحديث المعلومات الشخصية والعنوان"
            onClick={() => router.push('/patient/settings/edit-profile')}
          />
          <SettingRow
            icon="🔐"
            label="كلمة المرور"
            description="تغيير كلمة المرور الخاصة بك"
            onClick={() => router.push('/patient/settings/change-password')}
          />
        </SectionCard>

        {/* Preferences Section */}
        <SectionCard title="التفضيلات">
          <SettingRow
            icon="🔔"
            label="الإشعارات"
            description="إدارة إشعارات المواعيد والتحديثات"
            onClick={() => router.push('/patient/settings/notifications')}
          />
        </SectionCard>

        {/* App Settings Section */}
        <SectionCard title="إعدادات التطبيق">
          <SettingRow
            icon="🌐"
            label="اللغة"
            description="تغيير لغة التطبيق"
            onClick={() => router.push('/patient/settings/language')}
          />
          <SettingRow
            icon="🌙"
            label="الوضع الداكن"
            description="تفعيل أو تعطيل الوضع الداكن"
            onClick={() => router.push('/patient/settings/dark-mode')}
          />
        </SectionCard>

        {/* Support Section */}
        <SectionCard title="الدعم">
          <SettingRow
            icon="❓"
            label="المساعدة"
            description="الأسئلة الشائعة والدعم"
            onClick={() => router.push('/patient/settings/help')}
          />
          <SettingRow
            icon="🛡️"
            label="سياسة الخصوصية"
            description="اطلع على سياسة البيانات"
            onClick={() => router.push('/patient/settings/privacy-policy')}
          />
        </SectionCard>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="w-full py-3 bg-red-500/10 text-red-600 font-semibold rounded-xl hover:bg-red-500/20 hover:cursor-pointer transition-colors border border-red-200 flex items-center justify-center gap-2"
        >
          <span>🚪</span>
          <span>تسجيل الخروج</span>
        </button>
        </div>
      </div>
    </PatientLayout>
  );
}
