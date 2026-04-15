'use client';

import { useState } from 'react';
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/FormInputs';
import Button from '@/components/ui/Button';

interface ClinicSettings {
  clinicName: string;
  address: string;
  city: string;
  phone: string;
  workingDaysFrom: string;
  workingDaysTo: string;
  openingTime: string;
  closingTime: string;
  website: string;
  description: string;
}

const ClinicSettingsPanel = () => {
  const [settings, setSettings] = useState<ClinicSettings>({
    clinicName: 'عيادة الابتسامة',
    address: 'شارع الملك فهد',
    city: 'الرياض',
    phone: '+966112345678',
    workingDaysFrom: 'الأحد',
    workingDaysTo: 'الخميس',
    openingTime: '09:00',
    closingTime: '18:00',
    website: 'www.clinic.com',
    description: 'عيادة متخصصة في طب الأسنان الحديث',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (field: keyof ClinicSettings, value: string) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setSaved(true);
    setIsEditing(false);
    setTimeout(() => setSaved(false), 3000);
  };

  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">إعدادات العيادة</h3>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            تعديل
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormInput
          label="اسم العيادة"
          value={settings.clinicName}
          onChange={(e) => handleChange('clinicName', e.target.value)}
          disabled={!isEditing}
        />
        <FormInput
          label="المدينة"
          value={settings.city}
          onChange={(e) => handleChange('city', e.target.value)}
          disabled={!isEditing}
        />
        <FormInput
          label="العنوان"
          value={settings.address}
          onChange={(e) => handleChange('address', e.target.value)}
          disabled={!isEditing}
          className="md:col-span-2"
        />
        <FormInput
          label="رقم الهاتف"
          type="tel"
          value={settings.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          disabled={!isEditing}
        />
        <FormInput
          label="الموقع الإلكتروني"
          value={settings.website}
          onChange={(e) => handleChange('website', e.target.value)}
          disabled={!isEditing}
        />

        {/* Working Days */}
        <FormSelect
          label="أول يوم عمل"
          value={settings.workingDaysFrom}
          onChange={(e) => handleChange('workingDaysFrom', e.target.value)}
          disabled={!isEditing}
          options={days.map((d) => ({ value: d, label: d }))}
        />
        <FormSelect
          label="آخر يوم عمل"
          value={settings.workingDaysTo}
          onChange={(e) => handleChange('workingDaysTo', e.target.value)}
          disabled={!isEditing}
          options={days.map((d) => ({ value: d, label: d }))}
        />

        {/* Time */}
        <FormInput
          label="وقت الافتتاح"
          type="time"
          value={settings.openingTime}
          onChange={(e) => handleChange('openingTime', e.target.value)}
          disabled={!isEditing}
        />
        <FormInput
          label="وقت الإغلاق"
          type="time"
          value={settings.closingTime}
          onChange={(e) => handleChange('closingTime', e.target.value)}
          disabled={!isEditing}
        />

        <FormTextarea
          label="وصف العيادة"
          value={settings.description}
          onChange={(e) => handleChange('description', e.target.value)}
          disabled={!isEditing}
          rows={4}
          className="md:col-span-2"
        />
      </div>

      {isEditing && (
        <div className="flex gap-3 mt-6">
          <Button variant="primary" onClick={handleSave}>
            حفظ التغييرات
          </Button>
          <Button variant="outline" onClick={() => setIsEditing(false)}>
            إلغاء
          </Button>
        </div>
      )}

      {saved && (
        <div className="mt-4 p-3 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg text-sm">
          ✓ تم حفظ التغييرات بنجاح
        </div>
      )}
    </div>
  );
};

export default ClinicSettingsPanel;
