'use client';

import AdminLayout from '@/components/layouts/AdminLayout';
import PermissionsPanel from '@/components/admin/permissions/PermissionsPanel';

export default function PermissionsPage() {
  return (
    <AdminLayout title="الصلاحيات" subtitle="إدارة صلاحيات الأدوار واستثناءات الأعضاء">
      <PermissionsPanel />
    </AdminLayout>
  );
}
