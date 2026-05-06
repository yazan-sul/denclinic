import AdminLayout from '@/components/layouts/AdminLayout';
import AdminSettingsShell from '@/components/admin/settings/AdminSettingsShell';
import AdminAppSettingsPanel from '@/components/admin/settings/AdminAppSettingsPanel';

export default function AppSettingsPage() {
  return (
    <AdminLayout title="Settings" subtitle="Manage dashboard security and app preferences">
      <AdminSettingsShell
        title="App Settings"
        description="Control notification, email, and SMS preferences for the dashboard."
      >
        <AdminAppSettingsPanel />
      </AdminSettingsShell>
    </AdminLayout>
  );
}
