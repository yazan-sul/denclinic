export interface AdminMenuItemConfig {
  id: string;
  label: string;
  href: string;
  iconName: string;
  badge?: number;
}

export const adminMenuItems: AdminMenuItemConfig[] = [
  {
    id: 'admin-home',
    label: 'لوحة التحكم',
    href: '/admin',
    iconName: 'home',
  },
  {
    id: 'admin-branches',
    label: 'الفروع',
    href: '/admin/branches',
    iconName: 'building',
  },
  {
    id: 'admin-team',
    label: 'فريق العمل',
    href: '/admin/team',
    iconName: 'users',
  },
  {
    id: 'admin-subscriptions',
    label: 'الاشتراكات',
    href: '/admin/subscriptions',
    iconName: 'invoice',
  },
  {
    id: 'admin-permissions',
    label: 'الصلاحيات',
    href: '/admin/permissions',
    iconName: 'shield',
  },
  {
    id: 'admin-reports',
    label: 'التقارير',
    href: '/admin/reports',
    iconName: 'reports',
  },
];
