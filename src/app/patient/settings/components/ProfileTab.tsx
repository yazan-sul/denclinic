'use client';

import React from 'react';
import SettingCard from './SettingCard';
import InputSetting from './InputSetting';
import SelectSetting from './SelectSetting';
import { PatientProfile } from '../hooks/useSettingsState';

interface ProfileTabProps {
  profile: PatientProfile;
  editData: PatientProfile;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onEditChange: (data: PatientProfile) => void;
  getAge: (dateString: string) => number;
}

export default function ProfileTab({
  profile,
  editData,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  onEditChange,
  getAge,
}: ProfileTabProps) {
  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <SettingCard
        title="الملف الشخصي"
        action={
          !isEditing && (
            <button
              onClick={onStartEdit}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              تعديل
            </button>
          )
        }
      >
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-4xl">
            👤
          </div>
          <div>
            <h2 className="text-2xl font-bold">{profile.name}</h2>
            <p className="text-muted-foreground">{profile.email}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {getAge(profile.dateOfBirth)} سنة
            </p>
          </div>
        </div>
      </SettingCard>

      {/* Basic Information */}
      <SettingCard title="المعلومات الأساسية">
        {isEditing ? (
          <div className="space-y-4">
            <InputSetting
              label="الاسم الكامل"
              value={editData.name}
              onChange={(name) => onEditChange({ ...editData, name })}
            />
            <InputSetting
              label="البريد الإلكتروني"
              type="email"
              value={editData.email}
              onChange={(email) => onEditChange({ ...editData, email })}
            />
            <InputSetting
              label="رقم الهاتف"
              type="tel"
              value={editData.phone}
              onChange={(phone) => onEditChange({ ...editData, phone })}
            />
            <InputSetting
              label="تاريخ الميلاد"
              type="date"
              value={editData.dateOfBirth}
              onChange={(dateOfBirth) =>
                onEditChange({ ...editData, dateOfBirth })
              }
            />
            <SelectSetting
              label="الجنس"
              value={editData.gender}
              onChange={(gender) =>
                onEditChange({
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
                onEditChange({ ...editData, bloodType })
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
                onEditChange({ ...editData, nationalId })
              }
            />
          </div>
        ) : (
          <div className="space-y-3 text-right">
            <div className="flex justify-between pb-3 border-b border-border">
              <span className="text-muted-foreground">البريد الإلكتروني</span>
              <span className="font-semibold">{profile.email}</span>
            </div>
            <div className="flex justify-between pb-3 border-b border-border">
              <span className="text-muted-foreground">رقم الهاتف</span>
              <span className="font-semibold">{profile.phone}</span>
            </div>
            <div className="flex justify-between pb-3 border-b border-border">
              <span className="text-muted-foreground">تاريخ الميلاد</span>
              <span className="font-semibold">
                {new Date(profile.dateOfBirth).toLocaleDateString('ar-SA')}
              </span>
            </div>
            <div className="flex justify-between pb-3 border-b border-border">
              <span className="text-muted-foreground">الجنس</span>
              <span className="font-semibold">
                {profile.gender === 'male'
                  ? 'ذكر'
                  : profile.gender === 'female'
                    ? 'أنثى'
                    : 'آخر'}
              </span>
            </div>
            <div className="flex justify-between pb-3 border-b border-border">
              <span className="text-muted-foreground">فصيلة الدم</span>
              <span className="font-semibold bg-red-500/20 text-red-700 px-2 py-1 rounded">
                {profile.bloodType}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">رقم الهوية</span>
              <span className="font-semibold">{profile.nationalId}</span>
            </div>
          </div>
        )}
      </SettingCard>

      {/* Address Information */}
      <SettingCard title="العنوان">
        {isEditing ? (
          <div className="space-y-4">
            <InputSetting
              label="العنوان"
              value={editData.address}
              onChange={(address) => onEditChange({ ...editData, address })}
            />
            <InputSetting
              label="المدينة"
              value={editData.city}
              onChange={(city) => onEditChange({ ...editData, city })}
            />
          </div>
        ) : (
          <div className="space-y-3 text-right">
            <div className="flex justify-between pb-3 border-b border-border">
              <span className="text-muted-foreground">العنوان</span>
              <span className="font-semibold">{profile.address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">المدينة</span>
              <span className="font-semibold">{profile.city}</span>
            </div>
          </div>
        )}
      </SettingCard>

      {/* Emergency Contact */}
      <SettingCard title="جهة الاتصال الطارئة">
        {isEditing ? (
          <div className="space-y-4">
            <InputSetting
              label="الاسم"
              value={editData.emergencyContact}
              onChange={(emergencyContact) =>
                onEditChange({ ...editData, emergencyContact })
              }
            />
            <InputSetting
              label="رقم الهاتف"
              type="tel"
              value={editData.emergencyPhone}
              onChange={(emergencyPhone) =>
                onEditChange({ ...editData, emergencyPhone })
              }
            />
          </div>
        ) : (
          <div className="space-y-3 text-right">
            <div className="flex justify-between pb-3 border-b border-border">
              <span className="text-muted-foreground">الاسم</span>
              <span className="font-semibold">{profile.emergencyContact}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">رقم الهاتف</span>
              <span className="font-semibold">{profile.emergencyPhone}</span>
            </div>
          </div>
        )}
      </SettingCard>

      {isEditing && (
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-muted text-foreground rounded-lg font-semibold hover:bg-muted/80 transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={onSave}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
          >
            حفظ التغييرات
          </button>
        </div>
      )}
    </div>
  );
}
