import DoctorLayout from '@/components/layouts/DoctorLayout';
import DoctorDashboard from '@/components/doctor/DoctorDashboard';

export default function DoctorPage() {
  return (
    <DoctorLayout title="الرئيسية" subtitle="مرحبا بك في لوحة التحكم">
      <DoctorDashboard />
    </DoctorLayout>
  );
}
