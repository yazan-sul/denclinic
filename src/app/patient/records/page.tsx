'use client';

import React, { useState } from 'react';
import PatientLayout from '@/components/layouts/PatientLayout';

interface MedicalRecord {
  id: number;
  date: string;
  doctor: string;
  clinic: string;
  service: string;
  status: 'completed' | 'pending';
  notes?: string;
  prescriptions?: string[];
  attachments?: string[];
}

export default function RecordsPage() {
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([
    {
      id: 1,
      date: '2024-03-15',
      doctor: 'د. خالد محمود',
      clinic: 'عيادة عبد اللطيف سليمان',
      service: 'فحص عام',
      status: 'completed',
      notes: 'الفحص الدوري السنوي - الحالة الصحية جيدة',
      prescriptions: ['فيتامين D 1000 IU'],
    },
    {
      id: 2,
      date: '2024-02-20',
      doctor: 'د. فاطمة أحمد',
      clinic: 'عيادة عبد اللطيف سليمان',
      service: 'تنظيف الأسنان',
      status: 'completed',
      notes: 'تنظيف شامل للأسنان - لا توجد مشاكل',
    },
    {
      id: 3,
      date: '2024-01-10',
      doctor: 'د. محمد علي',
      clinic: 'عيادة عبد اللطيف سليمان',
      service: 'معالجة لبية',
      status: 'completed',
      notes: 'معالجة ناجحة للسن المصاب',
    },
  ]);

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'completed' | 'pending'>('all');

  const filteredRecords =
    filterStatus === 'all'
      ? medicalRecords
      : medicalRecords.filter((r) => r.status === filterStatus);

  const sortedRecords = [...filteredRecords].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-700';
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-700';
      default:
        return 'bg-gray-500/20 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'مكتمل';
      case 'pending':
        return 'قيد الانتظار';
      default:
        return status;
    }
  };

  return (
    <PatientLayout
      title="السجلات الطبية"
      subtitle="سجل زياراتك الطبية والتشخيصات"
      showBackButton
      backHref="/patient"
    >
      <div className="space-y-4">
        {/* Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium transition-colors ${
              filterStatus === 'all'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            الكل ({medicalRecords.length})
          </button>
          <button
            onClick={() => setFilterStatus('completed')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium transition-colors ${
              filterStatus === 'completed'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            مكتمل ({medicalRecords.filter((r) => r.status === 'completed').length})
          </button>
          <button
            onClick={() => setFilterStatus('pending')}
            className={`px-4 py-2 rounded-lg whitespace-nowrap font-medium transition-colors ${
              filterStatus === 'pending'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-foreground hover:bg-secondary/80'
            }`}
          >
            قيد الانتظار ({medicalRecords.filter((r) => r.status === 'pending').length})
          </button>
        </div>

        {/* Records List */}
        {sortedRecords.length > 0 ? (
          <div className="space-y-3">
            {sortedRecords.map((record) => (
              <div
                key={record.id}
                className="bg-card border border-border rounded-lg p-4 space-y-3 hover:shadow-lg transition-shadow"
              >
                {/* Record Header */}
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() =>
                    setExpandedId(expandedId === record.id ? null : record.id)
                  }
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{record.service}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(
                          record.status
                        )}`}
                      >
                        {getStatusLabel(record.status)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {new Date(record.date).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                  <div className="text-xl transition-transform">
                    {expandedId === record.id ? '▼' : '◀'}
                  </div>
                </div>

                {/* Record Details - Expandable */}
                {expandedId === record.id && (
                  <div className="space-y-3 border-t border-border pt-3">
                    {/* Doctor & Clinic */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">الطبيب</p>
                        <p className="font-semibold text-sm">{record.doctor}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">العيادة</p>
                        <p className="font-semibold text-sm">{record.clinic}</p>
                      </div>
                    </div>

                    {/* Notes */}
                    {record.notes && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">
                          الملاحظات
                        </p>
                        <p className="text-sm text-foreground">{record.notes}</p>
                      </div>
                    )}

                    {/* Prescriptions */}
                    {record.prescriptions && record.prescriptions.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">الأدوية</p>
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

                    {/* Attachments */}
                    {record.attachments && record.attachments.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-2">
                          المرفقات
                        </p>
                        <div className="space-y-2">
                          {record.attachments.map((attachment, idx) => (
                            <button
                              key={idx}
                              className="w-full text-left px-3 py-2 bg-muted rounded text-sm font-semibold hover:bg-muted/80 transition-colors flex items-center gap-2"
                            >
                              📄 {attachment}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <button className="flex-1 py-2 bg-secondary text-foreground rounded-lg text-sm font-semibold hover:bg-secondary/80 transition-colors">
                        طباعة
                      </button>
                      <button className="flex-1 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity">
                        مشاركة
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-5xl mb-4">📋</div>
            <h2 className="text-lg font-semibold mb-2">لا توجد سجلات طبية</h2>
            <p className="text-muted-foreground">
              لم تتم أي زيارات طبية بعد
            </p>
          </div>
        )}
      </div>
    </PatientLayout>
  );
}
