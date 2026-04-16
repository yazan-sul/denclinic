'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import PatientLayout from '@/components/layouts/PatientLayout';
import { useAuth } from '@/context/AuthContext';

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
  const router = useRouter();
  const { user } = useAuth();

  const profile: PatientProfile = {
    name: user?.name || 'محمد أحمد علي',
    email: user?.email || 'mohammad@example.com',
    phone: user?.phoneNumber || '+966501234567',
    dateOfBirth: '1995-03-15',
    gender: 'male',
    bloodType: 'O+',
    nationalId: '1234567890',
    address: 'شارع الملك فهد، البناء 123',
    city: 'الرياض',
    emergencyContact: 'أحمد محمد (الأب)',
    emergencyPhone: '+966509876543',
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

  const genderText = {
    male: 'ذكر',
    female: 'أنثى',
    other: 'آخر',
  };

  return (
    <PatientLayout
      title="الملف الشخصي"
      subtitle="معلومات الحساب والبيانات الشخصية"
      showBackButton
      backHref="/patient/settings"
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
            <button
              onClick={() => router.push('/patient/settings/edit-profile')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-semibold cursor-pointer"
            >
              تعديل
            </button>
          </div>
        </div>

        {/* Basic Information */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4">المعلومات الأساسية</h3>
          <div className="space-y-3">
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
              <span className="font-semibold">{genderText[profile.gender]}</span>
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
        </div>

        {/* Address Information */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4">العنوان</h3>
          <div className="space-y-3">
            <div className="flex justify-between pb-3 border-b border-border">
              <span className="text-muted-foreground">العنوان</span>
              <span className="font-semibold">{profile.address}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">المدينة</span>
              <span className="font-semibold">{profile.city}</span>
            </div>
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-lg font-bold mb-4">جهة الاتصال الطارئة</h3>
          <div className="space-y-3">
            <div className="flex justify-between pb-3 border-b border-border">
              <span className="text-muted-foreground">الاسم</span>
              <span className="font-semibold">{profile.emergencyContact}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">رقم الهاتف</span>
              <span className="font-semibold">{profile.emergencyPhone}</span>
            </div>
          </div>
        </div>
      </div>
    </PatientLayout>
  );
}
