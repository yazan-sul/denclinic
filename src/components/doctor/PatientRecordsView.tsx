'use client';

import { useState, useEffect } from 'react';
import { UsersIcon, SearchIcon, PhoneIcon, CalendarIcon } from '@/components/Icons';

interface Patient {
  id: number;
  name: string;
  phone: string;
  email: string;
  lastVisit: string;
  visitCount: number;
}

const PatientRecordsView = () => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'lastVisit' | 'visitCount'>('lastVisit');

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch('/api/clinic/records?pageSize=500', { credentials: 'include' });
        const json = await res.json();
        if (!json.success) throw new Error(json.error?.message || 'فشل تحميل البيانات');

        // Derive unique patients from appointment records
        const patientMap = new Map<number, Patient>();
        for (const apt of json.data) {
          const u = apt.patient?.user;
          const p = apt.patient;
          if (!p || !u) continue;
          const existing = patientMap.get(p.id);
          const visitDate = apt.appointmentDate?.split('T')[0] ?? '';
          if (!existing) {
            patientMap.set(p.id, {
              id: p.id,
              name: u.name ?? '',
              phone: u.phoneNumber ?? '',
              email: u.email ?? '',
              lastVisit: visitDate,
              visitCount: 1,
            });
          } else {
            existing.visitCount += 1;
            if (visitDate > existing.lastVisit) existing.lastVisit = visitDate;
          }
        }
        setPatients(Array.from(patientMap.values()));
      } catch (err: any) {
        setError(err.message ?? 'حدث خطأ');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const filteredPatients = patients.filter(
    (p) =>
      p.name.includes(searchQuery) ||
      p.phone.includes(searchQuery) ||
      p.email.includes(searchQuery)
  );

  const sortedPatients = [...filteredPatients].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name, 'ar');
      case 'lastVisit':
        return b.lastVisit.localeCompare(a.lastVisit);
      case 'visitCount':
        return b.visitCount - a.visitCount;
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

          <div className="flex flex-wrap gap-2">
            {(['lastVisit', 'name', 'visitCount'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  sortBy === key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {key === 'lastVisit' ? 'آخر زيارة' : key === 'name' ? 'الاسم' : 'عدد الزيارات'}
              </button>
            ))}
          </div>
        </div>

        {/* Patients List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>جاري التحميل...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">
              <p>{error}</p>
            </div>
          ) : sortedPatients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UsersIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>{searchQuery ? 'لا توجد نتائج بحث' : 'لا يوجد مرضى'}</p>
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
                      {patient.lastVisit && (
                        <span className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4" />
                          آخر زيارة: {new Date(patient.lastVisit).toLocaleDateString('ar-SA')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {patient.visitCount} زيارة
                    </span>
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
              <div className="space-y-3 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">الاسم</p>
                  <p className="font-medium">{selectedPatient.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">الهاتف</p>
                  <p className="font-medium">{selectedPatient.phone}</p>
                </div>
                {selectedPatient.email && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">البريد الإلكتروني</p>
                    <p className="font-medium text-sm">{selectedPatient.email}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">عدد الزيارات</p>
                  <p className="font-medium">{selectedPatient.visitCount} زيارة</p>
                </div>
                {selectedPatient.lastVisit && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">آخر زيارة</p>
                    <p className="font-medium">
                      {new Date(selectedPatient.lastVisit).toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                )}
              </div>
            </div>

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
