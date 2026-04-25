import DoctorLayout from '@/components/layouts/DoctorLayout';
import PatientsPageContent from '@/components/records/PatientsPageContent';

interface Props {
  searchParams: Promise<{ search?: string; clinicId?: string; branchId?: string }>;
}

export default async function PatientsPage({ searchParams }: Props) {
  const { search, clinicId, branchId } = await searchParams;
  return (
    <DoctorLayout title="المرضى" subtitle="عرض قائمة المرضى وملفاتهم الطبية">
      <PatientsPageContent initialSearch={search} initialClinicId={clinicId} initialBranchId={branchId} />
    </DoctorLayout>
  );
}