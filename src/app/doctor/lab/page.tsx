import DoctorLayout from '@/components/layouts/DoctorLayout';
import LabCasesPanel from '@/components/doctor/lab/LabCasesPanel';

export default function LabPage() {
  return (
    <DoctorLayout title="حالات المختبر" subtitle="متابعة وإدارة حالات المختبر المرتبطة بالمرضى">
      <LabCasesPanel />
    </DoctorLayout>
  );
}