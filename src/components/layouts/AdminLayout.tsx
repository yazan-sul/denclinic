'use client';

import { ReactNode, useContext, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { AuthContext } from '@/context/AuthContext';
import { adminMenuItems } from '@/config/adminMenuItems';
import { getIcon } from '@/config/iconMap';
import TopBar from '@/components/desktop/TopBar';

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}

export default function AdminLayout({ children, title, subtitle }: AdminLayoutProps) {
  const authContext = useContext(AuthContext);
  const router = useRouter();
  const pathname = usePathname();
  const user = authContext?.user;
  const isLoading = authContext?.isLoading;

  useEffect(() => {
    if (!isLoading && user && !['ADMIN', 'CLINIC_OWNER'].includes(user.role)) {
      router.push('/auth/signin');
    }
  }, [user, isLoading, router]);

  return (
    <div className="h-full flex flex-col bg-background">
      <TopBar userName={user?.name || 'الأدمن'} />

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-card border-l border-border flex-shrink-0 overflow-y-auto">
          {/* Logo area */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white text-lg">🦷</span>
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">DenClinic</p>
                <p className="text-xs text-muted-foreground">لوحة الإدارة</p>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav className="flex-1 p-3 space-y-1">
            {adminMenuItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                  }`}
                >
                  <span className="w-5 h-5 flex-shrink-0">
                    {getIcon(item.iconName)}
                  </span>
                  <span>{item.label}</span>
                  {item.badge && (
                    <span className="mr-auto bg-destructive text-white text-xs rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User info */}
          <div className="p-4 border-t border-border">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary text-sm font-bold">
                  {user?.name?.charAt(0) || 'أ'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user?.name || 'الأدمن'}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.role === 'ADMIN' ? 'مسؤول النظام' : 'مالك العيادة'}
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          {title && (
            <div className="px-6 pt-6 pb-4 border-b border-border">
              <h1 className="text-2xl font-bold text-foreground">{title}</h1>
              {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
            </div>
          )}
          <div className="p-6">{children}</div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
        <div className="flex justify-around py-2">
          {adminMenuItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.id}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-1 rounded-lg ${
                  isActive ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <span className="w-5 h-5">{getIcon(item.iconName)}</span>
                <span className="text-xs">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
