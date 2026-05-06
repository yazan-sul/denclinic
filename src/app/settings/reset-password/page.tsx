import AdminLayout from '@/components/layouts/AdminLayout';
import AdminSettingsShell from '@/components/admin/settings/AdminSettingsShell';
import DashboardPasswordResetForm from '@/features/auth/DashboardPasswordResetForm';

export default function ResetPasswordSettingsPage() {
  return (
    <AdminLayout title="Settings" subtitle="Manage dashboard security and app preferences">
      <AdminSettingsShell
        title="Reset Password"
        description="Update the password for the account you use to access this dashboard."
      >
        <DashboardPasswordResetForm />
      </AdminSettingsShell>
    </AdminLayout>
  );
}
