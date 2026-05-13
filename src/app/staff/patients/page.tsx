import StaffLayout from '@/components/layouts/StaffLayout';
import StaffPatientsPanel from '@/components/staff/patients/StaffPatientsPanel';

export default function StaffPatientsPage() {
  return (
    <StaffLayout title="المرضى" subtitle="إدارة ملفات المرضى وحجز المواعيد">
      <StaffPatientsPanel />
    </StaffLayout>
  );
}