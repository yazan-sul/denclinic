import DoctorLayout from '@/components/layouts/DoctorLayout';
import AppointmentsPageContent from '@/components/doctor/AppointmentsPageContent';

interface Props {
  searchParams: Promise<{ id?: string; date?: string; tab?: string; search?: string; from?: string; to?: string }>;
}

export default async function AppointmentsPage({ searchParams }: Props) {
  const { id, date, tab, search, from, to } = await searchParams;
  return (
    <DoctorLayout title="المواعيد" subtitle="عرض وإدارة مواعيد المرضى">
      <AppointmentsPageContent
        highlightId={id}
        initialDate={date}
        initialTab={tab}
        initialSearch={search}
        initialFrom={from}
        initialTo={to}
      />
    </DoctorLayout>
  );
}