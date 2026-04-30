# سجل التعديلات المُنفَّذة على المشروع
## التعديلات التي تمت بعد وثيقة التصميم (comp4200.pdf)

> ملاحظة: وثيقة المشروع الأصلية تغطي مرحلة التحليل والتصميم فقط، وتنص صراحةً على أن "Implementation code is not included at this stage". هذا الملف يوثّق كل ما تم تنفيذه فعلياً حتى تاريخ 16 أبريل 2026.

---

## 1. التقنيات المستخدمة (أكملت ما في الوثيقة)

| التقنية | الوثيقة | المُنفَّذ |
|---------|---------|---------|
| Next.js | ذُكر كإطار عمل | Next.js 16 App Router + TypeScript |
| PostgreSQL | ذُكر كقاعدة بيانات | Prisma v7 على db.prisma.io |
| JWT | ذُكر للمصادقة | JWT في HTTP-only cookie |
| ORM | ذُكر Prisma كخيار | Prisma 7 مع prisma.config.ts |
| SMS | ذُكر كخدمة خارجية | smsOtpStore في الذاكرة (في الانتظار لربط Twilio/SMS provider) |
| Email | لم يُذكر تفصيلياً | **Resend SDK** مُضاف لإرسال رمز التحقق بالبريد |
| PWA | لم يُذكر | next-pwa مُضاف مع manifest.json و service worker |
| Tailwind CSS | لم يُذكر | Tailwind CSS v4 مع Custom Tokens |

---

## 2. قاعدة البيانات (Prisma Schema)

### النماذج المُنفَّذة (تتطابق مع ERD في الوثيقة):
- `User` — مع إضافة حقل `username String? @unique` (غير موجود في ERD الأصلي)
- `Patient` — يتضمن: dateOfBirth, gender, bloodType, nationalId
- `Doctor` — ربط بـ User عبر relation "DoctorProfile"
- `Clinic` — مع relation "ClinicOwner"
- `Branch` — مع latitude, longitude
- `Service`
- `Slot`
- `Appointment` — مع AppointmentStatus enum
- `Payment` — مع PaymentMethod, PaymentStatus enums
- `Rating`
- `SubscriptionPlan` + `Subscription` — مع SubscriptionTier, SubscriptionStatus enums
- `PatientGuardian` — مع GuardianRelationship enum

### إضافات على ERD الأصلي:
- حقل `username` في جدول User (أضيف في migration: `add_username_to_user`)
- حقل `nationalId` في جدول Patient (أضيف في migration: `add_patient_national_id`)
- حقل `emailVerified Boolean @default(false)` في User
- حقل `googleId String? @unique` في User

---

## 3. نظام المصادقة (Authentication)

### API Routes المُنفَّذة:

| المسار | الوظيفة |
|--------|---------|
| `POST /api/auth/signup` | إنشاء حساب جديد مع التحقق من SMS OTP |
| `POST /api/auth/login` | تسجيل الدخول، يُعيد JWT في cookie |
| `POST /api/auth/logout` | تسجيل الخروج، يحذف الـ cookie |
| `GET /api/auth/me` | جلب بيانات المستخدم الحالي |
| `POST /api/auth/forgot-password` | طلب إعادة تعيين كلمة المرور |
| `POST /api/auth/reset-password` | تعيين كلمة مرور جديدة |
| `GET /api/auth/verify-email` | التحقق من البريد عبر رابط |
| `POST /api/auth/send-sms-code` | إرسال رمز OTP عبر SMS |
| `POST /api/auth/send-email-code` | إرسال رمز OTP عبر البريد (Resend) |
| `POST /api/auth/verify-email-code` | التحقق من رمز OTP البريد |
| `POST /api/auth/google` | تسجيل دخول عبر Google |
| `POST /api/auth/send-verification` | إرسال رابط تأكيد البريد |

