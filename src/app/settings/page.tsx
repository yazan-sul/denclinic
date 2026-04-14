'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/desktop/Sidebar';
import TopBar from '@/components/desktop/TopBar';

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setIsLoggingOut(true);
    
    // Clear session storage (localStorage is no longer used for auth)
    sessionStorage.clear();
    
    // Clear auth context state and cookie
    logout();
    
    // Force immediate page reload to signin (no setTimeout delays)
    // Use replace to prevent back button returning to authenticated state
    window.location.replace('/auth/signin');
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopBar userName={user?.name || 'المستخدم'} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-8">
          <h1 className="text-3xl font-bold text-foreground">الإعدادات</h1>
          <p className="text-muted-foreground mt-2 mb-8">إدارة إعدادات التطبيق وحسابك</p>

          <div className="max-w-2xl space-y-6">
            {/* Profile Settings Section */}
            <div className="border border-border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold text-foreground mb-4">معلومات الحساب</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    الاسم
                  </label>
                  <p className="text-foreground">{user?.name || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    البريد الإلكتروني
                  </label>
                  <p className="text-foreground">{user?.email || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    رقم الهاتف
                  </label>
                  <p className="text-foreground">{user?.phoneNumber || '-'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    نوع الحساب
                  </label>
                  <p className="text-foreground capitalize">
                    {user?.role === 'PATIENT' && 'مريض'}
                    {user?.role === 'DOCTOR' && 'دكتور'}
                    {user?.role === 'CLINIC_OWNER' && 'مالك عيادة'}
                    {user?.role === 'STAFF' && 'موظف'}
                    {user?.role === 'ADMIN' && 'مسؤول'}
                  </p>
                </div>
              </div>
            </div>

            {/* App Settings Section */}
            <div className="border border-border rounded-lg p-6 bg-card">
              <h2 className="text-xl font-semibold text-foreground mb-4">إعدادات التطبيق</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                  <label className="text-foreground font-medium">الإشعارات</label>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                  <label className="text-foreground font-medium">البريد الإلكتروني</label>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </div>
                </div>

                <div className="flex items-center justify-between py-3">
                  <label className="text-foreground font-medium">الرسائل النصية</label>
                  <div className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" />
                    <div className="w-11 h-6 bg-secondary peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Danger Zone - Logout */}
            <div className="border border-red-500 rounded-lg p-6 bg-red-50 dark:bg-red-950">
              <h2 className="text-xl font-semibold text-red-700 dark:text-red-300 mb-4">منطقة الخطر</h2>
              <p className="text-red-600 dark:text-red-400 text-sm mb-4">
                تسجيل الخروج سيؤدي إلى إزالة جميع البيانات المخزنة محليًا واغلاق جلستك الحالية.
              </p>

              {!showLogoutConfirm ? (
                <button
                  onClick={() => setShowLogoutConfirm(true)}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
                >
                  تسجيل الخروج
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-red-700 dark:text-red-300 font-medium">
                    هل أنت متأكد من رغبتك في تسجيل الخروج؟
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-medium rounded-lg transition-colors"
                    >
                      {isLoggingOut ? 'جاري التسجيل خروج...' : 'تأكيد تسجيل الخروج'}
                    </button>
                    <button
                      onClick={() => setShowLogoutConfirm(false)}
                      disabled={isLoggingOut}
                      className="px-6 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 disabled:bg-gray-200 text-gray-800 dark:text-white font-medium rounded-lg transition-colors"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
