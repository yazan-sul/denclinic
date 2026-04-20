import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM || 'DenClinic <onboarding@resend.dev>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

function verificationHtml(name: string, verifyUrl: string) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#2563eb;padding:28px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;">🦷 DenClinic</h1>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <h2 style="margin:0 0 12px;color:#111827;font-size:20px;">مرحباً بك يا ${name}!</h2>
          <p style="margin:0 0 10px;color:#374151;line-height:1.6;">
            تم إنشاء حسابك في <strong>DenClinic</strong> بنجاح 🎉
          </p>
          <p style="margin:0 0 28px;color:#374151;line-height:1.6;">
            يرجى تفعيل بريدك الإلكتروني بالضغط على الزر أدناه:
          </p>
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr><td align="center">
              <a href="${verifyUrl}"
                style="display:inline-block;background:#2563eb;color:#fff;padding:14px 36px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:bold;">
                تفعيل الحساب
              </a>
            </td></tr>
          </table>
          <p style="margin:28px 0 0;color:#6b7280;font-size:13px;line-height:1.6;">
            الرابط صالح لمدة 24 ساعة.<br>
            إذا لم تنشئ هذا الحساب، يمكنك تجاهل هذه الرسالة بأمان.
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px;text-align:center;color:#9ca3af;font-size:12px;">
          © ${new Date().getFullYear()} DenClinic — جميع الحقوق محفوظة
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function welcomeHtml(name: string) {
  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#2563eb;padding:28px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;">🦷 DenClinic</h1>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <h2 style="margin:0 0 12px;color:#111827;font-size:20px;">مرحباً بك يا ${name}!</h2>
          <p style="margin:0 0 10px;color:#374151;line-height:1.6;">
            تم إنشاء حسابك في <strong>DenClinic</strong> بنجاح 🎉
          </p>
          <p style="margin:0;color:#374151;line-height:1.6;">
            يمكنك الآن حجز مواعيدك والاستفادة من جميع خدماتنا.
          </p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px;text-align:center;color:#9ca3af;font-size:12px;">
          © ${new Date().getFullYear()} DenClinic — جميع الحقوق محفوظة
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function sendWelcomeEmail({
  to,
  name,
  verificationToken,
}: {
  to: string;
  name: string;
  verificationToken?: string;
}) {
  const verifyUrl = verificationToken
    ? `${APP_URL}/auth/verify-email?token=${verificationToken}`
    : null;

  if (!resend) {
    console.log(`[EMAIL] ترحيب → ${to}`);
    if (verifyUrl) console.log(`[EMAIL] رابط التفعيل: ${verifyUrl}`);
    return;
  }

  const html = verifyUrl ? verificationHtml(name, verifyUrl) : welcomeHtml(name);
  const subject = verifyUrl
    ? 'مرحباً بك في DenClinic — فعّل حسابك'
    : 'مرحباً بك في DenClinic';

  await resend.emails.send({ from: FROM, to, subject, html });
}

export async function sendOtpEmail({ to, otp }: { to: string; otp: string }) {
  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#2563eb;padding:28px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:24px;">🦷 DenClinic</h1>
        </td></tr>
        <tr><td style="padding:36px 40px;text-align:center;">
          <h2 style="margin:0 0 12px;color:#111827;font-size:20px;">رمز التحقق من البريد الإلكتروني</h2>
          <p style="margin:0 0 28px;color:#374151;line-height:1.6;">استخدم الرمز أدناه لتأكيد بريدك الإلكتروني:</p>
          <div style="display:inline-block;background:#f3f4f6;border-radius:12px;padding:20px 40px;margin-bottom:24px;">
            <span style="font-size:36px;font-weight:bold;letter-spacing:12px;color:#2563eb;">${otp}</span>
          </div>
          <p style="margin:0;color:#6b7280;font-size:13px;">الرمز صالح لمدة 10 دقائق.</p>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px;text-align:center;color:#9ca3af;font-size:12px;">
          إذا لم تطلب هذا الرمز، تجاهل هذه الرسالة.<br>
          © ${new Date().getFullYear()} DenClinic
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  if (!resend) {
    console.log(`[EMAIL] OTP لـ ${to}: ${otp}`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: `${otp} — رمز التحقق من DenClinic`,
    html,
  });
}

export async function sendVerificationEmail({
  to,
  name,
  verificationToken,
}: {
  to: string;
  name: string;
  verificationToken: string;
}) {
  const verifyUrl = `${APP_URL}/auth/verify-email?token=${verificationToken}`;

  if (!resend) {
    console.log(`[EMAIL] تفعيل → ${to} : ${verifyUrl}`);
    return;
  }

  await resend.emails.send({
    from: FROM,
    to,
    subject: 'تحقق من بريدك الإلكتروني — DenClinic',
    html: verificationHtml(name, verifyUrl),
  });
}
