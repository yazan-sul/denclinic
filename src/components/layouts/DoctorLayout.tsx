'use client';

import { ReactNode, useContext, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/desktop/Sidebar';
import TopBar from '@/components/desktop/TopBar';
import DoctorBottomNavigation from '@/components/doctor/DoctorBottomNavigation';
import { AuthContext } from '@/context/AuthContext';
import { useSidebar } from '@/context/SidebarContext';

interface DoctorLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backHref?: string;
  onBack?: () => void;
}

export default function DoctorLayout({
  children,
  title,
  subtitle,
  showBackButton = false,
  backHref = '/doctor',
  onBack,
}: DoctorLayoutProps) {
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
  const DOCTOR_LAYOUT_ROLES = ['DOCTOR', 'ADMIN', 'CLINIC_OWNER'];

  useEffect(() => {
    if (isLoading) return;
    if (!user) { router.push('/auth/signin'); return; }
    if (activeRole && !DOCTOR_LAYOUT_ROLES.includes(activeRole)) {
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
      {/* Top Bar */}
      <TopBar userName={user?.name || 'الدكتور'} />

      {/* Main Layout Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar - Full height */}
        <div className="hidden md:flex md:border-r md:border-border md:flex-col md:overflow-y-auto md:h-full md:flex-shrink-0">
          <Sidebar isCollapsed={isCollapsed} onToggleCollapse={toggleCollapse} />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
          {/* Page Title (optional) */}
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

          {/* Page Content */}
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation - Hidden on desktop */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border">
        <DoctorBottomNavigation />
      </div>
    </div>
  );
}
