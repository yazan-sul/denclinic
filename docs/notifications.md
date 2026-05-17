# نظام الإشعارات — DenClinic

## لماذا Web Push API وليس Firebase؟

### المقارنة

| المعيار | Firebase FCM | Web Push API |
|---|---|---|
| السعر | مجاني بحدود | مجاني بلا حدود |
| Vendor Lock-in | Google | لا يوجد — معيار W3C مفتوح |
| حجم الـ bundle | كبير (Firebase SDK) | صفر — built-in في المتصفح |
| Android PWA | ✅ | ✅ |
| iOS 16.4+ PWA | ✅ (يحتاج APNs setup) | ✅ (VAPID keys فقط) |
| Setup | Firebase Console + APNs + Service Account | مفتاحي VAPID فقط |
| بيانات المستخدم | تمر عبر سيرفرات Google | مباشرة بين سيرفرك والمتصفح |
| Offline support | ✅ | ✅ |

### الميزة الرئيسية

Web Push API معيار مفتوح (W3C) — المتصفحات تدعمه natively بدون مكتبات خارجية.
على iOS 16.4+، يستخدم نفس البروتوكول مما يعني **لا حاجة لـ Apple Developer Account** للـ PWA.

---

## Architecture

```
المستخدم يفتح التطبيق
        ↓
usePushNotification hook
        ↓
يطلب إذن الإشعارات
        ↓
يولّد PushSubscription (endpoint + keys)
        ↓
POST /api/push/subscribe → يُحفظ في DeviceToken
        ↓
عند حدث (حجز / إلغاء / دفعة ...)
        ↓
createNotification() → DB + sendPushToUser()
        ↓
web-push library → Push Service (Chrome/Safari/Firefox)
        ↓
Service Worker يستيقظ → يعرض الإشعار
```

---

## الملفات الرئيسية

| الملف | الدور |
|---|---|
| `prisma/schema.prisma` | `DeviceToken` model + `onBehalfOfName` + `reminderSentAt` |
| `src/lib/web-push.ts` | إرسال Push من السيرفر — lazy VAPID init + cleanup للـ tokens المنتهية |
| `src/lib/notifications.ts` | `createNotification` + `createPatientNotification` (يشعر أولياء الأمور تلقائياً) |
| `src/hooks/usePushNotification.ts` | طلب الإذن + تسجيل الجهاز + listener بدون تكرار |
| `src/app/api/push/subscribe/route.ts` | upsert/delete لـ DeviceToken مع Zod validation |
| `worker/index.ts` | Service Worker — push events + notificationclick + postMessage للـ foreground |
| `src/app/api/cron/reminders/route.ts` | تذكير يومي 8:00 ص بيوم الموعد |
| `vercel.json` | Cron schedule: `0 5 * * *` (UTC = 8:00 ص أردن/سعودية) |
| `src/components/ios/IOSInstallPrompt.tsx` | Banner لمستخدمي iPhone لتثبيت التطبيق |
| `src/components/desktop/NotificationBell.tsx` | UI — قسمين: إشعاراتي / العائلة |

---

## ميزات النظام

### 1. إشعارات أولياء الأمور
```typescript
createPatientNotification(patientUserId, { title, message })
// يُنشئ إشعار للمريض + لكل أولياء أموره المعتمدين
// مع onBehalfOfName لتمييز "بخصوص: أحمد"
```

### 2. فلترة حسب الدور
كل إشعار له `targetRole` — المريض يرى PATIENT فقط، الطبيب DOCTOR فقط.
حتى لو نفس الشخص لديه أدوار متعددة.

### 3. Foreground vs Background
- **التطبيق مفتوح**: Service Worker يرسل `postMessage` → React يعرض toast داخلي + refresh الإشعارات
- **التطبيق مغلق**: Service Worker يعرض إشعار النظام (زي WhatsApp)

### 4. Polling ذكي
- Fallback polling كل **5 دقائق** (بدل 30 ثانية السابقة)
- Refresh فوري عند وصول push
- Refresh عند العودة للتبويب (`visibilitychange`)

### 5. تنظيف تلقائي
عند فشل إرسال Push برمز `410/404` → يُحذف الـ token من DB تلقائياً.

---

## تغطية الإشعارات

| الحدث | من يُشعَر |
|---|---|
| حجز موعد | المريض + الطبيب + أولياء الأمور |
| إلغاء موعد | المريض + الطبيب + الستاف + أولياء الأمور |
| إعادة جدولة | المريض + الطبيب + الستاف + أولياء الأمور |
| غياب (NO_SHOW) | المريض + الطبيب + أولياء الأمور |
| إنهاء الزيارة | المريض + أولياء الأمور |
| تذكير يوم الموعد | المريض + أولياء الأمور |
| تغيير حالة المختبر | المريض + الطبيب + أولياء الأمور |
| دفعات (تسجيل/تأكيد/استرداد) | المريض + أولياء الأمور |
| إضافة/حذف ولي أمر | الطرفان |

---

## بنية الـ Push Subscription

عند تسجيل الجهاز يعطي المتصفح هذا الكائن:

```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "keys": {
    "p256dh": "BK71ER1...",
    "auth":   "abc123..."
  }
}
```

| الحقل | الاسم الكامل | الدور |
|---|---|---|
| `endpoint` | Push Service URL | العنوان الذي يُرسَل إليه الـ push |
| `p256dh` | P-256 Diffie-Hellman public key | مفتاح عام للتشفير — يضمن وصول الرسالة مشفّرة |
| `auth` | Authentication Secret | سر للتحقق — يضمن أن المرسل هو سيرفرك فقط |

الثلاثة معاً يضمنان:
1. **التشفير** — لا أحد يقرأ الإشعار في الطريق
2. **التوثيق** — الإشعار صادر من سيرفرك أنت فقط

تُحفظ هذه القيم في جدول `DeviceToken` ويستخدمها `web-push` عند الإرسال.

---

## متطلبات الـ Deploy

```env
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...          # سري — لا يُنشر أبداً
VAPID_SUBJECT=mailto:...
NEXT_PUBLIC_VAPID_PUBLIC_KEY=... # نفس العام — آمن للـ frontend
CRON_SECRET=...                 # يحمي endpoint الـ cron
```

---

## ملاحظات iOS

- يعمل فقط على **iOS 16.4+**
- يتطلب تثبيت التطبيق على **الشاشة الرئيسية** (Add to Home Screen)
- `IOSInstallPrompt` يظهر تلقائياً لمستخدمي iPhone الذين لم يثبّتوا التطبيق بعد
