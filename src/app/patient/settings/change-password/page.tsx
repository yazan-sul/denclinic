'use client';

import { useState } from 'react';
import PatientLayout from '@/components/layouts/PatientLayout';
import InputSetting from '../components/InputSetting';
import SectionCard from '../components/SectionCard';

export default function ChangePasswordPage() {
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChangePassword = () => {
    setError('');
    setSuccess(false);

    if (!passwordData.current) {
      setError('أدخل كلمة المرور الحالية');
      return;
    }

    if (!passwordData.new) {
      setError('أدخل كلمة المرور الجديدة');
      return;
    }

    if (passwordData.new.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }

    if (passwordData.new !== passwordData.confirm) {
      setError('كلمات المرور غير متطابقة');
      return;
    }

    // Simulate API call
    setTimeout(() => {
      setSuccess(true);
      setPasswordData({ current: '', new: '', confirm: '' });
      setTimeout(() => {
        window.history.back();
      }, 1500);
    }, 1000);
  };

  return (
    <PatientLayout
      title="تغيير كلمة المرور"
      subtitle="حدّث كلمة مرورك للحفاظ على أمان حسابك"
      showBackButton
      backHref="/patient/settings"
    >
      <div className="flex justify-center">
        <div className="w-full max-w-lg space-y-6 pb-8">
        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Success Message */}
        {success && (
          <div className="bg-green-500/10 border border-green-200 text-green-600 px-4 py-3 rounded-lg text-sm">
            تم تحديث كلمة المرور بنجاح
          </div>
        )}

        {/* Password Form */}
        <SectionCard title="كلمة المرور">
          <div className="px-6 py-4 space-y-4">
            <InputSetting
              label="كلمة المرور الحالية"
              type="password"
              value={passwordData.current}
              onChange={(current) =>
                setPasswordData({ ...passwordData, current })
              }
              placeholder="أدخل كلمة المرور الحالية"
            />
            <InputSetting
              label="كلمة المرور الجديدة"
              type="password"
              value={passwordData.new}
              onChange={(newPwd) =>
                setPasswordData({ ...passwordData, new: newPwd })
              }
              placeholder="أدخل كلمة المرور الجديدة"
            />
            <InputSetting
              label="تأكيد كلمة المرور"
              type="password"
              value={passwordData.confirm}
              onChange={(confirm) =>
                setPasswordData({ ...passwordData, confirm })
              }
              placeholder="أعد إدخال كلمة المرور"
            />
          </div>
        </SectionCard>

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-600">
          <strong>نصيحة الأمان:</strong> استخدم كلمة مرور قوية تحتوي على أحرف وأرقام ورموز
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => window.history.back()}
            className="flex-1 py-3 bg-muted text-foreground rounded-lg font-semibold hover:bg-muted/80 hover:cursor-pointer transition-colors"
          >
            إلغاء
          </button>
          <button
            onClick={handleChangePassword}
            className="flex-1 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 hover:cursor-pointer transition-opacity disabled:opacity-50"
          >
            تحديث كلمة المرور
          </button>
        </div>
        </div>
      </div>
    </PatientLayout>
  );
}
