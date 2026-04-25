'use client';

import AdminLayout from '@/components/layouts/AdminLayout';
import SubscriptionsPanel from '@/components/admin/subscriptions/SubscriptionsPanel';

export default function SubscriptionsPage() {
  return (
    <AdminLayout title="الاشتراكات" subtitle="إدارة خطة الاشتراك والفواتير">
      <SubscriptionsPanel />
    </AdminLayout>
  );
}
