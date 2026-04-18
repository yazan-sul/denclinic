'use client';

import AdminLayout from '@/components/layouts/AdminLayout';
import BranchesPanel from '@/components/admin/branches/BranchesPanel';

export default function BranchesPage() {
  return (
    <AdminLayout title="إدارة الفروع" subtitle="عرض وإدارة فروع العيادة">
      <BranchesPanel />
    </AdminLayout>
  );
}
