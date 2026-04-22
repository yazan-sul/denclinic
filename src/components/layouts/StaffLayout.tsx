'use client';

import { ReactNode, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/desktop/TopBar';
import StaffSidebar from '@/components/staff/StaffSidebar';
import StaffBottomNavigation from '@/components/staff/StaffBottomNavigation';
import { AuthContext } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';

interface StaffLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backHref?: string;
  onBack?: () => void;
}

export default function StaffLayout({
  children,
  title,
  subtitle,
  showBackButton = false,
  backHref = '/staff',
  onBack,
}: StaffLayoutProps) {
  const { isCollapsed, toggleCollapse } = useSidebar();
  const authContext = useContext(AuthContext);
  const router = useRouter();
  const user = authContext?.user;
  const isLoading = authContext?.isLoading;
  const activeRole = authContext?.activeRole;

  const ACTIVE_ROLE_ROUTES: Record<string, string> = {
    PATIENT: '/patient', DOCTOR: '/doctor', STAFF: '/staff',
    ADMIN: '/patient', CLINIC_OWNER: '/manage',
  };

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push('/auth/signin'); return; }
    if (activeRole && activeRole !== 'STAFF') {
      router.replace(ACTIVE_ROLE_ROUTES[activeRole] ?? '/');
    }
  }, [user, isLoading, activeRole, router]);

  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else if (backHref) {
      window.location.href = backHref;
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <TopBar userName={user?.name || 'السكرتير'} />

      <div className="flex flex-1 overflow-hidden">
        <div className="hidden md:flex md:border-r md:border-border md:flex-col md:overflow-y-auto md:h-full md:flex-shrink-0">
          <StaffSidebar isCollapsed={isCollapsed} onToggleCollapse={toggleCollapse} />
        </div>

        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
          {title && (
            <div className="px-4 md:px-6 pt-6 border-b border-border">
              <div className="flex items-start justify-between mb-4">
                {showBackButton && (
                  <button
                    onClick={handleBackClick}
                    className="mb-4 text-sm text-primary hover:underline"
                  >
                    ← العودة
                  </button>
                )}
              </div>
              <h1 className="text-3xl font-bold mb-2">{title}</h1>
              {subtitle && <p className="text-muted-foreground mb-6">{subtitle}</p>}
            </div>
          )}

          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>

      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border">
        <StaffBottomNavigation />
      </div>
    </div>
  );
}
