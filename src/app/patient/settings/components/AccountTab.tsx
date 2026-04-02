'use client';

import { useState } from 'react';
import SettingCard from './SettingCard';
import InputSetting from './InputSetting';

export default function AccountTab() {
  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: '',
  });

  const handleChangePassword = () => {
    if (passwordData.new !== passwordData.confirm) {
      alert('كلمات المرور غير متطابقة');
      return;
    }
    // API call would go here
    alert('تم تحديث كلمة المرور');
    setPasswordData({ current: '', new: '', confirm: '' });
  };

  return (
    <div className="space-y-4">
      {/* Change Password */}
      <SettingCard title="تغيير كلمة المرور">
        <div className="space-y-4">
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
            onChange={(newPwd) => setPasswordData({ ...passwordData, new: newPwd })}
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

        <button
          onClick={handleChangePassword}
          className="w-full mt-4 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          تحديث كلمة المرور
        </button>
      </SettingCard>

      {/* Session Management */}
      <SettingCard title="إدارة الجلسات">
        <p className="text-sm text-muted-foreground mb-4">
          تسجيل الخروج من جميع الأجهزة الأخرى
        </p>
        <button className="w-full py-3 bg-secondary text-foreground rounded-lg font-semibold hover:bg-secondary/80 transition-colors">
          تسجيل الخروج من الأجهزة الأخرى
        </button>
      </SettingCard>

      {/* Account Deletion */}
      <SettingCard title="حذف الحساب">
        <p className="text-sm text-muted-foreground mb-4">
          حذف حسابك وجميع بياناتك بشكل نهائي. هذا الإجراء لا يمكن التراجع عنه.
        </p>
        <button className="w-full py-3 bg-destructive/20 text-destructive rounded-lg font-semibold hover:opacity-90 transition-opacity">
          حذف الحساب
        </button>
      </SettingCard>

      {/* Logout Button */}
      <button className="w-full py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:opacity-90 transition-opacity">
        تسجيل الخروج
      </button>
    </div>
  );
}
