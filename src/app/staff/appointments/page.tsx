import StaffLayout from '@/components/layouts/StaffLayout';
import StaffAppointmentsPanel from '@/components/staff/appointments/StaffAppointmentsPanel';

interface Props {
  searchParams: Promise<{ date?: string }>;
}

export default async function StaffAppointmentsPage({ searchParams }: Props) {
  const { date } = await searchParams;
  return (
    <StaffLayout title="المواعيد" subtitle="إدارة مواعيد المرضى">
      <StaffAppointmentsPanel initialDate={date} />
    </StaffLayout>
  );
}
