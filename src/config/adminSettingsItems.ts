import { Bell, KeyRound, UserCircle, type LucideIcon } from 'lucide-react';

export type AdminSettingsItemId = 'reset-password' | 'app-settings' | 'account';

export interface AdminSettingsItem {
  id: AdminSettingsItemId;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}

export const adminSettingsItems: AdminSettingsItem[] = [
  {
    id: 'reset-password',
    label: 'Reset Password',
    description: 'Update the password for your dashboard account.',
    href: '/settings/reset-password',
    icon: KeyRound,
  },
  {
    id: 'app-settings',
    label: 'App Settings',
    description: 'Notifications, email, and SMS preferences.',
    href: '/settings/app',
    icon: Bell,
  },
  {
    id: 'account',
    label: 'Account',
    description: 'Profile details and session controls.',
    href: '/settings/account',
    icon: UserCircle,
  },
];
