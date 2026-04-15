'use client';

import { useState } from 'react';
import { FormInput, FormSelect, FormTextarea } from '@/components/ui/FormInputs';
import Button from '@/components/ui/Button';

interface DoctorProfile {
  fullName: string;
  specialization: string;
  licenseNumber: string;
  phone: string;
  email: string;
  bio: string;
}

const DoctorSettingsPanel = () => {
  const [profile, setProfile] = useState<DoctorProfile>({
    fullName: 'د. محمد أحمد',
    specialization: 'طب أسنان عام',
    licenseNumber: 'LIC123456',
    phone: '+966500000000',
    email: 'doctor@clinic.com',
    bio: 'طبيب أسنان متخصص في علاج الجذور والتركيبات',
  });

  const [isEditing, setIsEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleChange = (field: keyof DoctorProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setSaved(true);
    setIsEditing(false);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">بيانات الطبيب</h3>
        {!isEditing && (
          <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
            تعديل
          </Button>
        )}
      </div>

      <div className="space-y-4">
        <FormInput
          label="الاسم الكامل"
          value={profile.fullName}
          onChange={(e) => handleChange('fullName', e.target.value)}
          disabled={!isEditing}
        />
        <FormInput
          label="التخصص"
          value={profile.specialization}
          onChange={(e) => handleChange('specialization', e.target.value)}
          disabled={!isEditing}
        />
        <FormInput
          label="رقم الترخيص"
          value={profile.licenseNumber}
          onChange={(e) => handleChange('licenseNumber', e.target.value)}
          disabled={!isEditing}
        />
        <FormInput
          label="الهاتف"
          type="tel"
          value={profile.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          disabled={!isEditing}
        />
        <FormInput
          label="البريد الإلكتروني"
          type="email"
          value={profile.email}
          onChange={(e) => handleChange('email', e.target.value)}
          disabled={!isEditing}
        />
        <FormTextarea
          label="السيرة الذاتية"
          value={profile.bio}
          onChange={(e) => handleChange('bio', e.target.value)}
          disabled={!isEditing}
          rows={4}
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

export default DoctorSettingsPanel;
