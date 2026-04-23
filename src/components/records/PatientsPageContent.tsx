'use client';

import PatientsList from '@/components/records/PatientsList';

interface Props {
  initialSearch?: string;
}

export default function PatientsPageContent({ initialSearch }: Props) {
  return <PatientsList initialSearch={initialSearch} />;
}