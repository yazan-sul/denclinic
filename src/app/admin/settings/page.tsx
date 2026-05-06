import { redirect } from 'next/navigation';

export default function AdminSettingsPage() {
  redirect('/settings/reset-password');
}
