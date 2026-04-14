'use client';

import { useState } from 'react';
import { UsersIcon, SearchIcon, FileIcon, PhoneIcon, CalendarIcon } from '@/components/Icons';

interface Patient {
  id: number;
  name: string;
  phone: string;
  email: string;
  age: number;
  lastVisit: string;
  status: 'active' | 'inactive';
  medicalConditions: string[];
}

const PatientRecordsView = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([
    {
      id: 1,
      name: 'أحمد محمد',
      phone: '+966501234567',
      email: 'ahmed@example.com',
      age: 35,
      lastVisit: '2026-04-10',
      status: 'active',
      medicalConditions: ['تسوس'],
    },
    {
      id: 2,
      name: 'فاطمة علي',
      phone: '+966501234568',
      email: 'fatima@example.com',
      age: 28,
      lastVisit: '2026-04-12',
      status: 'active',
      medicalConditions: ['التهاب اللثة', 'تبييض'],
    },
    {
      id: 3,
      name: 'محمود حسن',
      phone: '+966501234569',
      email: 'mahmoud@example.com',
      age: 45,
      lastVisit: '2026-03-25',
      status: 'inactive',
      medicalConditions: ['فقدان الأسنان'],
    },
    {
      id: 4,
      name: 'سارة أحمد',
      phone: '+966501234570',
      email: 'sarah@example.com',
      age: 32,
      lastVisit: '2026-04-05',
      status: 'active',
      medicalConditions: ['حساسية الأسنان'],
    },
    {
      id: 5,
      name: 'علي محمود',
      phone: '+966501234571',
      email: 'ali@example.com',
      age: 50,
      lastVisit: '2026-02-15',
      status: 'inactive',
      medicalConditions: ['أمراض اللثة'],
    },
  ]);

  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'lastVisit' | 'status'>('lastVisit');

  const filteredPatients = patients.filter(
    (p) =>
      p.name.includes(searchQuery) ||
      p.phone.includes(searchQuery) ||
      p.email.includes(searchQuery)
  );

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'lastVisit':
        return new Date(b.lastVisit).getTime() - new Date(a.lastVisit).getTime();
      case 'status':
        return a.status.localeCompare(b.status);
      default:
        return 0;
    }
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Patient List */}
      <div className="lg:col-span-2 space-y-4">
        {/* Search and Sort */}
        <div className="bg-card rounded-lg border border-border p-4 space-y-4">
          {/* Search Box */}
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="ابحث بالاسم أو الهاتف أو البريد الإلكتروني..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Sort Options */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSortBy('lastVisit')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                sortBy === 'lastVisit'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              آخر زيارة
            </button>
            <button
              onClick={() => setSortBy('name')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                sortBy === 'name'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              الاسم
            </button>
            <button
              onClick={() => setSortBy('status')}
              className={`px-4 py-2 rounded-lg transition-colors ${
                sortBy === 'status'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              الحالة
            </button>
          </div>
        </div>

        {/* Patients List */}
        <div className="space-y-3">
          {sortedPatients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>لا توجد نتائج بحث</p>
            </div>
          ) : (
            sortedPatients.map((patient) => (
              <div
                key={patient.id}
                onClick={() => setSelectedPatient(patient)}
                className={`bg-card rounded-lg border border-border p-4 cursor-pointer hover:shadow-md transition-all ${
                  selectedPatient?.id === patient.id ? 'ring-2 ring-primary' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">{patient.name}</h3>
                    <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <PhoneIcon className="w-4 h-4" />
                        {patient.phone}
                      </span>
                      <span className="flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        آخر زيارة: {new Date(patient.lastVisit).toLocaleDateString('ar-SA')}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        patient.status === 'active'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {patient.status === 'active' ? 'نشط' : 'غير نشط'}
                    </span>
                    <span className="text-xs text-muted-foreground">{patient.age} سنة</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Patient Details Panel */}
      <div className="h-fit">
        {selectedPatient ? (
          <div className="bg-card rounded-lg border border-border p-6 space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4">بيانات المريض</h2>

              {/* Personal Info */}
              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">الاسم</p>
                  <p className="font-medium">{selectedPatient.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">السن</p>
                  <p className="font-medium">{selectedPatient.age} سنة</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">الهاتف</p>
                  <p className="font-medium">{selectedPatient.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">البريد الإلكتروني</p>
                  <p className="font-medium text-sm">{selectedPatient.email}</p>
                </div>
              </div>

              {/* Medical Conditions */}
              <div>
                <p className="text-sm text-muted-foreground mb-2">الحالات الطبية</p>
                <div className="flex flex-wrap gap-2">
                  {selectedPatient.medicalConditions.length > 0 ? (
                    selectedPatient.medicalConditions.map((condition, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                      >
                        {condition}
                      </span>
                    ))
                  ) : (
                    <p className="text-muted-foreground text-sm">لا توجد حالات</p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-6 border-t border-border">
              <button className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium cursor-pointer">
                عرض السجل الطبي
              </button>
              <button className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium">
                جدول المواعيد
              </button>
              <button className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors font-medium">
                إضافة ملاحظات
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-card rounded-lg border border-border p-6 text-center text-muted-foreground h-64 flex items-center justify-center">
            <div>
              <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>اختر مريضا لعرض التفاصيل</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientRecordsView;
