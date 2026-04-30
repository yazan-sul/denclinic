'use client';

import AdminLayout from '@/components/layouts/AdminLayout';
import AdminDashboard from '@/components/admin/AdminDashboard';

export default function AdminPage() {
  return (
    <AdminLayout title="لوحة التحكم" subtitle="نظرة عامة على أداء العيادة">
      <AdminDashboard />
    </AdminLayout>
  );
}
