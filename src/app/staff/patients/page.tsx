import StaffLayout from '@/components/layouts/StaffLayout';
import PatientsPageContent from '@/components/records/PatientsPageContent';

interface Props {
  searchParams: Promise<{ search?: string; clinicId?: string; branchId?: string }>;
}

export default async function StaffPatientsPage({ searchParams }: Props) {
  const { search, clinicId, branchId } = await searchParams;
  return (
    <StaffLayout title="المرضى" subtitle="عرض قائمة المرضى وملفاتهم الطبية">
      <PatientsPageContent initialSearch={search} initialClinicId={clinicId} initialBranchId={branchId} />
    </StaffLayout>
  );
}