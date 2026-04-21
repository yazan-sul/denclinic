import DoctorLayout from '@/components/layouts/DoctorLayout';
import ClinicRecordsPanel from '@/components/records/ClinicRecordsPanel';

export default function PatientsPage() {
  return (
    <DoctorLayout title="المرضى" subtitle="عرض سجلات المرضى وملفاتهم الطبية">
      <ClinicRecordsPanel />
    </DoctorLayout>
  );
}
