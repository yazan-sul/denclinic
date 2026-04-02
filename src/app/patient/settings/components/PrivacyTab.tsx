'use client';

import SettingCard from './SettingCard';
import SelectSetting from './SelectSetting';
import ToggleSetting from './ToggleSetting';
import { PrivacySettings } from '../hooks/useSettingsState';

interface PrivacyTabProps {
  privacy: PrivacySettings;
  onChange: (privacy: PrivacySettings) => void;
  onSave: () => void;
}

export default function PrivacyTab({
  privacy,
  onChange,
  onSave,
}: PrivacyTabProps) {
  return (
    <SettingCard title="إعدادات الخصوصية">
      <div className="space-y-4">
        <SelectSetting
          label="رؤية الملف الشخصي"
          value={privacy.profileVisibility}
          onChange={(profileVisibility) =>
            onChange({
              ...privacy,
              profileVisibility: profileVisibility as
                | 'public'
                | 'private'
                | 'friends',
            })
          }
          options={[
            { value: 'public', label: 'عام' },
            { value: 'friends', label: 'الأصدقاء فقط' },
            { value: 'private', label: 'خاص' },
          ]}
        />

        <ToggleSetting
          label="إظهار حالة الاتصال"
          description="دع الآخرين يعرفون متى تكون متصلاً"
          checked={privacy.showOnlineStatus}
          onChange={(showOnlineStatus) =>
            onChange({ ...privacy, showOnlineStatus })
          }
        />

        <ToggleSetting
          label="السماح بجمع البيانات"
          description="ساعدنا في تحسين الخدمة بتحليل الاستخدام"
          checked={privacy.allowDataCollection}
          onChange={(allowDataCollection) =>
            onChange({ ...privacy, allowDataCollection })
          }
        />

        <ToggleSetting
          label="السماح بمشاركة البيانات"
          description="السماح لأطراف ثالثة بالوصول لبيانات"
          checked={privacy.allowThirdParty}
          onChange={(allowThirdParty) =>
            onChange({ ...privacy, allowThirdParty })
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
