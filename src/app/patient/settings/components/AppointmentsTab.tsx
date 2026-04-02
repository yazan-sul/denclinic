'use client';

import SettingCard from './SettingCard';
import SelectSetting from './SelectSetting';
import ToggleSetting from './ToggleSetting';
import { AppointmentPreferences } from '../hooks/useSettingsState';

interface AppointmentsTabProps {
  appointments: AppointmentPreferences;
  onChange: (appointments: AppointmentPreferences) => void;
  onSave: () => void;
}

export default function AppointmentsTab({
  appointments,
  onChange,
  onSave,
}: AppointmentsTabProps) {
  return (
    <SettingCard title="تفضيلات المواعيد">
      <div className="space-y-4">
        <SelectSetting
          label="الوقت المفضل للمواعيد"
          value={appointments.preferredTime}
          onChange={(preferredTime) =>
            onChange({
              ...appointments,
              preferredTime: preferredTime as
                | 'morning'
                | 'afternoon'
                | 'evening'
                | 'any',
            })
          }
          options={[
            { value: 'morning', label: 'الصباح' },
            { value: 'afternoon', label: 'بعد الظهر' },
            { value: 'evening', label: 'المساء' },
            { value: 'any', label: 'أي وقت' },
          ]}
        />

        <SelectSetting
          label="تذكيري قبل الموعد بـ"
          value={appointments.reminderBefore.toString()}
          onChange={(reminderBefore) =>
            onChange({
              ...appointments,
              reminderBefore: parseInt(reminderBefore),
            })
          }
          options={[
            { value: '6', label: '6 ساعات' },
            { value: '12', label: '12 ساعة' },
            { value: '24', label: '24 ساعة' },
            { value: '48', label: '48 ساعة' },
          ]}
        />

        <ToggleSetting
          label="تأكيد تلقائي"
          description="تأكيد المواعيد تلقائياً بدون موافقة يدوية"
          checked={appointments.autoConfirm}
          onChange={(autoConfirm) =>
            onChange({ ...appointments, autoConfirm })
          }
        />

        <ToggleSetting
          label="السماح بالإلغاء"
          description="السماح بإلغاء المواعيد قبل النهائية"
          checked={appointments.allowCancellation}
          onChange={(allowCancellation) =>
            onChange({ ...appointments, allowCancellation })
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
