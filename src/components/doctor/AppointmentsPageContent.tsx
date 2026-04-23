'use client';

import { useState } from 'react';
import AppointmentsSchedule from '@/components/doctor/AppointmentsSchedule';
import ClinicRecordsPanel from '@/components/records/ClinicRecordsPanel';

interface Props {
  highlightId?:  string;
  initialDate?:  string;
  initialTab?:   string;
  initialSearch?: string;
  initialFrom?:  string;
  initialTo?:    string;
}

export default function AppointmentsPageContent({
  highlightId,
  initialDate,
  initialTab,
  initialSearch,
  initialFrom,
  initialTo,
}: Props) {
  const [tab, setTab] = useState<'schedule' | 'records'>(
    initialTab === 'records' ? 'records' : 'schedule'
  );

  return (
    <div className="space-y-4" dir="rtl">
      {/* Tabs */}
      <div className="flex bg-secondary/50 rounded-lg p-1 gap-1 w-fit">
        <button
          onClick={() => setTab('schedule')}
          className={`px-5 py-2 text-sm rounded-md font-medium transition-all ${
            tab === 'schedule'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          الجدول اليومي
        </button>
        <button
          onClick={() => setTab('records')}
          className={`px-5 py-2 text-sm rounded-md font-medium transition-all ${
            tab === 'records'
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          سجل المواعيد
        </button>
      </div>

      {tab === 'schedule' ? (
        <AppointmentsSchedule highlightId={highlightId} initialDate={initialDate} />
      ) : (
        <ClinicRecordsPanel
          initialSearch={initialSearch}
          initialFrom={initialFrom}
          initialTo={initialTo}
        />
      )}
    </div>
  );
}