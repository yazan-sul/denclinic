'use client';

import { useState } from 'react';
import PatientLayout from '@/components/layouts/PatientLayout';
import InputSetting from '../components/InputSetting';
import SelectSetting from '../components/SelectSetting';
import SectionCard from '../components/SectionCard';
import { useSettingsState } from '../hooks/useSettingsState';

export default function EditProfilePage() {
  const state = useSettingsState();
  const [editData, setEditData] = useState(state.profile);

  const handleSave = () => {
    state.setEditData(editData);
    state.handleSaveProfile();
    window.history.back();
  };

  return (
    <PatientLayout
      title="تعديل الملف الشخصي"
      subtitle="تحديث معلوماتك الشخصية"
      showBackButton
      backHref="/patient/settings"
    >
      <div className="flex justify-center">
        <div className="w-full max-w-lg space-y-6 pb-8">
        {/* Basic Information */}
        <SectionCard title="المعلومات الأساسية">
          <div className="px-6 py-4 space-y-4">
            <InputSetting
              label="الاسم الكامل"
              value={editData.name}
              onChange={(name) => setEditData({ ...editData, name })}
            />
            <InputSetting
              label="البريد الإلكتروني"
              type="email"
              value={editData.email}
              onChange={(email) => setEditData({ ...editData, email })}
            />
            <InputSetting
              label="رقم الهاتف"
              type="tel"
              value={editData.phone}
              onChange={(phone) => setEditData({ ...editData, phone })}
            />
            <InputSetting
              label="تاريخ الميلاد"
              type="date"
              value={editData.dateOfBirth}
              onChange={(dateOfBirth) =>
                setEditData({ ...editData, dateOfBirth })
              }
            />
            <SelectSetting
              label="الجنس"
              value={editData.gender}
              onChange={(gender) =>
                setEditData({
                  ...editData,
                  gender: gender as 'male' | 'female' | 'other',
                })
              }
              options={[
                { value: 'male', label: 'ذكر' },
                { value: 'female', label: 'أنثى' },
                { value: 'other', label: 'آخر' },
              ]}
            />
            <SelectSetting
              label="فصيلة الدم"
              value={editData.bloodType}
              onChange={(bloodType) =>
                setEditData({ ...editData, bloodType })
              }
              options={[
                { value: 'O+', label: 'O+' },
                { value: 'O-', label: 'O-' },
                { value: 'A+', label: 'A+' },
                { value: 'A-', label: 'A-' },
                { value: 'B+', label: 'B+' },
                { value: 'B-', label: 'B-' },
                { value: 'AB+', label: 'AB+' },
                { value: 'AB-', label: 'AB-' },
              ]}
            />
            <InputSetting
              label="رقم الهوية"
              value={editData.nationalId}
              onChange={(nationalId) =>
                setEditData({ ...editData, nationalId })
              }
            />
          </div>
        </SectionCard>

        {/* Address */}
        <SectionCard title="العنوان">
          <div className="px-6 py-4 space-y-4">
            <InputSetting
              label="العنوان"
              value={editData.address}
              onChange={(address) => setEditData({ ...editData, address })}
            />
            <InputSetting
              label="المدينة"
              value={editData.city}
              onChange={(city) => setEditData({ ...editData, city })}
            />
          </div>
        </SectionCard>

        {/* Emergency Contact */}
        <SectionCard title="جهة الاتصال الطارئة">
          <div className="px-6 py-4 space-y-4">
            <InputSetting
              label="الاسم"
              value={editData.emergencyContact}
              onChange={(emergencyContact) =>
                setEditData({ ...editData, emergencyContact })
              }
            />
            <InputSetting
              label="رقم الهاتف"
              type="tel"
              value={editData.emergencyPhone}
              onChange={(emergencyPhone) =>
                setEditData({ ...editData, emergencyPhone })
              }
            />
          </div>
        </SectionCard>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex-1 py-3 bg-muted text-foreground rounded-lg font-semibold hover:bg-muted/80 hover:cursor-pointer transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 hover:cursor-pointer transition-opacity"
          >
            حفظ التغييرات
          </button>
        </div>
        </div>
      </div>
    </PatientLayout>
  );
}
