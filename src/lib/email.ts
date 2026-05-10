import { Resend } from 'resend';
import puppeteer from 'puppeteer';

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

// ─── Invoice PDF + Email ──────────────────────────────────────────────────────

interface InvoiceData {
  branchName:    string;
  patientName:   string;
  patientEmail:  string;
  doctorName:    string;
  serviceName:   string;
  appointmentDate: string;
  appointmentTime: string;
  originalAmount: number;
  finalAmount:    number;
  currency:       string;
  discountType:   string | null;
  discountValue:  number | null;
  paidAmount:     number | null;
  paidCurrency:   string | null;
  exchangeRate:   number | null;
  surplus:        number | null;
  method:         string;
  status:         string;
  transactionTime: string;
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'نقدي', CARD: 'بطاقة', BANK_TRANSFER: 'تحويل بنكي',
  ONLINE_PAYMENT: 'إلكتروني', INSURANCE: 'تأمين',
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'مدفوع', PENDING: 'معلّق', REFUNDED: 'مسترد',
  CANCELLED: 'ملغي', FAILED: 'فاشل',
};

function generateInvoiceHtml(data: InvoiceData): string {
  const dateStr = new Date(data.transactionTime).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

  const discountRow = data.discountType && data.discountType !== 'NONE' && (data.discountValue ?? 0) > 0
    ? (() => {
        const disc = data.discountType === 'PERCENTAGE'
          ? data.originalAmount * (data.discountValue ?? 0) / 100
          : (data.discountValue ?? 0);
        const label = data.discountType === 'PERCENTAGE' ? `خصم ${data.discountValue}%` : 'خصم ثابت';
        return `<tr><td style="color:#16a34a">${label}</td><td style="color:#16a34a;text-align:left">-${disc.toFixed(2)} ${data.currency}</td></tr>`;
      })()
    : '';

  const paidRow = data.paidAmount && data.paidCurrency && data.paidCurrency !== data.currency
    ? `<tr style="border-top:1px dashed #e5e7eb">
        <td style="color:#6b7280">المدفوع</td>
        <td style="text-align:left">${data.paidAmount.toFixed(2)} ${data.paidCurrency}</td>
       </tr>
       <tr>
        <td style="color:#6b7280">سعر الصرف</td>
        <td style="text-align:left">1 ${data.paidCurrency} = ${(data.exchangeRate ?? 1).toFixed(4)} ${data.currency}</td>
       </tr>
       ${data.surplus !== null && data.surplus !== 0 ? `<tr>
        <td style="color:${(data.surplus ?? 0) >= 0 ? '#16a34a' : '#dc2626'}">${(data.surplus ?? 0) >= 0 ? 'فائض' : 'عجز'}</td>
        <td style="text-align:left;color:${(data.surplus ?? 0) >= 0 ? '#16a34a' : '#dc2626'}">${(data.surplus ?? 0) >= 0 ? '+' : ''}${(data.surplus ?? 0).toFixed(2)} ${data.currency}</td>
       </tr>` : ''}`
    : '';

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>فاتورة — ${data.patientName}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 32px; max-width: 560px; margin: auto; }
    .header { background: #2563eb; color: #fff; padding: 20px 24px; border-radius: 8px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
    .header h1 { font-size: 20px; margin-bottom: 2px; }
    .header p  { font-size: 12px; opacity: .85; }
    .section-title { font-size: 14px; font-weight: 700; margin-bottom: 8px; color: #1e3a5f; border-bottom: 2px solid #2563eb; padding-bottom: 4px; }
    .info-grid { display: grid; grid-template-columns: 110px 1fr; gap: 5px 10px; margin-bottom: 20px; font-size: 13px; }
    .info-grid .lbl { color: #6b7280; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    td { padding: 7px 0; vertical-align: top; }
    td:last-child { text-align: left; font-weight: 500; }
    .total-row td { font-size: 17px; font-weight: 700; padding-top: 10px; border-top: 2px solid #111; }
    .footer { margin-top: 24px; text-align: center; color: #9ca3af; font-size: 11px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 12px; font-weight: 600; }
    .no-print { margin-bottom: 16px; display: flex; gap: 10px; justify-content: flex-end; }
    @media print {
      .no-print { display: none !important; }
      body { padding: 16px; }
      .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()" style="padding:8px 18px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">🖨️ طباعة / حفظ كـ PDF</button>
  </div>

  <div class="header">
    <div>
      <p style="font-size:12px;opacity:.75">${dateStr}</p>
      <p style="font-size:13px;opacity:.9">${data.branchName}</p>
    </div>
    <div style="text-align:right">
      <h1>🦷 DenClinic</h1>
      <p>فاتورة</p>
    </div>
  </div>

  <div class="section-title">معلومات المريض</div>
  <div class="info-grid">
    <span class="lbl">الاسم</span>     <span>${data.patientName}</span>
    <span class="lbl">الطبيب</span>    <span>${data.doctorName}</span>
    <span class="lbl">الخدمة</span>    <span>${data.serviceName}</span>
    <span class="lbl">الموعد</span>    <span dir="ltr">${data.appointmentDate} — ${data.appointmentTime}</span>
  </div>

  <div class="section-title">تفاصيل الفاتورة</div>
  <table style="margin-bottom:20px">
    <tr><td style="color:#6b7280">المبلغ الأصلي</td><td>${data.originalAmount.toFixed(2)} ${data.currency}</td></tr>
    ${discountRow}
    <tr class="total-row"><td>الإجمالي</td><td style="color:#2563eb">${data.finalAmount.toFixed(2)} ${data.currency}</td></tr>
    ${paidRow}
    <tr style="padding-top:8px"><td style="color:#6b7280;padding-top:10px">طريقة الدفع</td><td style="padding-top:10px">${METHOD_LABELS[data.method] ?? data.method}</td></tr>
    <tr><td style="color:#6b7280">الحالة</td><td>
      <span class="badge" style="background:${data.status === 'COMPLETED' ? '#dcfce7' : '#fef3c7'};color:${data.status === 'COMPLETED' ? '#15803d' : '#b45309'}">
        ${STATUS_LABELS[data.status] ?? data.status}
      </span>
    </td></tr>
  </table>

  <div class="footer">شكراً لثقتكم بنا — DenClinic</div>
</body>
</html>`;
}

async function generatePdfFromHtml(html: string): Promise<Buffer> {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    const pdf = await page.pdf({ format: 'A5', printBackground: true, margin: { top: '1cm', right: '1cm', bottom: '1cm', left: '1cm' } });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export async function sendInvoiceEmail(data: InvoiceData): Promise<void> {
  const invoiceHtml = generateInvoiceHtml(data);
  const pdf = await generatePdfFromHtml(invoiceHtml);

  const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#2563eb;padding:24px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:22px;">🦷 DenClinic</h1>
          <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">${data.branchName}</p>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 16px;color:#374151;">مرحباً <strong>${data.patientName}</strong>،</p>
          <p style="margin:0 0 24px;color:#374151;line-height:1.6;">
            يُرفق بهذا الإيميل فاتورة موعدك في عيادتنا. يمكنك فتحها أو حفظها من المرفقات.
          </p>
          <table width="100%" style="background:#f9fafb;border-radius:8px;padding:16px;border:1px solid #e5e7eb;" cellpadding="6">
            <tr><td style="color:#6b7280;font-size:13px;">الخدمة</td><td style="font-size:13px;font-weight:bold;text-align:left;">${data.serviceName}</td></tr>
            <tr><td style="color:#6b7280;font-size:13px;">الطبيب</td><td style="font-size:13px;text-align:left;">${data.doctorName}</td></tr>
            <tr><td style="color:#6b7280;font-size:13px;">الموعد</td><td style="font-size:13px;text-align:left;" dir="ltr">${data.appointmentDate} — ${data.appointmentTime}</td></tr>
            <tr><td colspan="2"><hr style="border:none;border-top:1px solid #e5e7eb;margin:8px 0"></td></tr>
            <tr><td style="color:#6b7280;font-size:13px;">الإجمالي</td><td style="font-size:16px;font-weight:bold;color:#2563eb;text-align:left;">${data.finalAmount.toFixed(2)} ${data.currency}</td></tr>
          </table>
        </td></tr>
        <tr><td style="background:#f9fafb;padding:14px;text-align:center;color:#9ca3af;font-size:11px;">
          © ${new Date().getFullYear()} DenClinic — جميع الحقوق محفوظة
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  if (!resend) {
    console.log(`[EMAIL] فاتورة → ${data.patientEmail}`);
    return;
  }

  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await resend.emails.send({
    from: FROM,
    to:   data.patientEmail,
    subject: `فاتورتك من DenClinic — ${data.serviceName} — ${new Date().toLocaleDateString('ar-EG')}`,
    html,
    attachments: [{ filename: 'invoice.pdf', content: pdf }],
    headers: { 'Message-ID': `<invoice-${uniqueId}@denclinic>` },
  });
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
