'use client';

import { useState } from 'react';
import DoctorLayout from '@/components/layouts/DoctorLayout';
import StaffLabPanel from '@/components/staff/lab/StaffLabPanel';
import CreateLabOrderModal from '@/components/doctor/lab/CreateLabOrderModal';

export default function DoctorLabPage() {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <DoctorLayout title="طلبات المختبر" subtitle="إنشاء ومتابعة طلبات المختبرات الخارجية">
      <StaffLabPanel
        actionButton={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            + طلب مختبر جديد
          </button>
        }
      />

      {showCreate && (
        <CreateLabOrderModal
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); window.location.reload(); }}
        />
      )}
    </DoctorLayout>
  );
}
