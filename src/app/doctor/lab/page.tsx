'use client';

import { useState } from 'react';
import DoctorLayout from '@/components/layouts/DoctorLayout';
import StaffLabPanel from '@/components/staff/lab/StaffLabPanel';
import CreateLabOrderModal from '@/components/doctor/lab/CreateLabOrderModal';
import { CheckCircleIcon } from '@/components/Icons';

export default function DoctorLabPage() {
  const [showCreate,   setShowCreate]   = useState(false);
  const [editingOrder, setEditingOrder] = useState<any>(null);
  const [refreshKey,   setRefreshKey]   = useState(0);
  const [toast,        setToast]        = useState('');

  const handleSaved = (isEdit?: boolean) => {
    setShowCreate(false);
    setEditingOrder(null);
    setRefreshKey(k => k + 1);
    const msg = isEdit ? 'تم تعديل الطلب بنجاح' : 'تم إنشاء طلب المختبر بنجاح';
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
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
          onSaved={() => handleSaved(false)}
        />
      )}

      {editingOrder && (
        <CreateLabOrderModal
          onClose={() => setEditingOrder(null)}
          onSaved={() => handleSaved(true)}
          editOrder={editingOrder}
        />
      )}

      {toast && (
        <div className="fixed top-4 inset-x-0 mx-auto w-fit z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4" /> {toast}
        </div>
      )}
    </DoctorLayout>
  );
}
