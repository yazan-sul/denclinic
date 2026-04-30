'use client';

import { useState } from 'react';
import { CheckCircleIcon, XIcon } from '@/components/Icons';

/* ─── Types ────────────────────────────────────────────── */
type SettingsTab = 'profile' | 'security' | 'notifications' | 'display';

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
  role: string;
  branch: string;
  avatar: string;
}

interface SecurityForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationSettings {
  newAppointment: boolean;
  cancelledAppointment: boolean;
  patientMessage: boolean;
  labResult: boolean;
  paymentReceived: boolean;
  emailNotifications: boolean;
  smsNotifications: boolean;
}

interface DisplaySettings {
  language: 'ar' | 'en';
  theme: 'light' | 'dark' | 'system';
  tableRows: number;
  compactMode: boolean;
}

/* ─── Mock Data ────────────────────────────────────────── */
const mockProfile: ProfileForm = {
  name: 'مريم حسن',
  email: 'mariam@denclinic.ps',
  phone: '0599111222',
  role: 'سكرتيرة',
  branch: 'الفرع الرئيسي - رام الله',
  avatar: 'م',
};

const defaultNotifications: NotificationSettings = {
  newAppointment: true,
  cancelledAppointment: true,
  patientMessage: true,
  labResult: false,
  paymentReceived: true,
  emailNotifications: true,
  smsNotifications: false,
};

const defaultDisplay: DisplaySettings = {
  language: 'ar',
  theme: 'system',
  tableRows: 10,
  compactMode: false,
};

/* ─── Config ───────────────────────────────────────────── */
const tabs: { id: SettingsTab; label: string }[] = [
  { id: 'profile', label: 'الملف الشخصي' },
  { id: 'security', label: 'الأمان' },
  { id: 'notifications', label: 'الإشعارات' },
  { id: 'display', label: 'العرض' },
];

