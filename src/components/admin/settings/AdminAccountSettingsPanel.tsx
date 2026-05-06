'use client';

import { useState } from 'react';
import { LogOut, UserCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';

export default function AdminAccountSettingsPanel() {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const roleLabel =
    user?.roles.includes('ADMIN') ? 'System Admin' :
    user?.roles.includes('CLINIC_OWNER') ? 'Clinic Owner' :
    user?.roles.includes('STAFF') ? 'Staff' : 'User';

  const handleLogout = async () => {
    setIsLoggingOut(true);
    sessionStorage.clear();
    await logout();
    window.location.replace('/auth/signin');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <UserCircle className="h-7 w-7 text-primary" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Name</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{user?.name || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{user?.email || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="mt-1 text-sm font-semibold text-foreground" dir="ltr">{user?.phoneNumber || '-'}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Account Type</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{roleLabel}</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-red-300 bg-red-50 p-5 dark:bg-red-950">
        <div className="flex items-start gap-3">
          <LogOut className="mt-0.5 h-5 w-5 text-red-600" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-red-700 dark:text-red-300">Sign Out</h3>
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">
              This will close your current dashboard session.
            </p>
            {!showLogoutConfirm ? (
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(true)}
                className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Sign Out
              </button>
            ) : (
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoggingOut ? 'Signing out...' : 'Confirm Sign Out'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(false)}
                  disabled={isLoggingOut}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
