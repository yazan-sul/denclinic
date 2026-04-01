'use client';

import { Suspense } from 'react';
import Sidebar from '@/components/desktop/Sidebar';
import TopBar from '@/components/desktop/TopBar';

export default function AppointmentsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopBar userName="الدكتور أحمد" />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-auto p-8">
          <h1 className="text-3xl font-bold text-foreground">المواعيد</h1>
          <p className="text-muted-foreground mt-2">إدارة مواعيد المرضى</p>
        </main>
      </div>
    </div>
  );
}
