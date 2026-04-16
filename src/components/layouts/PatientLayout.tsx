'use client';

import { ReactNode } from 'react';
import Sidebar from '@/components/desktop/Sidebar';
import TopBar from '@/components/desktop/TopBar';
import BottomNavigation from '@/components/patient/BottomNavigation';
import { useSidebar } from '@/context/SidebarContext';

interface PatientLayoutProps {
  children: ReactNode;
}

export default function PatientLayout({
  children,
}: PatientLayoutProps) {
  const { isCollapsed, toggleCollapse } = useSidebar();

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top Bar */}
      <TopBar userName="المريض" />

      {/* Main Layout Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar - Full height */}
        <div className="hidden md:flex md:border-r md:border-border md:flex-col md:overflow-y-auto md:h-full md:flex-shrink-0">
          <Sidebar isCollapsed={isCollapsed} onToggleCollapse={toggleCollapse} />
        </div>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto pb-24 md:pb-0">

          {/* Page Content */}
          <div className="p-4 md:p-6">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Bottom Navigation - Hidden on desktop */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border">
        <BottomNavigation />
      </div>
    </div>
  );
}
