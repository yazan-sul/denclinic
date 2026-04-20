import StaffLayout from '@/components/layouts/StaffLayout';
import StaffDashboard from '@/components/staff/StaffDashboard';

export default function StaffPage() {
  return (
    <StaffLayout title="الرئيسية" subtitle="لوحة تحكم السكرتير">
      <StaffDashboard />
    </StaffLayout>
  );
}
