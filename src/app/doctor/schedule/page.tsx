import DoctorLayout from '@/components/layouts/DoctorLayout';
import TimeSlotManager from '@/components/doctor/TimeSlotManager';

export default function SchedulePage() {
  return (
    <DoctorLayout title="جدول العمل" subtitle="إدارة أوقات العمل وتوافر المواعيد">
      <TimeSlotManager />
    </DoctorLayout>
  );
}
