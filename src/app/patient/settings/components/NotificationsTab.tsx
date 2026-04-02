'use client';

import SettingCard from './SettingCard';
import ToggleSetting from './ToggleSetting';
import { NotificationSettings } from '../hooks/useSettingsState';

interface NotificationsTabProps {
  notifications: NotificationSettings;
  onChange: (notifications: NotificationSettings) => void;
  onSave: () => void;
}

export default function NotificationsTab({
  notifications,
  onChange,
  onSave,
}: NotificationsTabProps) {
  return (
    <SettingCard title="إعدادات الإشعارات">
      <div className="space-y-4">
        <ToggleSetting
          label="إشعارات البريد الإلكتروني"
          description="تلقَّ تحديثات عبر البريد الإلكتروني"
          checked={notifications.emailNotifications}
          onChange={(emailNotifications) =>
            onChange({ ...notifications, emailNotifications })
          }
        />

        <ToggleSetting
          label="إشعارات الرسائل النصية"
          description="تلقَّ تنبيهات عبر الرسائل النصية"
          checked={notifications.smsNotifications}
          onChange={(smsNotifications) =>
            onChange({ ...notifications, smsNotifications })
          }
        />

        <ToggleSetting
          label="تذكيرات المواعيد"
          description="اذكُرني قبل موعدي الطبي"
          checked={notifications.appointmentReminders}
          onChange={(appointmentReminders) =>
            onChange({ ...notifications, appointmentReminders })
          }
        />

        <ToggleSetting
          label="العروض والحملات"
          description="تلقَّ معلومات عن العروض الخاصة"
          checked={notifications.promotions}
          onChange={(promotions) => onChange({ ...notifications, promotions })}
        />

        <ToggleSetting
          label="التقرير الأسبوعي"
          description="ملخص أسبوعي لنشاطك الصحي"
          checked={notifications.weeklyReport}
          onChange={(weeklyReport) =>
            onChange({ ...notifications, weeklyReport })
          }
        />
      </div>

      <button
        onClick={onSave}
        className="w-full mt-4 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
      >
        حفظ الإعدادات
      </button>
    </SettingCard>
  );
}
