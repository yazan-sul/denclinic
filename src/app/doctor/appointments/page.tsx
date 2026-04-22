import DoctorLayout from '@/components/layouts/DoctorLayout';
import AppointmentsSchedule from '@/components/doctor/AppointmentsSchedule';

interface Props {
  searchParams: Promise<{ id?: string; date?: string }>;
}

export default async function AppointmentsPage({ searchParams }: Props) {
  const { id, date } = await searchParams;
  return (
    <DoctorLayout title="المواعيد" subtitle="عرض وإدارة مواعيد المرضى">
      <AppointmentsSchedule highlightId={id} initialDate={date} />
    </DoctorLayout>
  );
}
