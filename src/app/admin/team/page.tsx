'use client';

import AdminLayout from '@/components/layouts/AdminLayout';
import TeamPanel from '@/components/admin/team/TeamPanel';

export default function TeamPage() {
  return (
    <AdminLayout title="فريق العمل" subtitle="إدارة الأطباء والموظفين وتعيينهم للفروع">
      <TeamPanel />
    </AdminLayout>
  );
}
