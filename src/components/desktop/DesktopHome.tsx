'use client';

import Sidebar from './Sidebar';
import TopBar from './TopBar';
import {
  CalendarIcon,
  UsersIcon,
  MessageIcon,
  InvoiceIcon,
} from '@/components/Icons';

const DesktopHome = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopBar userName="الدكتور أحمد" />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <main className="flex-1 overflow-auto">
          <div className="p-8">
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-foreground">مرحباً في عيادة الأسنان</h1>
              <p className="text-muted-foreground mt-2">لوحة التحكم الرئيسية</p>
            </header>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-card rounded-lg p-6 shadow hover:shadow-lg transition-shadow border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">المواعيد اليوم</p>
                    <p className="text-2xl font-bold text-primary mt-1">12</p>
                  </div>
                  <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center text-primary">
                    <CalendarIcon className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-lg p-6 shadow hover:shadow-lg transition-shadow border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">المرضى النشطين</p>
                    <p className="text-2xl font-bold text-primary mt-1">245</p>
                  </div>
                  <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center text-primary">
                    <UsersIcon className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-lg p-6 shadow hover:shadow-lg transition-shadow border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">الرسائل الجديدة</p>
                    <p className="text-2xl font-bold text-primary mt-1">8</p>
                  </div>
                  <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center text-primary">
                    <MessageIcon className="w-6 h-6" />
                  </div>
                </div>
              </div>

              <div className="bg-card rounded-lg p-6 shadow hover:shadow-lg transition-shadow border border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">الدخل الشهري</p>
                    <p className="text-2xl font-bold text-primary mt-1">15.5 ألف</p>
                  </div>
                  <div className="w-12 h-12 bg-secondary rounded-lg flex items-center justify-center text-primary">
                    <InvoiceIcon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activities */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-card rounded-lg shadow p-6 border border-border">
                <h2 className="text-xl font-bold mb-4 text-foreground">آخر المواعيد</h2>
                <div className="space-y-0 divide-y divide-border">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-4 hover:bg-secondary transition">
                      <div>
                        <p className="font-medium text-foreground">محمد أحمد</p>
                        <p className="text-sm text-muted-foreground">علاج جذري</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground">10:30 صباحاً</p>
                        <p className="text-xs text-primary font-medium">مكتمل</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-card rounded-lg shadow p-6 border border-border">
                <h2 className="text-xl font-bold mb-4 text-foreground">مهام اليوم</h2>
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <label key={i} className="flex items-center p-3 hover:bg-secondary rounded cursor-pointer transition">
                      <input type="checkbox" className="w-4 h-4 rounded text-primary" />
                      <span className="mr-3 text-sm text-foreground">مهمة {i}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DesktopHome;
