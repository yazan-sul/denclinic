'use client';

import { useState } from 'react';
import PatientLayout from '@/components/layouts/PatientLayout';
import SectionCard from '../components/SectionCard';

export default function LanguagePage() {
  const [selectedLanguage, setSelectedLanguage] = useState('ar');

  const languages = [
    { value: 'ar', label: 'العربية', nativeName: 'العربية' },
    { value: 'en', label: 'English', nativeName: 'English' },
  ];

  const handleSave = () => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = selectedLanguage;
      document.documentElement.dir =
        selectedLanguage === 'ar' ? 'rtl' : 'ltr';
    }
    window.history.back();
  };

  return (
    <PatientLayout
      title="اللغة"
      subtitle="اختر لغة التطبيق المفضلة لديك"
      showBackButton
      backHref="/patient/settings"
    >
      <div className="flex justify-center">
        <div className="w-full max-w-lg space-y-6 pb-8">
          <SectionCard title="">
            <div className="px-6 py-4 space-y-3">
              {languages.map((lang) => (
                <label
                  key={lang.value}
                  className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 hover:cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="language"
                    value={lang.value}
                    checked={selectedLanguage === lang.value}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-sm">{lang.nativeName}</p>
                    <p className="text-xs text-muted-foreground">{lang.label}</p>
                  </div>
                </label>
              ))}
            </div>
          </SectionCard>

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
              حفظ
            </button>
          </div>
        </div>
      </div>
    </PatientLayout>
  );
}
