'use client';

import { useState } from 'react';
import StaffLayout from '@/components/layouts/StaffLayout';
import StaffLabPanel from '@/components/staff/lab/StaffLabPanel';
import LabsDirectoryPanel from '@/components/staff/labs/LabsDirectoryPanel';

type Tab = 'orders' | 'directory';

const tabs: { id: Tab; label: string }[] = [
  { id: 'orders',    label: 'طلبات المختبر' },
  { id: 'directory', label: 'دليل المختبرات' },
];

export default function StaffLabPage() {
  const [activeTab, setActiveTab] = useState<Tab>('orders');

  return (
    <StaffLayout
      title={activeTab === 'orders' ? 'طلبات المختبر' : 'دليل المختبرات'}
      subtitle={activeTab === 'orders' ? 'متابعة وإدارة طلبات المختبرات الخارجية' : 'إدارة المختبرات الخارجية التي تتعامل معها العيادة'}
    >
      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl mb-4 w-fit" dir="rtl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-card shadow-sm text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'orders'    && <StaffLabPanel />}
      {activeTab === 'directory' && <LabsDirectoryPanel />}
    </StaffLayout>
  );
}