### AuthContext (`src/context/AuthContext.tsx`):
- State: `user`, `isLoading`, `isAuthenticated`, `error`
- Methods: `login`, `signup`, `logout`, `forgotPassword`, `resetPassword`, `verifyEmail`, `googleLogin`, `clearError`
- SignupData interface يشمل: firstName, fatherName, grandfatherName, familyName, username, email (optional), phoneNumber, dateOfBirth, nationalId, bloodType, gender, password, confirmPassword, smsOtp

---

## 4. نموذج التسجيل (Signup Form)

**الملف:** `src/app/auth/signup/page.tsx`

### التعديلات على ما هو موجود في الوثيقة (UR1.0):
الوثيقة تذكر التسجيل بشكل عام، أما المُنفَّذ فهو:

#### خطوات النموذج (3 خطوات):
1. **الخطوة الأولى** — المعلومات الشخصية:
   - الاسم الرباعي: firstName, fatherName, grandfatherName, familyName
   - تاريخ الميلاد (يقبل حتى اليوم الحالي)
   - رقم الهوية الوطنية
   - زمرة الدم (8 أزرار pill: A+/A-/B+/B-/AB+/AB-/O+/O-)
   - الجنس (ذكر/أنثى)
   - **البريد الإلكتروني (اختياري)** مع:
     - زر "إرسال رمز" ← يستدعي `/api/auth/send-email-code`
     - عداد تنازلي 60 ثانية بعد الإرسال
     - حقل إدخال رمز OTP + زر "تحقق"
     - شارة "✓ موثق" وقفل الحقل بعد التحقق

2. **الخطوة الثانية** — معلومات الحساب:
   - اسم المستخدم (username) — حروف إنجليزية وأرقام وشرطة سفلية
   - كلمة المرور (8+ أحرف)
   - تأكيد كلمة المرور
   - رقم الهاتف مع **150+ بادئة دولية** (فلسطين +970 تظهر أولاً بالعلم الفلسطيني)

3. **الخطوة الثالثة** — التحقق برسالة SMS:
   - إرسال OTP لرقم الهاتف
   - إدخال الرمز المكوّن من 6 أرقام

#### تفاصيل تقنية:
- Layout: `h-screen overflow-y-auto` للتعامل مع overflow على اللابتوب
- لا يوجد progress bar (تمت إزالته)
- زمرة الدم بـ pill buttons (لا dropdown) لتجنب خروج عن نطاق الشاشة
- التحقق بـ Zod schema في `src/lib/validators.ts`
- +972 تظهر كـ "فلسطين المحتلة" في قائمة بادئات الهاتف

---

## 5. واجهة المريض (Patient Interface)

### الصفحات المُنفَّذة:

| المسار | الوصف |
|--------|-------|
| `/patient` | الصفحة الرئيسية (خريطة، قائمة عيادات قريبة) |
| `/patient/booking` | تدفق الحجز (4 خطوات) |
| `/patient/bookings` | قائمة مواعيد المريض |
| `/patient/clinics/[clinicId]` | صفحة تفاصيل العيادة (خريطة، تقييمات، فروع) |
| `/patient/family` | إدارة أفراد الأسرة/التابعين |
| `/patient/profile` | الملف الشخصي |
| `/patient/records` | السجلات الطبية (قراءة فقط) |
| `/patient/settings` | الإعدادات |

### مكونات Patient:
- `PatientDashboard.tsx` — الداشبورد مع خريطة وعيادات قريبة
- `BottomNavigation.tsx` — شريط التنقل السفلي للموبايل
- `ClinicMapModule.tsx` — خريطة العيادات (dynamic import, SSR disabled)
- `MapModule.tsx` — وحدة الخريطة
- `NearbyClinicsList.tsx` — قائمة العيادات القريبة
- `SearchBar.tsx` — شريط البحث

### مكونات الحجز (`src/components/booking/`):
- `ServiceSelection.tsx` — اختيار الخدمة
- `DoctorSelection.tsx` — اختيار الطبيب
- `DateTimeSelection.tsx` — اختيار التاريخ والوقت
- `BookingConfirmation.tsx` — تأكيد الحجز

---

## 6. واجهة الطبيب (Doctor Interface)

### الصفحات المُنفَّذة:

