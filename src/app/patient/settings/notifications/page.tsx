'use client';

import { useState } from 'react';
import PatientLayout from '@/components/layouts/PatientLayout';
import SectionCard from '../components/SectionCard';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    smsNotifications: true,
    appointmentReminders: true,
    promotions: false,
    weeklyReport: true,
  });

  const handleToggle = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <PatientLayout
      title="الإشعارات"
      subtitle="إدارة إشعارات المواعيد والتحديثات"
      showBackButton
      backHref="/patient/settings"
    >
      <div className="flex justify-center">
        <div className="w-full max-w-lg space-y-6 pb-8">
          <SectionCard title="تفضيلات الإشعارات">
            <div className="px-6 py-4 space-y-4">
              {[
                {
                  key: 'emailNotifications',
                  label: 'إشعارات البريد الإلكتروني',
                  description: 'تلقَّ التحديثات عبر البريد',
                },
                {
                  key: 'smsNotifications',
                  label: 'إشعارات الرسائل النصية',
                  description: 'تلقَّ التنبيهات عبر الرسائل',
                },
                {
                  key: 'appointmentReminders',
                  label: 'تذكيرات المواعيد',
                  description: 'اذكُرني قبل موعدي الطبي',
                },
                {
                  key: 'promotions',
                  label: 'العروض والحملات',
                  description: 'معلومات العروض الخاصة',
                },
                {
                  key: 'weeklyReport',
                  label: 'التقرير الأسبوعي',
                  description: 'ملخص أسبوعي للنشاط الصحي',
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between pb-4 border-b border-border last:border-b-0"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{item.label}</h4>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={
                      notifications[item.key as keyof typeof notifications]
                    }
                    onChange={() =>
                      handleToggle(item.key as keyof typeof notifications)
                    }
                    className="w-5 h-5 cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </SectionCard>

          <button
            onClick={() => window.history.back()}
            className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 hover:cursor-pointer transition-opacity"
          >
            تم
          </button>
        </div>
      </div>
    </PatientLayout>
  );
}
