'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import AdminLayout from '@/components/layouts/AdminLayout';

export default function AdminSettingsPage() {
  const { user, logout } = useAuth();
  const [isLoggingOut,      setIsLoggingOut]      = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true);
    sessionStorage.clear();
    logout();
    window.location.replace('/auth/signin');
  };

  const roleLabel =
    user?.roles.includes('ADMIN')        ? 'مسؤول النظام' :
    user?.roles.includes('CLINIC_OWNER') ? 'مدير العيادة'  : 'مستخدم';

  return (
    <AdminLayout title="الإعدادات" subtitle="إدارة إعدادات حسابك">
      <div className="max-w-2xl space-y-6" dir="rtl">

        {/* Account info */}
        <div className="border border-border rounded-xl p-6 bg-card">
          <h2 className="text-lg font-semibold mb-4">معلومات الحساب</h2>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">الاسم</p>
              <p className="text-sm font-medium">{user?.name || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">البريد الإلكتروني</p>
              <p className="text-sm font-medium">{user?.email || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">رقم الهاتف</p>
              <p className="text-sm font-medium" dir="ltr">{user?.phoneNumber || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">نوع الحساب</p>
              <p className="text-sm font-medium">{roleLabel}</p>
            </div>
          </div>
        </div>

        {/* App settings */}
        <div className="border border-border rounded-xl p-6 bg-card">
          <h2 className="text-lg font-semibold mb-4">إعدادات التطبيق</h2>
          <div className="space-y-1">
            {[
              { label: 'الإشعارات',       defaultChecked: true  },
              { label: 'البريد الإلكتروني', defaultChecked: true  },
              { label: 'الرسائل النصية',   defaultChecked: false },
            ].map(({ label, defaultChecked }) => (
              <div key={label} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                <label className="text-sm font-medium">{label}</label>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked={defaultChecked} />
                  <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Logout */}
        <div className="border border-red-300 rounded-xl p-6 bg-red-50 dark:bg-red-950">
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-300 mb-2">منطقة الخطر</h2>
          <p className="text-sm text-red-600 dark:text-red-400 mb-4">
            تسجيل الخروج سيؤدي إلى إغلاق جلستك الحالية.
          </p>
          {!showLogoutConfirm ? (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              تسجيل الخروج
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-sm font-medium text-red-700 dark:text-red-300">هل أنت متأكد؟</p>
              <div className="flex gap-3">
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isLoggingOut ? 'جارٍ الخروج...' : 'تأكيد الخروج'}
                </button>
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  disabled={isLoggingOut}
                  className="px-5 py-2 bg-secondary hover:bg-secondary/80 text-sm font-medium rounded-lg transition-colors"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </AdminLayout>
  );
}