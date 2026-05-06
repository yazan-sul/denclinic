import AdminLayout from '@/components/layouts/AdminLayout';
import AdminSettingsShell from '@/components/admin/settings/AdminSettingsShell';
import AdminAccountSettingsPanel from '@/components/admin/settings/AdminAccountSettingsPanel';

export default function AccountSettingsPage() {
  return (
    <AdminLayout title="Settings" subtitle="Manage dashboard security and app preferences">
      <AdminSettingsShell
        title="Account"
        description="Review account details and manage your current dashboard session."
      >
        <AdminAccountSettingsPanel />
      </AdminSettingsShell>
    </AdminLayout>
  );
}