| المسار | الوصف |
|--------|-------|
| `/doctor` | الداشبورد الرئيسي للطبيب |
| `/doctor/appointments` | جدول المواعيد |
| `/doctor/messages` | الرسائل |
| `/doctor/patients` | قائمة المرضى والسجلات |
| `/doctor/reports` | التقارير |
| `/doctor/schedule` | إدارة الجدول والتوافر |
| `/doctor/settings` | الإعدادات |

### مكونات Doctor:
- `DoctorDashboard.tsx`
- `AppointmentsSchedule.tsx`
- `DoctorBottomNavigation.tsx`
- `PatientRecordsView.tsx`
- `TimeSlotManager.tsx`
- `messages/` — مكونات الرسائل
- `reports/` — مكونات التقارير
- `settings/` — مكونات الإعدادات

---

## 7. واجهة المشرف/الداشبورد العام

**الملف:** `src/components/desktop/DesktopHome.tsx`

- إحصائيات سريعة: المواعيد اليوم، المرضى النشطين، الرسائل، الفواتير
- آخر المواعيد
- مهام اليوم
- يستخدم `DoctorLayout` مع سايدبار يسار

### مكونات Desktop:
- `Sidebar.tsx`, `SidebarHeader.tsx`, `SidebarFooter.tsx`
- `MenuItem.tsx`
- `PatientSidebar.tsx`
- `TopBar.tsx`

---

## 8. API Routes المُنفَّذة (غير Auth)

| المسار | الوظيفة |
|--------|---------|
| `GET /api/clinics` | قائمة العيادات |
| `GET /api/clinic/[clinicId]` | تفاصيل عيادة محددة |
| `GET /api/branch/[branchId]` | تفاصيل فرع |
| `GET /api/time-slots` | الأوقات المتاحة (برقم الطبيب، الفرع، التاريخ) |
| `GET/POST /api/bookings` | جلب/إنشاء الحجوزات |
| `GET /api/users/[userId]` | بيانات المستخدم |
| `GET /api/test` | اختبار الاتصال بالقاعدة |

---

## 9. خدمة البريد الإلكتروني (Email Service)

**الملف الجديد:** `src/lib/email.ts`

```typescript
// Resend SDK — مُنفَّذ
import { Resend } from 'resend';
export async function sendOtpEmail({ to, otp }: SendOtpEmailOptions): Promise<void>
```

- يستخدم **Resend** لإرسال بريد التحقق
- قالب HTML عربي RTL مع صندوق OTP مُصمَّم
- من: `EMAIL_FROM` env var (افتراضي: `DenClinic <onboarding@resend.dev>`)
- يرمي خطأ بالعربية عند فشل الإرسال: `'فشل إرسال البريد الإلكتروني'`

### متغيرات البيئة المضافة (`.env.local`):
```
RESEND_API_KEY=re_xxxx   ← يحتاج إضافة من المستخدم
EMAIL_FROM=DenClinic <onboarding@resend.dev>   ← اختياري
```

---

## 10. مخازن البيانات المؤقتة (`src/lib/tokenStorage.ts`)

```typescript
smsOtpStore     // رموز OTP للهاتف: { phone: { otp, expiresAt } }
emailOtpStore   // رموز OTP للبريد: { email: { otp, expiresAt } }
emailVerificationTokens // رموز تأكيد البريد عبر الرابط
```
> ملاحظة: هذه مخازن في الذاكرة (in-memory) وليست في قاعدة البيانات. في الإنتاج يجب نقلها إلى Redis أو قاعدة البيانات.

---

## 11. Zod Validation Schema (`src/lib/validators.ts`)

```typescript
signupSchema  // يتحقق من جميع حقول التسجيل
loginSchema   // يتحقق من بيانات الدخول
```

حقول signupSchema: firstName, fatherName, grandfatherName, familyName, username, email (optional), phoneNumber, dateOfBirth, nationalId, bloodType (enum), gender (enum), password, confirmPassword, smsOtp (6 digits), role (optional, default: PATIENT)

---

## 12. PWA (Progressive Web App)

**لم يُذكر في وثيقة المشروع**

