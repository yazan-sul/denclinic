'use client';

import DoctorLayout from '@/components/layouts/DoctorLayout';
import ReportsPanel from '@/components/doctor/reports/ReportsPanel';

export default function ReportsPage() {
  return (
    <DoctorLayout title="التقارير والإحصائيات" subtitle="عرض تحليلي لأداء العيادة والمواعيد والمرضى">
      <ReportsPanel />
    </DoctorLayout>
  );
}
