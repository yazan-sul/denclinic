'use client';

import DoctorLayout from '@/components/layouts/DoctorLayout';
import MessagesPanel from '@/components/doctor/messages/MessagesPanel';

export default function MessagesPage() {
  return (
    <DoctorLayout title="الرسائل والمحادثات" subtitle="إدارة المحادثات مع المرضى والفريق الطبي">
      <MessagesPanel />
    </DoctorLayout>
  );
}
