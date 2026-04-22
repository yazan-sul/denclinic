import DoctorLayout from '@/components/layouts/DoctorLayout';
import ClinicRecordsPanel from '@/components/records/ClinicRecordsPanel';

interface Props {
  searchParams: Promise<{ search?: string; from?: string; to?: string }>;
}

export default async function PatientsPage({ searchParams }: Props) {
  const { search, from, to } = await searchParams;
  return (
    <DoctorLayout title="المرضى" subtitle="عرض سجلات المرضى وملفاتهم الطبية">
      <ClinicRecordsPanel initialSearch={search} initialFrom={from} initialTo={to} />
    </DoctorLayout>
  );
}
