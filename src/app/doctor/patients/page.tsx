import DoctorLayout from '@/components/layouts/DoctorLayout';
import PatientsPageContent from '@/components/records/PatientsPageContent';

interface Props {
  searchParams: Promise<{ search?: string }>;
}

export default async function PatientsPage({ searchParams }: Props) {
  const { search } = await searchParams;
  return (
    <DoctorLayout title="المرضى" subtitle="عرض قائمة المرضى وملفاتهم الطبية">
      <PatientsPageContent initialSearch={search} />
    </DoctorLayout>
  );
}