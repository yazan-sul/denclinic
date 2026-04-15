import DoctorLayout from '@/components/layouts/DoctorLayout';
import PatientRecordsView from '@/components/doctor/PatientRecordsView';

export default function PatientsPage() {
  return (
    <DoctorLayout title="المرضى" subtitle="عرض سجلات المرضى وملفاتهم الطبية">
      <PatientRecordsView />
    </DoctorLayout>
  );
}
