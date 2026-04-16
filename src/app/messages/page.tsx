'use client';

import { Suspense } from 'react';
import Sidebar from '@/components/desktop/Sidebar';
import TopBar from '@/components/desktop/TopBar';
import { useSidebar } from '@/context/SidebarContext';

export default function MessagesPage() {
  const { isCollapsed, toggleCollapse } = useSidebar();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <TopBar userName="الدكتور أحمد" />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isCollapsed={isCollapsed} onToggleCollapse={toggleCollapse} />
        <main className="flex-1 overflow-auto p-8">
          <h1 className="text-3xl font-bold text-foreground">الرسائل</h1>
          <p className="text-muted-foreground mt-2">إدارة الرسائل والتواصل</p>
        </main>
      </div>
    </div>
  );
}
