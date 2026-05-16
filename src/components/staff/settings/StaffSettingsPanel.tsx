'use client';

import { useEffect, useState } from 'react';
import { CheckCircleIcon } from '@/components/Icons';

/* ─── Types ────────────────────────────────────────────── */
type SettingsTab = 'profile' | 'security' | 'notifications' | 'display';

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  position: string;
  branchName: string;
  clinicName: string;
}

interface SecurityForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationSettings {
  newAppointment: boolean;
  cancelledAppointment: boolean;
  labResult: boolean;
  paymentReceived: boolean;
}

interface DisplaySettings {
  theme: 'light' | 'dark' | 'system';
}

/* ─── Config ───────────────────────────────────────────── */
const tabs: { id: SettingsTab; label: string }[] = [
  { id: 'profile',       label: 'الملف الشخصي' },
  { id: 'security',      label: 'الأمان' },
  { id: 'notifications', label: 'الإشعارات' },
  { id: 'display',       label: 'العرض' },
];

/* ─── Component ────────────────────────────────────────── */
export default function StaffSettingsPanel() {
  const [activeTab,  setActiveTab]  = useState<SettingsTab>('profile');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading,    setLoading]    = useState(true);

  // Profile
  const [profile,       setProfile]       = useState<ProfileForm>({ name: '', email: '', phone: '', position: '', branchName: '', clinicName: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileError,  setProfileError]  = useState('');

  // Security
  const [security,      setSecurity]      = useState<SecurityForm>({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [securityError, setSecurityError] = useState('');
  const [secSaving,     setSecSaving]     = useState(false);

  // Notifications (local only)
  const [notifications, setNotifications] = useState<NotificationSettings>({
    newAppointment: true, cancelledAppointment: true, labResult: false, paymentReceived: true,
  });

  // Display (local only)
  const [display, setDisplay] = useState<DisplaySettings>({ theme: 'system' });

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // ── Load profile on mount
  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(r => r.json())
      .then(json => {
        if (!json.success) return;
        const d = json.data;
        const sp = d.staffProfile;
        setProfile({
          name:       d.name        ?? '',
          email:      d.email       ?? '',
          phone:      d.phoneNumber ?? '',
          position:   sp?.position  ?? '',
          branchName: sp?.branch?.name ?? '',
          clinicName: sp?.clinic?.name ?? '',
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // ── Save profile
  const handleSaveProfile = async () => {
    setProfileError('');
    if (!profile.name.trim()) { setProfileError('الاسم مطلوب'); return; }
    setProfileSaving(true);
    try {
      const res  = await fetch('/api/auth/me', {
        method: 'PATCH', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: profile.name, email: profile.email, phoneNumber: profile.phone }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'فشل الحفظ');
      showSuccess('تم حفظ الملف الشخصي');
    } catch (e: any) {
      setProfileError(e.message);
    } finally {
      setProfileSaving(false);
    }
  };

  // ── Change password
  const handleChangePassword = async () => {
    setSecurityError('');
    if (!security.currentPassword || !security.newPassword || !security.confirmPassword) {
      setSecurityError('جميع الحقول مطلوبة'); return;
    }
    if (security.newPassword.length < 8) {
      setSecurityError('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل'); return;
    }
    if (security.newPassword !== security.confirmPassword) {
      setSecurityError('كلمة المرور الجديدة غير متطابقة'); return;
    }
    setSecSaving(true);
    try {
      const res  = await fetch('/api/auth/change-password', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: security.currentPassword, newPassword: security.newPassword }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error?.message || 'فشل تغيير كلمة المرور');
      setSecurity({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showSuccess('تم تغيير كلمة المرور بنجاح');
    } catch (e: any) {
      setSecurityError(e.message);
    } finally {
      setSecSaving(false);
    }
  };

  const toggleNotif = (key: keyof NotificationSettings) =>
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));

  const initials = profile.name ? profile.name.trim()[0] : '?';

  if (loading) return (
    <div className="space-y-4">
      {[1,2,3].map(i => <div key={i} className="h-24 bg-card border border-border rounded-xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="space-y-6" dir="rtl">

      {/* Success toast */}
      {successMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-medium flex items-center gap-2">
          <CheckCircleIcon className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-secondary/50 p-1 rounded-xl overflow-x-auto">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-3 md:px-4 py-2 md:py-2.5 text-xs md:text-sm font-medium rounded-lg transition-colors whitespace-nowrap flex-1 md:flex-none ${
              activeTab === tab.id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Profile Tab ── */}
      {activeTab === 'profile' && (
        <div className="bg-card border border-border rounded-xl">
          <div className="px-4 md:px-5 py-4 border-b border-border">
            <h3 className="font-bold">الملف الشخصي</h3>
            <p className="text-xs text-muted-foreground mt-1">تعديل بياناتك الشخصية</p>
          </div>
          <div className="p-4 md:p-5 space-y-5">

            {/* Avatar + info */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 md:w-16 md:h-16 bg-primary/10 rounded-full flex items-center justify-center text-xl md:text-2xl font-bold text-primary flex-shrink-0">
                {initials}
              </div>
              <div>
                <p className="font-semibold text-sm md:text-base">{profile.name || '—'}</p>
                <p className="text-xs text-muted-foreground">
                  {profile.position || 'موظف'}{profile.branchName ? ` — ${profile.branchName}` : ''}{profile.clinicName ? ` · ${profile.clinicName}` : ''}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs md:text-sm font-medium mb-1">الاسم الكامل <span className="text-red-500">*</span></label>
                <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium mb-1">البريد الإلكتروني</label>
                <input type="email" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  dir="ltr" />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium mb-1">رقم الهاتف</label>
                <input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  dir="ltr" />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium mb-1">الفرع</label>
                <input value={profile.branchName || '—'} readOnly
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-secondary/40 text-muted-foreground cursor-not-allowed" />
              </div>
            </div>

            {profileError && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{profileError}</p>
            )}

            <div className="flex justify-end pt-1">
              <button onClick={handleSaveProfile} disabled={profileSaving || !profile.name.trim()}
                className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50">
                {profileSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Security Tab ── */}
      {activeTab === 'security' && (
        <div className="bg-card border border-border rounded-xl">
          <div className="px-4 md:px-5 py-4 border-b border-border">
            <h3 className="font-bold">تغيير كلمة المرور</h3>
            <p className="text-xs text-muted-foreground mt-1">تأكد من استخدام كلمة مرور قوية</p>
          </div>
          <div className="p-4 md:p-5 space-y-4 max-w-md">
            {[
              { label: 'كلمة المرور الحالية',          key: 'currentPassword' as const },
              { label: 'كلمة المرور الجديدة',          key: 'newPassword'     as const, hint: '8 أحرف على الأقل' },
              { label: 'تأكيد كلمة المرور الجديدة',   key: 'confirmPassword' as const },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs md:text-sm font-medium mb-1">{f.label}</label>
                <input type="password" value={security[f.key]}
                  onChange={e => setSecurity(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                  dir="ltr" />
                {f.hint && <p className="text-xs text-muted-foreground mt-1">{f.hint}</p>}
              </div>
            ))}

            {securityError && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{securityError}</p>
            )}

            <div className="flex justify-end pt-1">
              <button onClick={handleChangePassword} disabled={secSaving}
                className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50">
                {secSaving ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Notifications Tab ── */}
      {activeTab === 'notifications' && (
        <div className="bg-card border border-border rounded-xl">
          <div className="px-4 md:px-5 py-4 border-b border-border">
            <h3 className="font-bold">إعدادات الإشعارات</h3>
            <p className="text-xs text-muted-foreground mt-1">تحكم في الإشعارات التي تصلك</p>
          </div>
          <div className="p-4 md:p-5 space-y-3">
            {([
              { key: 'newAppointment'       as const, label: 'موعد جديد',    desc: 'عند حجز موعد جديد' },
              { key: 'cancelledAppointment' as const, label: 'إلغاء موعد',   desc: 'عند إلغاء موعد مجدول' },
              { key: 'labResult'            as const, label: 'تحديث مختبر',  desc: 'عند تغيير حالة طلب المختبر' },
              { key: 'paymentReceived'      as const, label: 'دفعة جديدة',   desc: 'عند تسجيل دفعة مالية' },
            ]).map(item => (
              <div key={item.key} className="flex items-center justify-between bg-secondary/30 rounded-xl p-3">
                <div>
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <button onClick={() => toggleNotif(item.key)}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${notifications[item.key] ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${notifications[item.key] ? 'right-0.5' : 'right-[22px]'}`} />
                </button>
              </div>
            ))}
            <div className="flex justify-end pt-2">
              <button onClick={() => showSuccess('تم حفظ إعدادات الإشعارات')}
                className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors">
                حفظ الإعدادات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Display Tab ── */}
      {activeTab === 'display' && (
        <div className="bg-card border border-border rounded-xl">
          <div className="px-4 md:px-5 py-4 border-b border-border">
            <h3 className="font-bold">إعدادات العرض</h3>
            <p className="text-xs text-muted-foreground mt-1">تخصيص مظهر الواجهة</p>
          </div>
          <div className="p-4 md:p-5 space-y-4 max-w-md">
            <div>
              <label className="block text-xs md:text-sm font-medium mb-2">المظهر</label>
              <div className="grid grid-cols-3 gap-2 md:gap-3">
                {([
                  { id: 'light'  as const, label: 'فاتح' },
                  { id: 'dark'   as const, label: 'داكن' },
                  { id: 'system' as const, label: 'تلقائي' },
                ]).map(t => (
                  <button key={t.id} onClick={() => setDisplay({ theme: t.id })}
                    className={`py-2.5 text-sm font-medium rounded-xl border transition-colors ${
                      display.theme === t.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-secondary/50'
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button onClick={() => showSuccess('تم حفظ إعدادات العرض')}
                className="px-5 py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors">
                حفظ الإعدادات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
