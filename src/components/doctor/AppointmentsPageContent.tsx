'use client';

import AppointmentsSchedule from '@/components/doctor/AppointmentsSchedule';

interface Props {
  highlightId?:   string;
  initialDate?:   string;
  initialTab?:    string;
  initialSearch?: string;
  initialFrom?:   string;
  initialTo?:     string;
}

export default function AppointmentsPageContent({ highlightId, initialDate, initialSearch, initialFrom, initialTo }: Props) {
  return (
    <AppointmentsSchedule
      highlightId={highlightId}
      initialDate={initialDate}
      initialSearch={initialSearch}
      initialFrom={initialFrom}
      initialTo={initialTo}
    />
  );
}