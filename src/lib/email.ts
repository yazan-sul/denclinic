import { Resend } from 'resend';

let resend: Resend | null = null;

function getResendClient() {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }

  resend ??= new Resend(process.env.RESEND_API_KEY);
  return resend;
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SendOtpEmailOptions {
  to: string;
  otp: string;
}

// ─── Templates ─────────────────────────────────────────────────────────────────

function otpEmailHtml(otp: string): string {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head><meta charset="UTF-8" /></head>
      <body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
          <tr>
            <td align="center">
              <table width="480" cellpadding="0" cellspacing="0"
                style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#0066cc,#004499);padding:28px;text-align:center;">
                    <span style="font-size:32px;">🦷</span>
                    <h1 style="color:#ffffff;margin:8px 0 0;font-size:22px;font-weight:700;">DenClinic</h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:32px 36px;text-align:right;">
                    <h2 style="color:#1a1a1a;font-size:18px;margin:0 0 12px;">رمز التحقق من بريدك الإلكتروني</h2>
                    <p style="color:#555;font-size:14px;line-height:1.7;margin:0 0 24px;">
                      استخدم الرمز التالي لإتمام عملية التسجيل. الرمز صالح لمدة <strong>10 دقائق</strong> فقط.
                    </p>
                    <!-- OTP Box -->
                    <div style="background:#f0f7ff;border:2px solid #0066cc;border-radius:10px;
                                padding:20px;text-align:center;margin-bottom:24px;">
                      <span style="font-size:38px;font-weight:800;letter-spacing:12px;color:#0066cc;
                                   font-family:monospace;">
                        ${otp}
                      </span>
                    </div>
                    <p style="color:#888;font-size:12px;margin:0;">
                      إذا لم تطلب هذا الرمز، يمكنك تجاهل هذا البريد بأمان.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background:#f9f9f9;padding:16px 36px;text-align:center;
                              border-top:1px solid #eee;">
                    <p style="color:#aaa;font-size:11px;margin:0;">
                      © ${new Date().getFullYear()} DenClinic — جميع الحقوق محفوظة
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

// ─── Functions ──────────────────────────────────────────────────────────────────

/**
 * Send an OTP verification email using Resend.
 * Requires RESEND_API_KEY in environment variables.
 */
export async function sendOtpEmail({ to, otp }: SendOtpEmailOptions): Promise<void> {
  const resendClient = getResendClient();

  if (!resendClient) {
    console.log(`[Email] RESEND_API_KEY is not configured. OTP for ${to}: ${otp}`);
    return;
  }

  const from = process.env.EMAIL_FROM ?? 'DenClinic <noreply@denclinic.me>';

  const { error } = await resendClient.emails.send({
    from,
    to,
    subject: `${otp} — رمز التحقق من DenClinic`,
    html: otpEmailHtml(otp),
  });

  if (error) {
    console.error('[Email] Failed to send OTP email:', error);
    throw new Error('فشل إرسال البريد الإلكتروني');
  }
}

// ─── Welcome Email ──────────────────────────────────────────────────────────────

function welcomeEmailHtml(name: string): string {
  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
      <head><meta charset="UTF-8" /></head>
      <body style="margin:0;padding:0;background:#f5f5f5;font-family:sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 0;">
          <tr>
            <td align="center">
              <table width="480" cellpadding="0" cellspacing="0"
                style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#0066cc,#004499);padding:32px;text-align:center;">
                    <span style="font-size:40px;">🦷</span>
                    <h1 style="color:#ffffff;margin:10px 0 0;font-size:24px;font-weight:700;">DenClinic</h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:36px 36px 28px;text-align:right;">
                    <h2 style="color:#1a1a1a;font-size:20px;margin:0 0 16px;">
                      مرحباً بك في DenClinic 🎉
                    </h2>
                    <p style="color:#444;font-size:15px;line-height:1.8;margin:0 0 16px;">
                      عزيزي <strong>${name}</strong>،
                    </p>
                    <p style="color:#555;font-size:14px;line-height:1.8;margin:0 0 24px;">
                      يسعدنا انضمامك إلى منصة <strong>DenClinic</strong>! تم إنشاء حسابك بنجاح.
                      يمكنك الآن حجز مواعيد العيادات، ومتابعة سجلاتك الطبية بكل سهولة.
                    </p>
                    <div style="background:#f0f7ff;border-right:4px solid #0066cc;border-radius:8px;
                                padding:16px 20px;margin-bottom:24px;">
                      <p style="color:#0066cc;font-size:14px;font-weight:600;margin:0;">
                        ✅ تم إنشاء حسابك بنجاح
                      </p>
                    </div>
                    <p style="color:#888;font-size:12px;margin:0;">
                      إذا لم تقم بإنشاء هذا الحساب، يرجى التواصل معنا فوراً.
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="background:#f9f9f9;padding:16px 36px;text-align:center;
                              border-top:1px solid #eee;">
                    <p style="color:#aaa;font-size:11px;margin:0;">
                      © ${new Date().getFullYear()} DenClinic — جميع الحقوق محفوظة
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

/**
 * Send a welcome email after successful account creation.
 */
export async function sendWelcomeEmail({ to, name }: { to: string; name: string }): Promise<void> {
  const resendClient = getResendClient();

  if (!resendClient) {
    console.log(`[Email] RESEND_API_KEY is not configured. Welcome email skipped for ${to}.`);
    return;
  }

  const from = process.env.EMAIL_FROM ?? 'DenClinic <noreply@denclinic.me>';

  const { error } = await resendClient.emails.send({
    from,
    to,
    subject: 'مرحباً بك في DenClinic 🎉',
    html: welcomeEmailHtml(name),
  });

  if (error) {
    console.error('[Email] Failed to send welcome email:', error);
    // Don't throw — welcome email failure shouldn't block signup
  }
}
