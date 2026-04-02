'use client';

import React, { useState } from 'react';
import PatientLayout from '@/components/layouts/PatientLayout';
import { EditIcon } from '@/components/Icons';

interface PatientProfile {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  bloodType: string;
  nationalId: string;
  address: string;
  city: string;
  emergencyContact: string;
  emergencyPhone: string;
}

export default function ProfilePage() {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<PatientProfile>({
    name: 'محمد أحمد علي',
    email: 'mohammad@example.com',
    phone: '+966501234567',
    dateOfBirth: '1995-03-15',
    gender: 'male',
    bloodType: 'O+',
    nationalId: '1234567890',
    address: 'شارع الملك فهد، البناء 123',
    city: 'الرياض',
    emergencyContact: 'أحمد محمد (الأب)',
    emergencyPhone: '+966509876543',
  });

  const [editData, setEditData] = useState(profile);

  const handleSave = () => {
    setProfile(editData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditData(profile);
    setIsEditing(false);
  };

  const getAgeFromBirthDate = (dateString: string) => {
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }
    return age;
  };

  return (
    <PatientLayout
      title="الملف الشخصي"
      subtitle="معلومات الحساب والبيانات الشخصية"
      showBackButton
      backHref="/patient"
    >
      <div className="space-y-6 max-w-2xl">
        {/* Profile Header */}
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-4xl">
                👤
              </div>
              <div>
                <h2 className="text-2xl font-bold">{profile.name}</h2>
                <p className="text-muted-foreground">{profile.email}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {getAgeFromBirthDate(profile.dateOfBirth)} سنة
                </p>
              </div>
            </div>
            {!isEditing && (
              <button
                onClick={() => {
                  setEditData(profile);
                  setIsEditing(true);
                }}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
              >
                ✎ تعديل
              </button>
            )}
          </div>
        </div>

        {/* Basic Information */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-bold mb-4">المعلومات الأساسية</h3>

          {isEditing ? (
            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  الاسم الكامل
                </label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) =>
                    setEditData({ ...editData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  value={editData.email}
                  onChange={(e) =>
                    setEditData({ ...editData, email: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  value={editData.phone}
                  onChange={(e) =>
                    setEditData({ ...editData, phone: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  تاريخ الميلاد
                </label>
                <input
                  type="date"
                  value={editData.dateOfBirth}
                  onChange={(e) =>
                    setEditData({ ...editData, dateOfBirth: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                />
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  الجنس
                </label>
                <select
                  value={editData.gender}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      gender: e.target.value as 'male' | 'female' | 'other',
                    })
                  }
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                >
                  <option value="male">ذكر</option>
                  <option value="female">أنثى</option>
                  <option value="other">آخر</option>
                </select>
              </div>

              {/* Blood Type */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  فصيلة الدم
                </label>
                <select
                  value={editData.bloodType}
                  onChange={(e) =>
                    setEditData({ ...editData, bloodType: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                >
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                </select>
              </div>

              {/* National ID */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  رقم الهوية
                </label>
                <input
                  type="text"
                  value={editData.nationalId}
                  onChange={(e) =>
                    setEditData({ ...editData, nationalId: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                />
              </div>
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
        </div>

        {/* Address Information */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-bold mb-4">العنوان</h3>

          {isEditing ? (
            <div className="space-y-4">
              {/* Address */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  العنوان
                </label>
                <input
                  type="text"
                  value={editData.address}
                  onChange={(e) =>
                    setEditData({ ...editData, address: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  المدينة
                </label>
                <input
                  type="text"
                  value={editData.city}
                  onChange={(e) =>
                    setEditData({ ...editData, city: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                />
              </div>
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
        </div>

        {/* Emergency Contact */}
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-bold mb-4">جهة الاتصال الطارئة</h3>

          {isEditing ? (
            <div className="space-y-4">
              {/* Emergency Contact */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  الاسم
                </label>
                <input
                  type="text"
                  value={editData.emergencyContact}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      emergencyContact: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                />
              </div>

              {/* Emergency Phone */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  value={editData.emergencyPhone}
                  onChange={(e) =>
                    setEditData({
                      ...editData,
                      emergencyPhone: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                />
              </div>
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
        </div>

        {/* Action Buttons */}
        {isEditing ? (
          <div className="flex gap-3">
            <button
              onClick={handleCancel}
              className="flex-1 py-3 bg-muted text-foreground rounded-lg font-semibold hover:bg-muted/80 transition-colors"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
            >
              حفظ التغييرات
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <button className="flex-1 py-3 bg-secondary text-foreground rounded-lg font-semibold hover:bg-secondary/80 transition-colors">
              تغيير كلمة المرور
            </button>
            <button className="flex-1 py-3 bg-destructive/20 text-destructive rounded-lg font-semibold hover:opacity-90 transition-opacity">
              تسجيل الخروج
            </button>
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
