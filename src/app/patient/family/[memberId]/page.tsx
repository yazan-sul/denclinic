'use client';

import React, { useState } from 'react';
import { useParams } from 'next/navigation';
import PatientLayout from '@/components/layouts/PatientLayout';

interface MedicalRecord {
  id: number;
  date: string;
  doctor: string;
  clinic: string;
  service: string;
  notes: string;
  prescriptions?: string[];
}

export default function FamilyMemberDetailsPage() {
  const params = useParams();
  const memberId = params.memberId as string;

  // Mock family member data
  const familyMember = {
    id: parseInt(memberId),
    name: 'أحمد محمد',
    relationship: 'الأب',
    age: 55,
    bloodType: 'O+',
    avatar: '👨',
  };

  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([
    {
      id: 1,
      date: '2024-03-15',
      doctor: 'د. خالد محمود',
      clinic: 'عيادة عبد اللطيف',
      service: 'فحص عام',
      notes: 'الحالة صحية جيدة، ضغط الدم طبيعي',
      prescriptions: ['دواء X', 'دواء Y'],
    },
    {
      id: 2,
      date: '2024-02-10',
      doctor: 'د. فاطمة أحمد',
      clinic: 'عيادة الأسنان',
      service: 'تنظيف الأسنان',
      notes: 'تم تنظيف الأسنان بنجاح',
    },
  ]);

  const [showAddRecord, setShowAddRecord] = useState(false);
  const [newRecord, setNewRecord] = useState({
    doctor: '',
    clinic: '',
    service: '',
    notes: '',
  });

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRecord.doctor && newRecord.clinic) {
      const record: MedicalRecord = {
        id: medicalRecords.length + 1,
        date: new Date().toISOString().split('T')[0],
        ...newRecord,
      };
      setMedicalRecords([record, ...medicalRecords]);
      setNewRecord({ doctor: '', clinic: '', service: '', notes: '' });
      setShowAddRecord(false);
    }
  };

  const handleDeleteRecord = (id: number) => {
    setMedicalRecords(medicalRecords.filter(record => record.id !== id));
  };

  return (
    <PatientLayout
      title={familyMember.name}
      subtitle={`السجل الطبي - ${familyMember.relationship}`}
      showBackButton
      backHref="/patient/family"
    >
      <div className="space-y-6">
        {/* Member Info Card */}
        <div className="bg-card border border-border rounded-lg p-4 md:p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center text-4xl">
              {familyMember.avatar}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{familyMember.name}</h2>
              <p className="text-muted-foreground">{familyMember.relationship}</p>
              <div className="flex gap-4 mt-2 text-sm">
                <span>العمر: <span className="font-semibold">{familyMember.age}</span></span>
                <span>فصيلة الدم: <span className="font-semibold bg-red-500/20 text-red-700 px-2 py-1 rounded">{familyMember.bloodType}</span></span>
              </div>
            </div>
          </div>
        </div>

        {/* Add Record Button */}
        <button
          onClick={() => setShowAddRecord(true)}
          className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          + أضف سجل طبي
        </button>

        {/* Medical Records */}
        <div className="space-y-3">
          <h3 className="text-xl font-bold">السجلات الطبية</h3>
          {medicalRecords.length > 0 ? (
            medicalRecords.map((record) => (
              <div
                key={record.id}
                className="bg-card border border-border rounded-lg p-4 space-y-3"
              >
                {/* Record Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(record.date).toLocaleDateString('ar-SA')}
                    </p>
                    <h4 className="font-semibold text-lg">{record.service}</h4>
                  </div>
                  <button
                    onClick={() => handleDeleteRecord(record.id)}
                    className="px-3 py-1 bg-destructive/20 text-destructive rounded text-sm font-semibold hover:opacity-90 transition-opacity"
                  >
                    حذف
                  </button>
                </div>

                {/* Record Details */}
                <div className="space-y-2 border-t border-border pt-3 text-right">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الطبيب</span>
                    <span className="font-semibold">{record.doctor}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">العيادة</span>
                    <span className="font-semibold">{record.clinic}</span>
                  </div>
                  {record.notes && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-sm text-muted-foreground mb-1">الملاحظات</p>
                      <p className="text-sm">{record.notes}</p>
                    </div>
                  )}
                  {record.prescriptions && record.prescriptions.length > 0 && (
                    <div className="pt-2 border-t border-border">
                      <p className="text-sm text-muted-foreground mb-2">الأدوية</p>
                      <div className="flex flex-wrap gap-2">
                        {record.prescriptions.map((med, idx) => (
                          <span
                            key={idx}
                            className="bg-blue-500/20 text-blue-700 px-3 py-1 rounded text-xs font-semibold"
                          >
                            {med}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">لا توجد سجلات طبية</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Record Modal */}
      {showAddRecord && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
          <div className="bg-background w-full md:w-96 rounded-t-lg md:rounded-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-right">أضف سجل طبي</h2>

            <form onSubmit={handleAddRecord} className="space-y-4">
              {/* Doctor */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  اسم الطبيب
                </label>
                <input
                  type="text"
                  value={newRecord.doctor}
                  onChange={(e) =>
                    setNewRecord({ ...newRecord, doctor: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  placeholder="أدخل اسم الطبيب"
                  required
                />
              </div>

              {/* Clinic */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  اسم العيادة
                </label>
                <input
                  type="text"
                  value={newRecord.clinic}
                  onChange={(e) =>
                    setNewRecord({ ...newRecord, clinic: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  placeholder="أدخل اسم العيادة"
                  required
                />
              </div>

              {/* Service */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  الخدمة/الفحص
                </label>
                <input
                  type="text"
                  value={newRecord.service}
                  onChange={(e) =>
                    setNewRecord({ ...newRecord, service: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  placeholder="أدخل الخدمة"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-right">
                  الملاحظات (اختياري)
                </label>
                <textarea
                  value={newRecord.notes}
                  onChange={(e) =>
                    setNewRecord({ ...newRecord, notes: e.target.value })
                  }
                  className="w-full px-4 py-2 bg-muted border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-right"
                  placeholder="أدخل الملاحظات"
                  rows={4}
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddRecord(false)}
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
