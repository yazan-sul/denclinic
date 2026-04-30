/**
 * Universal Menu Items Configuration
 * Define menu items for all user roles
 */

export interface MenuItemConfig {
  id: string;
  label: string;
  href: string;
  iconName: string; // Icon key instead of component
  badge?: number;
  roles: string[]; // Which roles can see this item
}

export const menuItems: MenuItemConfig[] = [
  // ============================================
  // PATIENT MENU ITEMS
  // ============================================
  {
    id: 'patient-home',
    label: 'الرئيسية',
    href: '/patient',
    iconName: 'home',
    roles: ['PATIENT'],
  },
  {
    id: 'bookings',
    label: 'الحجوزات',
    href: '/patient/bookings',
    iconName: 'calendar',
    badge: 2,
    roles: ['PATIENT'],
  },
  {
    id: 'family',
    label: 'العائلة',
    href: '/patient/family',
    iconName: 'users',
    roles: ['PATIENT'],
  },
  {
    id: 'records',
    label: 'السجلات',
    href: '/patient/records',
    iconName: 'document',
    roles: ['PATIENT'],
  },
  {
    id: 'patient-settings',
    label: 'الإعدادات',
    href: '/patient/settings',
    iconName: 'settings',
    roles: ['PATIENT'],
  },

  // ============================================
  // DOCTOR / STAFF / ADMIN / CLINIC_OWNER ITEMS
  // ============================================
  {
    id: 'dashboard',
    label: 'الرئيسية',
    href: '/doctor',
    iconName: 'home',
    roles: ['DOCTOR', 'STAFF', 'ADMIN', 'CLINIC_OWNER'],
  },
  {
    id: 'appointments',
    label: 'المواعيد',
    href: '/doctor/appointments',
    iconName: 'calendar',
    roles: ['DOCTOR', 'STAFF', 'ADMIN', 'CLINIC_OWNER'],
  },
  {
    id: 'patients',
    label: 'المرضى',
    href: '/doctor/patients',
    iconName: 'users',
    roles: ['DOCTOR', 'STAFF', 'ADMIN', 'CLINIC_OWNER'],
  },
  {
    id: 'schedule',
    label: 'الجدول الزمني',
    href: '/doctor/schedule',
    iconName: 'calendar',
    roles: ['DOCTOR', 'STAFF', 'ADMIN', 'CLINIC_OWNER'],
  },
  {
    id: 'lab',
    label: 'المختبر',
    href: '/doctor/lab',
    iconName: 'document',
    roles: ['DOCTOR', 'STAFF', 'ADMIN', 'CLINIC_OWNER'],
  },
  {
    id: 'settings',
    label: 'الإعدادات',
    href: '/doctor/settings',
    iconName: 'settings',
    roles: ['DOCTOR', 'STAFF', 'ADMIN', 'CLINIC_OWNER'],
  },
];