/* ─── Component ────────────────────────────────────────── */
export default function StaffSettingsPanel() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
  const [successMsg, setSuccessMsg] = useState('');

  // Profile
  const [profile, setProfile] = useState<ProfileForm>(mockProfile);

  // Security
  const [security, setSecurity] = useState<SecurityForm>({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [securityError, setSecurityError] = useState('');

  // Notifications
  const [notifications, setNotifications] = useState<NotificationSettings>(defaultNotifications);

  // Display
  const [display, setDisplay] = useState<DisplaySettings>(defaultDisplay);

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSaveProfile = () => {
    if (!profile.name.trim() || !profile.email.trim()) return;
    showSuccess('تم حفظ الملف الشخصي');
  };

  const handleChangePassword = () => {
    setSecurityError('');
    if (!security.currentPassword || !security.newPassword || !security.confirmPassword) {
      setSecurityError('جميع الحقول مطلوبة');
      return;
    }
    if (security.newPassword.length < 8) {
      setSecurityError('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (security.newPassword !== security.confirmPassword) {
      setSecurityError('كلمة المرور الجديدة غير متطابقة');
      return;
    }
    setSecurity({ currentPassword: '', newPassword: '', confirmPassword: '' });
    showSuccess('تم تغيير كلمة المرور');
  };

  const handleSaveNotifications = () => {
    showSuccess('تم حفظ إعدادات الإشعارات');
  };

  const handleSaveDisplay = () => {
    showSuccess('تم حفظ إعدادات العرض');
  };

  const toggleNotif = (key: keyof NotificationSettings) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Profile Tab ── */}
      {activeTab === 'profile' && (
        <div className="bg-card border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-bold text-foreground">الملف الشخصي</h3>
            <p className="text-xs text-muted-foreground mt-1">تعديل بياناتك الشخصية</p>
          </div>
          <div className="p-5 space-y-5">
            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-2xl font-bold text-primary">
                {profile.avatar}
              </div>
              <div>
                <p className="font-medium text-foreground">{profile.name}</p>
                <p className="text-xs text-muted-foreground">{profile.role} — {profile.branch}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">الاسم الكامل *</label>
                <input
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">البريد الإلكتروني *</label>
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">رقم الهاتف</label>
                <input
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">الفرع</label>
                <input
                  value={profile.branch}
                  readOnly
                  className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-secondary/50 text-muted-foreground cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveProfile}
                disabled={!profile.name.trim() || !profile.email.trim()}
                className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                حفظ التعديلات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Security Tab ── */}
      {activeTab === 'security' && (
        <div className="bg-card border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-bold text-foreground">تغيير كلمة المرور</h3>
            <p className="text-xs text-muted-foreground mt-1">تأكد من استخدام كلمة مرور قوية</p>
          </div>
          <div className="p-5 space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">كلمة المرور الحالية</label>
              <input
                type="password"
                value={security.currentPassword}
                onChange={(e) => setSecurity({ ...security, currentPassword: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                dir="ltr"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">كلمة المرور الجديدة</label>
              <input
                type="password"
                value={security.newPassword}
                onChange={(e) => setSecurity({ ...security, newPassword: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                dir="ltr"
              />
              <p className="text-xs text-muted-foreground mt-1">8 أحرف على الأقل</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">تأكيد كلمة المرور الجديدة</label>
              <input
                type="password"
                value={security.confirmPassword}
                onChange={(e) => setSecurity({ ...security, confirmPassword: e.target.value })}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                dir="ltr"
              />
            </div>

            {securityError && (
              <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{securityError}</p>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={handleChangePassword}
                className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
              >
                تغيير كلمة المرور
              </button>
            </div>
          </div>

          {/* Active sessions info */}
          <div className="px-5 py-4 border-t border-border">
            <h4 className="font-bold text-foreground mb-3">الجلسات النشطة</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-secondary/30 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-green-600 text-xs">🖥️</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">هذا الجهاز</p>
                    <p className="text-xs text-muted-foreground">Windows — Chrome — رام الله</p>
                  </div>
                </div>
                <span className="text-xs text-green-600 font-medium">نشطة الآن</span>
              </div>
              <div className="flex items-center justify-between bg-secondary/30 rounded-xl p-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center text-gray-500 text-xs">📱</div>
                  <div>
                    <p className="text-sm font-medium text-foreground">هاتف محمول</p>
                    <p className="text-xs text-muted-foreground">Android — Chrome — آخر نشاط: اليوم 08:30</p>
                  </div>
                </div>
                <button className="text-xs text-red-500 hover:underline">إنهاء</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Notifications Tab ── */}
      {activeTab === 'notifications' && (
        <div className="bg-card border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-bold text-foreground">إعدادات الإشعارات</h3>
            <p className="text-xs text-muted-foreground mt-1">تحكم في الإشعارات التي تصلك</p>
          </div>
          <div className="p-5 space-y-6">

            {/* Notification types */}
            <div>
              <h4 className="text-sm font-bold text-foreground mb-3">إشعارات العمل</h4>
              <div className="space-y-3">
                {([
                  { key: 'newAppointment' as const, label: 'موعد جديد', desc: 'عند حجز موعد جديد' },
                  { key: 'cancelledAppointment' as const, label: 'إلغاء موعد', desc: 'عند إلغاء موعد مجدول' },
                  { key: 'patientMessage' as const, label: 'رسالة مريض', desc: 'عند استلام رسالة من مريض' },
                  { key: 'labResult' as const, label: 'نتيجة مختبر', desc: 'عند وصول نتيجة من المختبر' },
                  { key: 'paymentReceived' as const, label: 'دفعة جديدة', desc: 'عند تسجيل دفعة مالية' },
                ]).map((item) => (
                  <div key={item.key} className="flex items-center justify-between bg-secondary/30 rounded-xl p-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <button
                      onClick={() => toggleNotif(item.key)}
                      className={`relative w-11 h-6 rounded-full transition-colors ${notifications[item.key] ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifications[item.key] ? 'right-0.5' : 'right-[22px]'}`} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Channels */}
            <div>
              <h4 className="text-sm font-bold text-foreground mb-3">قنوات الإشعار</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-secondary/30 rounded-xl p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">البريد الإلكتروني</p>
                    <p className="text-xs text-muted-foreground">{profile.email}</p>
                  </div>
                  <button
                    onClick={() => toggleNotif('emailNotifications')}
                    className={`relative w-11 h-6 rounded-full transition-colors ${notifications.emailNotifications ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifications.emailNotifications ? 'right-0.5' : 'right-[22px]'}`} />
                  </button>
                </div>
                <div className="flex items-center justify-between bg-secondary/30 rounded-xl p-3">
                  <div>
                    <p className="text-sm font-medium text-foreground">رسائل SMS</p>
                    <p className="text-xs text-muted-foreground" dir="ltr">{profile.phone}</p>
                  </div>
                  <button
                    onClick={() => toggleNotif('smsNotifications')}
                    className={`relative w-11 h-6 rounded-full transition-colors ${notifications.smsNotifications ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${notifications.smsNotifications ? 'right-0.5' : 'right-[22px]'}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveNotifications}
                className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
              >
                حفظ الإعدادات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Display Tab ── */}
      {activeTab === 'display' && (
        <div className="bg-card border border-border rounded-xl">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-bold text-foreground">إعدادات العرض</h3>
            <p className="text-xs text-muted-foreground mt-1">تخصيص مظهر الواجهة</p>
          </div>
          <div className="p-5 space-y-5 max-w-lg">

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">اللغة</label>
              <select
                value={display.language}
                onChange={(e) => setDisplay({ ...display, language: e.target.value as 'ar' | 'en' })}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="ar">العربية</option>
                <option value="en">English</option>
              </select>
            </div>

            {/* Theme */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">المظهر</label>
              <div className="flex gap-3">
                {([
                  { id: 'light' as const, label: '☀️ فاتح' },
                  { id: 'dark' as const, label: '🌙 داكن' },
                  { id: 'system' as const, label: '💻 تلقائي' },
                ]).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setDisplay({ ...display, theme: t.id })}
                    className={`flex-1 px-4 py-3 text-sm font-medium rounded-xl border transition-colors ${
                      display.theme === t.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-secondary/50'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Table rows */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">عدد الصفوف في الجداول</label>
              <select
                value={display.tableRows}
                onChange={(e) => setDisplay({ ...display, tableRows: Number(e.target.value) })}
                className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value={5}>5 صفوف</option>
                <option value={10}>10 صفوف</option>
                <option value={20}>20 صف</option>
                <option value={50}>50 صف</option>
              </select>
            </div>

            {/* Compact mode */}
            <div className="flex items-center justify-between bg-secondary/30 rounded-xl p-3">
              <div>
                <p className="text-sm font-medium text-foreground">الوضع المضغوط</p>
                <p className="text-xs text-muted-foreground">تقليل المسافات بين العناصر</p>
              </div>
              <button
                onClick={() => setDisplay({ ...display, compactMode: !display.compactMode })}
                className={`relative w-11 h-6 rounded-full transition-colors ${display.compactMode ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${display.compactMode ? 'right-0.5' : 'right-[22px]'}`} />
              </button>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={handleSaveDisplay}
                className="px-5 py-2.5 bg-primary text-white text-sm font-semibold rounded-xl hover:bg-primary/90 transition-colors"
              >
                حفظ الإعدادات
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
