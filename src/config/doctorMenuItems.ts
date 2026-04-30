/**
 * Doctor/Staff Menu Items Configuration
 * Menu items specific to DOCTOR, STAFF, ADMIN, and CLINIC_OWNER roles
 */

export interface MenuItemConfig {
  id: string;
  label: string;
  href: string;
  iconName: string; // Icon key instead of component
  badge?: number;
  roles: string[]; // Which roles can see this item
}

export const doctorMenuItems: MenuItemConfig[] = [
  // ============================================
  // DASHBOARD
  // ============================================
  {
    id: 'doctor-home',
    label: 'الرئيسية',
    href: '/doctor',
    iconName: 'home',
    roles: ['DOCTOR', 'STAFF', 'ADMIN', 'CLINIC_OWNER'],
  },

  // ============================================
  // APPOINTMENTS / SCHEDULE
  // ============================================
  {
    id: 'doctor-appointments',
    label: 'المواعيد',
    href: '/doctor/appointments',
    iconName: 'calendar',
    badge: 3,
    roles: ['DOCTOR', 'STAFF', 'ADMIN', 'CLINIC_OWNER'],
  },
  {
    id: 'doctor-schedule',
    label: 'جدول العمل',
    href: '/doctor/schedule',
    iconName: 'calendar',
    roles: ['DOCTOR', 'STAFF', 'CLINIC_OWNER'],
  },

  // ============================================
  // PATIENT MANAGEMENT
  // ============================================
  {
    id: 'doctor-patients',
    label: 'المرضى',
    href: '/doctor/patients',
    iconName: 'users',
    roles: ['DOCTOR', 'STAFF', 'ADMIN', 'CLINIC_OWNER'],
  },

  // ============================================
  // SETTINGS (Admin and Clinic Owner only)
  // ============================================
  {
    id: 'doctor-settings',
    label: 'الإعدادات',
    href: '/doctor/settings',
    iconName: 'settings',
    roles: ['ADMIN', 'CLINIC_OWNER'],
  },
];
