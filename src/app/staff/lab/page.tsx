import StaffLayout from '@/components/layouts/StaffLayout';
import LabCasesPanel from '@/components/doctor/lab/LabCasesPanel';

export default function StaffLabPage() {
  return (
    <StaffLayout title="حالات المختبر" subtitle="متابعة وإدارة حالات المختبر المرتبطة بالمرضى">
      <LabCasesPanel />
    </StaffLayout>
  );
}