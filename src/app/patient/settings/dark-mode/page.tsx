'use client';

import PatientLayout from '@/components/layouts/PatientLayout';
import SectionCard from '../components/SectionCard';
import { Theme, useTheme } from '@/context/ThemeContext';

export default function DarkModePage() {
  const { theme: darkMode, setTheme } = useTheme();

  const themes: { value: Theme; label: string; icon: string }[] = [
    { value: 'light', label: 'الوضع الفاتح', icon: '☀️' },
    { value: 'dark', label: 'الوضع الداكن', icon: '🌙' },
    { value: 'system', label: 'حسب النظام', icon: '🖥️' },
  ];

  const handleSave = () => {
    setTheme(darkMode);
    window.history.back();
  };

  return (
    <PatientLayout
      title="الوضع الداكن"
      subtitle="اختر موضوع التطبيق المفضل لديك"
      showBackButton
      backHref="/patient/settings"
    >
      <div className="flex justify-center">
        <div className="w-full max-w-lg space-y-6 pb-8">
          <SectionCard title="">
            <div className="px-6 py-4 space-y-3">
              {themes.map((theme) => (
                <label
                  key={theme.value}
                  className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-muted/50 hover:cursor-pointer transition-colors"
                >
                  <input
                    type="radio"
                    name="theme"
                    value={theme.value}
                    checked={darkMode === theme.value}
                    onChange={(e) => setTheme(e.target.value as Theme)}
                    className="w-4 h-4 cursor-pointer"
                  />
                  <span className="text-2xl">{theme.icon}</span>
                  <p className="font-semibold text-sm flex-1">{theme.label}</p>
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
