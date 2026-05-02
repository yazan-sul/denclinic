import StaffLayout from '@/components/layouts/StaffLayout';
import AppointmentsPageContent from '@/components/doctor/AppointmentsPageContent';

interface Props {
  searchParams: Promise<{ id?: string; date?: string; tab?: string; search?: string; from?: string; to?: string }>;
}

export default async function StaffAppointmentsPage({ searchParams }: Props) {
  const { id, date, tab, search, from, to } = await searchParams;
  return (
    <StaffLayout title="المواعيد" subtitle="إدارة مواعيد المرضى">
      <AppointmentsPageContent
        highlightId={id}
        initialDate={date}
        initialTab={tab}
        initialSearch={search}
        initialFrom={from}
        initialTo={to}
      />
    </StaffLayout>
  );
}