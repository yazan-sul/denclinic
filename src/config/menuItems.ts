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
    label: 'السجلات الطبية',
    href: '/patient/records',
    iconName: 'document',
    roles: ['PATIENT'],
  },
  {
    id: 'patient-profile',
    label: 'الملف الشخصي',
    href: '/patient/profile',
    iconName: 'profile',
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
    href: '/dashboard',
    iconName: 'home',
    roles: ['DOCTOR', 'STAFF', 'ADMIN', 'CLINIC_OWNER'],
  },
  {
    id: 'appointments',
    label: 'المواعيد',
    href: '/appointments',
    iconName: 'calendar',
    badge: 3,
    roles: ['DOCTOR', 'STAFF', 'ADMIN', 'CLINIC_OWNER'],
  },
  {
    id: 'patients',
    label: 'المرضى',
    href: '/manage/patients',
    iconName: 'users',
    roles: ['DOCTOR', 'STAFF', 'ADMIN', 'CLINIC_OWNER'],
  },
  {
    id: 'messages',
    label: 'الرسائل',
    href: '/messages',
    iconName: 'message',
    badge: 5,
    roles: ['DOCTOR', 'STAFF', 'ADMIN', 'CLINIC_OWNER'],
  },
  {
    id: 'reports',
    label: 'التقارير',
    href: '/reports',
    iconName: 'reports',
    roles: ['DOCTOR', 'ADMIN', 'CLINIC_OWNER'],
  },
  {
    id: 'admin-settings',
    label: 'الإعدادات',
    href: '/settings',
    iconName: 'settings',
    roles: ['ADMIN', 'CLINIC_OWNER'],
  },
];
