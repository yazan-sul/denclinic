'use client';

import AdminLayout from '@/components/layouts/AdminLayout';
import ReportsPanel from '@/components/admin/reports/ReportsPanel';

export default function ReportsPage() {
  return (
    <AdminLayout title="التقارير" subtitle="تقارير الأداء والإيرادات والمرضى">
      <ReportsPanel />
    </AdminLayout>
  );
}
