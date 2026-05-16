'use client';

import { useState } from 'react';
import DoctorLayout from '@/components/layouts/DoctorLayout';
import StaffLabPanel from '@/components/staff/lab/StaffLabPanel';
import CreateLabOrderModal from '@/components/doctor/lab/CreateLabOrderModal';

export default function DoctorLabPage() {
  const [showCreate,   setShowCreate]   = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [refreshKey,   setRefreshKey]   = useState(0);

  const handleSaved = () => {
    setShowCreate(false);
    setEditingOrder(null);
    setRefreshKey(k => k + 1);
  };

  return (
    <DoctorLayout title="طلبات المختبر" subtitle="إنشاء ومتابعة طلبات المختبرات الخارجية">
      <StaffLabPanel
        refreshKey={refreshKey}
        actionButton={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors whitespace-nowrap"
          >
            + طلب مختبر جديد
          </button>
        }
        onEditOrder={order => setEditingOrder(order)}
      />

      {showCreate && (
        <CreateLabOrderModal
          onClose={() => setShowCreate(false)}
          onSaved={handleSaved}
        />
      )}

      {editingOrder && (
        <CreateLabOrderModal
          onClose={() => setEditingOrder(null)}
          onSaved={handleSaved}
          editOrder={editingOrder}
        />
      )}
    </DoctorLayout>
  );
}
