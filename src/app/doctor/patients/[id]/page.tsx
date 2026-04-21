'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import DoctorLayout from '@/components/layouts/DoctorLayout';
import TeethContainer from '@/components/model3D/TeethContainer';
import ToothDetails, { Tooth } from '@/components/model3D/ToothDetails';
import Legend from '@/components/model3D/Legend';
import { ArrowRight, User, Phone, Calendar, Mail } from 'lucide-react';

// Mock data for teeth status
const MOCK_TEETH_DATA: Record<number, Tooth> = {
  11: { number: 11, name: 'Central Incisor', condition: 'Healthy' },
  12: { number: 12, name: 'Lateral Incisor', condition: 'Cavity', notes: 'Needs cleaning and filling' },
  13: { number: 13, name: 'Canine', condition: 'Healthy' },
  14: { number: 14, name: 'First Premolar', condition: 'Filled' },
  15: { number: 15, name: 'Second Premolar', condition: 'Healthy' },
  // Add more as needed or keep it dynamic
};

export default function PatientProfilePage() {
  const { id } = useParams();
  const router = useRouter();
  const [selectedToothId, setSelectedToothId] = useState<number | null>(null);

  // In a real app, you'd fetch patient data here
  const patient = {
    name: 'محمد أحمد',
    phone: '0501234567',
    email: 'mohamed@example.com',
    lastVisit: '2024-03-15',
  };

  return (
    <DoctorLayout title="ملف المريض" subtitle="عرض سجلات المريض والخطة العلاجية">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>العودة لقائمة المرضى</span>
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Column: Patient Info */}
        <div className="xl:col-span-1 space-y-6">
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                <User className="w-10 h-10 text-primary" />
              </div>
              <h3 className="font-bold text-xl">{patient.name}</h3>
              <p className="text-sm text-muted-foreground">رقم الملف: #{id}</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">رقم الهاتف</p>
                  <p className="font-medium" dir="ltr">{patient.phone}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">البريد الإلكتروني</p>
                  <p className="font-medium">{patient.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">آخر زيارة</p>
                  <p className="font-medium">{patient.lastVisit}</p>
                </div>
              </div>
            </div>

            <button className="w-full mt-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity">
              بدء موعد جديد
            </button>
          </div>

          <ToothDetails 
            selectedTooth={selectedToothId} 
            teethData={MOCK_TEETH_DATA} 
          />
        </div>

        {/* Center/Right Column: 3D Model */}
        <div className="xl:col-span-3 space-y-6">
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden flex flex-col h-[700px]">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-secondary/5">
              <h3 className="font-bold">المخطط السني ثلاثي الأبعاد</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span>نموذج حي</span>
              </div>
            </div>
            
            <div className="flex-1 relative bg-secondary/10">
              <TeethContainer 
                onToothSelect={(name) => {
                  if (!name) {
                    setSelectedToothId(null);
                    return;
                  }
                  // Extract number from name if possible (e.g., "polySurface39052" -> mapped display name has number)
                  // For now, let's use a simple mapping or just parse the number from the display name in a real scenario
                  // Here we'll just mock the selection for demonstration
                  const toothNumber = parseInt(name.replace(/\D/g, '').slice(-2)); // Simple hack for demo
                  setSelectedToothId(toothNumber || 11);
                }}
              />
            </div>

            <div className="p-6 border-t border-border">
              <Legend />
            </div>
          </div>
        </div>
      </div>
    </DoctorLayout>
  );
}
