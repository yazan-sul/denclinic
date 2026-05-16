'use client';

import { useState } from 'react';
import StaffLayout from '@/components/layouts/StaffLayout';
import StaffLabPanel from '@/components/staff/lab/StaffLabPanel';
import LabsDirectoryPanel from '@/components/staff/labs/LabsDirectoryPanel';
import LabStatsPanel from '@/components/staff/lab/LabStatsPanel';

type Tab = 'orders' | 'directory' | 'stats';

const tabs: { id: Tab; label: string }[] = [
  { id: 'orders',    label: 'طلبات المختبر' },
  { id: 'directory', label: 'دليل المختبرات' },
  { id: 'stats',     label: 'إحصائيات' },
];

const SUBTITLES: Record<Tab, string> = {
  orders:    'متابعة وإدارة طلبات المختبرات الخارجية',
  directory: 'إدارة المختبرات الخارجية التي تتعامل معها العيادة',
  stats:     'تحليل أداء المختبرات ومتابعة المواعيد والإيرادات',
};

export default function StaffLabPage() {
  const [activeTab, setActiveTab] = useState<Tab>('orders');

  return (
    <StaffLayout
      title={activeTab === 'stats' ? 'إحصائيات المختبرات' : activeTab === 'orders' ? 'طلبات المختبر' : 'دليل المختبرات'}
      subtitle={SUBTITLES[activeTab]}
    >
      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl mb-4 w-full sm:w-fit" dir="rtl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
      {activeTab === 'stats'     && <LabStatsPanel />}
    </StaffLayout>
  );
}