- `public/manifest.json` — إعدادات PWA
- `public/sw.js` + `public/workbox-*.js` — Service Worker
- `next-pwa` package في `next.config.ts`
- إعدادات appleWebApp في `layout.tsx`

---

## 13. Themes & Styling

**لم يُذكر تفصيلياً في الوثيقة**

`src/app/globals.css` يعرّف:
- Light Theme + Dark Theme
- CSS Custom Properties (Tokens):
  - `--primary`, `--primary-light`, `--primary-dark`
  - `--secondary`, `--muted`, `--card`, `--border`
  - `--destructive`, `--alert-success/warning/error/info`
- Tailwind CSS v4 مع `@theme inline`

---

## 14. الصفحات الجزئية الأخرى

| المسار | الوصف |
|--------|-------|
| `/` | صفحة ترحيب تعيد التوجيه تلقائياً حسب حالة الدخول |
| `/auth/signin` | تسجيل الدخول |
| `/auth/signup` | إنشاء حساب (3 خطوات) |
| `/auth/forgot-password` | نسيت كلمة المرور |
| `/auth/reset-password` | إعادة تعيين كلمة المرور |
| `/auth/verify-email` | تأكيد البريد الإلكتروني |
| `/dashboard` | داشبورد عام (يستخدم DesktopHome) |
| `/appointments` | صفحة المواعيد |
| `/messages` | صفحة الرسائل |
| `/reports` | صفحة التقارير |
| `/settings` | صفحة الإعدادات |
| `/manage/patients` | إدارة المرضى |

---

## 15. Layouts المُنفَّذة

`src/components/layouts/`:
- `DoctorLayout` — سايدبار + topbar للواجهة المكتبية
- `PatientLayout` — layout للمريض على الموبايل والمكتب
- `MobileLayout` / `DesktopLayout` — layouts عامة

---

## 16. ما تبقى من الـ FR/NFR لم يُنفَّذ بعد

| الرقم | الوظيفة | الحالة |
|-------|---------|--------|
| UR3.0 | إدارة الاشتراك (Subscription) للمشرف | ⏳ لم يُنفَّذ |
| UR9.0 | الدفع الإلكتروني عبر Payment Gateway | ⏳ لم يُنفَّذ |
| SR17.1-17.2 | إرسال تذكير يومي عبر SMS | ⏳ لم يُنفَّذ |
| SR21.4 | إرفاق صور طبية وأشعة | ⏳ لم يُنفَّذ |
| SR16.4 | تصدير السجلات الطبية PDF | ⏳ لم يُنفَّذ |
| SR24.3 | تصدير التقارير PDF | ⏳ لم يُنفَّذ |
| NFR2.4 | تسجيل محاولات الدخول غير المصرح بها | ⏳ لم يُنفَّذ |
| NFR2.5 | تشفير البيانات الطبية في قاعدة البيانات (at rest) | ⏳ لم يُنفَّذ |
| NFR2.6 | إنهاء الجلسة بعد 30 دقيقة من الخمول | ⏳ لم يُنفَّذ |
| NFR3.3 | نسخ احتياطي تلقائي كل 24 ساعة | ⏳ يعتمد على db.prisma.io |

---

## ملخص للتحديث في وثيقة المشروع

عند تحديث وثيقة comp4200.pdf في الفصل القادم، يجب إضافة:

1. **قسم Implementation** — يوثق كل ما في هذا الملف
2. **تفصيل نموذج التسجيل** — 3 خطوات + SMS OTP + Email OTP
3. **Resend** كخدمة بريد إلكتروني خارجية (أضافتها للجدول A.1 - Software Tools)
4. **PWA** كميزة تقنية
5. **Zod** كمكتبة validation
6. **تحديث ERD** — لإضافة حقل `username` و `nationalId`
7. **تحديث جدول الأدوات** (Table A.15) — إضافة: Prisma 7, Resend, Zod, next-pwa, Tailwind CSS v4
8. **screenshots** فعلية من التطبيق لتحديث القسم 3.2 (Frontend Designs)
