/**
 * Staff (Secretary) Menu Items Configuration
 * Menu items specific to STAFF role
 */

export interface StaffMenuItemConfig {
  id: string;
  label: string;
  href: string;
  iconName: string;
  badge?: number;
}

export const staffMenuItems: StaffMenuItemConfig[] = [
  {
    id: 'staff-home',
    label: 'الرئيسية',
    href: '/staff',
    iconName: 'home',
  },
  {
    id: 'staff-appointments',
    label: 'المواعيد',
    href: '/staff/appointments',
    iconName: 'calendar',
    badge: 3,
  },
  {
    id: 'staff-patients',
    label: 'المرضى',
    href: '/staff/patients',
    iconName: 'users',
  },
  {
    id: 'staff-payments',
    label: 'المدفوعات',
    href: '/staff/payments',
    iconName: 'document',
  },
  {
    id: 'staff-lab',
    label: 'المختبرات',
    href: '/staff/lab',
    iconName: 'reports',
  },
  {
    id: 'staff-settings',
    label: 'الإعدادات',
    href: '/staff/settings',
    iconName: 'settings',
  },
];

// Bottom nav shows only key items (max 5)
export const staffBottomNavItems: StaffMenuItemConfig[] = [
  staffMenuItems[0], // الرئيسية
  staffMenuItems[1], // المواعيد
  staffMenuItems[2], // المرضى
  staffMenuItems[3], // المدفوعات
  staffMenuItems[5], // الإعدادات
];
