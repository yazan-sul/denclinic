import DoctorLayout from '@/components/layouts/DoctorLayout';
import AppointmentsSchedule from '@/components/doctor/AppointmentsSchedule';

export default function AppointmentsPage() {
  return (
    <DoctorLayout title="المواعيد" subtitle="عرض وإدارة مواعيد المرضى">
      <AppointmentsSchedule />
    </DoctorLayout>
  );
}
