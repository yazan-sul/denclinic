'use client';

import { ReactNode } from 'react';
import PatientSidebar from '@/components/desktop/PatientSidebar';
import TopBar from '@/components/desktop/TopBar';
import BottomNavigation from '@/components/patient/BottomNavigation';
import Link from 'next/link';

interface PatientLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showBackButton?: boolean;
  backHref?: string;
  onBack?: () => void;
}

export default function PatientLayout({
  children,
  title,
  subtitle,
  showBackButton = false,
  backHref = '/patient',
  onBack,
}: PatientLayoutProps) {
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
      <TopBar userName="المريض" />

      {/* Main Layout Container */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar - Full height */}
        <div className="hidden md:flex md:w-64 md:border-r md:border-border md:flex-col md:overflow-y-auto">
          <PatientSidebar />
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
