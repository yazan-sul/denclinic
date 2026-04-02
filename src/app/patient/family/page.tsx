'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import PatientLayout from '@/components/layouts/PatientLayout';
import { UsersIcon, ProfileIcon } from '@/components/Icons';

interface FamilyMember {
  id: number;
  name: string;
  relationship: string;
  age: number;
  bloodType?: string;
  lastCheckup?: string;
  avatar: string;
}

export default function FamilyPage() {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([
    {
      id: 1,
      name: 'أحمد محمد',
      relationship: 'الأب',
      age: 55,
      bloodType: 'O+',
      lastCheckup: '2024-03-15',
      avatar: '👨',
    },
    {
      id: 2,
      name: 'فاطمة محمد',
      relationship: 'الأم',
      age: 52,
      bloodType: 'B+',
      lastCheckup: '2024-02-20',
      avatar: '👩',
    },
    {
      id: 3,
      name: 'سارة محمد',
      relationship: 'الأخت',
      age: 22,
      bloodType: 'A+',
      lastCheckup: '2024-01-10',
      avatar: '👧',
    },
  ]);

  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    age: '',
    bloodType: '',
  });

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name && formData.relationship) {
      const newMember: FamilyMember = {
        id: familyMembers.length + 1,
        name: formData.name,
        relationship: formData.relationship,
        age: parseInt(formData.age) || 0,
        bloodType: formData.bloodType || undefined,
        avatar: '👤',
      };
      setFamilyMembers([...familyMembers, newMember]);
      setFormData({ name: '', relationship: '', age: '', bloodType: '' });
      setShowAddModal(false);
    }
  };

  const handleDeleteMember = (id: number) => {
    setFamilyMembers(familyMembers.filter(member => member.id !== id));
  };

  return (
    <PatientLayout 
      title="العائلة" 
      subtitle="إدارة أفراد العائلة والسجلات الطبية"
      showBackButton 
      backHref="/patient"
    >
      <div className="space-y-6">
        {/* Add Member Button */}
        <button
          onClick={() => setShowAddModal(true)}
          className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        >
          <span>+ أضف فرد عائلي</span>
        </button>

        {/* Family Members Grid */}
        {familyMembers.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {familyMembers.map((member) => (
              <div
                key={member.id}
                className="bg-card border border-border rounded-lg p-4 space-y-3 hover:shadow-lg transition-shadow"
              >
                {/* Member Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-2xl">
                      {member.avatar}
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{member.name}</h3>
                      <p className="text-sm text-primary font-medium">
                        {member.relationship}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Member Details */}
                <div className="space-y-2 border-t border-border pt-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground text-sm">العمر</span>
                    <span className="font-semibold">{member.age} سنة</span>
                  </div>
                  {member.bloodType && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">فصيلة الدم</span>
                      <span className="font-semibold bg-red-500/20 text-red-700 px-2 py-1 rounded text-xs">
                        {member.bloodType}
                      </span>
                    </div>
                  )}
                  {member.lastCheckup && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground text-sm">آخر فحص</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(member.lastCheckup).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-3 border-t border-border">
                  <Link
                    href={`/patient/family/${member.id}`}
                    className="flex-1 py-2 bg-secondary text-foreground rounded-lg text-sm font-semibold hover:bg-secondary/80 transition-colors text-center"
                  >
                    السجل الطبي
                  </Link>
                  <button
                    onClick={() => handleDeleteMember(member.id)}
                    className="px-3 py-2 bg-destructive/20 text-destructive rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">👨‍👩‍👧‍👦</div>
            <h2 className="text-lg font-semibold mb-2">لا توجد أفراد عائلة</h2>
            <p className="text-muted-foreground mb-4">
              أضف أفراد عائلتك لتتمكن من إدارة سجلاتهم الطبية
            </p>
          </div>
        )}
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-background w-full md:w-96 rounded-t-lg md:rounded-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-right">أضف فرد عائلي</h2>

            <form onSubmit={handleAddMember} className="space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  الاسم
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  placeholder="أدخل الاسم الكامل"
                  required
                />
              </div>

              {/* Relationship */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  الصلة
                </label>
                <select
                  value={formData.relationship}
                  onChange={(e) =>
                    setFormData({ ...formData, relationship: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  required
                >
                  <option value="">اختر الصلة</option>
                  <option value="الزوج">الزوج</option>
                  <option value="الزوجة">الزوجة</option>
                  <option value="الأب">الأب</option>
                  <option value="الأم">الأم</option>
                  <option value="الابن">الابن</option>
                  <option value="الابنة">الابنة</option>
                  <option value="الأخ">الأخ</option>
                  <option value="الأخت">الأخت</option>
                  <option value="الجد">الجد</option>
                  <option value="الجدة">الجدة</option>
                  <option value="الحفيد">الحفيد</option>
                  <option value="الحفيدة">الحفيدة</option>
                  <option value="العم">العم</option>
                  <option value="العمة">العمة</option>
                  <option value="الخال">الخال</option>
                  <option value="الخالة">الخالة</option>
                </select>
              </div>

              {/* Age */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  العمر
                </label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) =>
                    setFormData({ ...formData, age: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  placeholder="أدخل العمر"
                />
              </div>

              {/* Blood Type */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  فصيلة الدم (اختياري)
                </label>
                <select
                  value={formData.bloodType}
                  onChange={(e) =>
                    setFormData({ ...formData, bloodType: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                >
                  <option value="">اختر فصيلة الدم</option>
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

              {/* Buttons */}
              <div className="flex gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 bg-muted text-foreground rounded-lg font-semibold hover:bg-muted/80 transition-colors"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
                >
                  إضافة
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PatientLayout>
  );
}
