'use client';

import PatientsList from '@/components/records/PatientsList';

interface Props {
  initialSearch?:   string;
  initialClinicId?: string;
  initialBranchId?: string;
}

export default function PatientsPageContent({ initialSearch, initialClinicId, initialBranchId }: Props) {
  return <PatientsList initialSearch={initialSearch} initialClinicId={initialClinicId} initialBranchId={initialBranchId} />;
}