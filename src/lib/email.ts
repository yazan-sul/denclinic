import { Resend } from 'resend';
import PDFDocument from 'pdfkit';

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

function generateInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A5', margin: 40, info: { Title: 'فاتورة' } });
    const chunks: Buffer[] = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end',  () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const W = doc.page.width - 80;

    // Header
    doc.fontSize(18).font('Helvetica-Bold').text('DenClinic', 40, 40, { width: W, align: 'center' });
    doc.fontSize(10).font('Helvetica').text(data.branchName, 40, 62, { width: W, align: 'center' });
    doc.fontSize(9).text(data.transactionTime, 40, 76, { width: W, align: 'center' });

    doc.moveTo(40, 95).lineTo(40 + W, 95).stroke('#e5e7eb');

    // Patient / appointment info
    let y = 105;
    const row = (label: string, value: string) => {
      doc.fontSize(9).font('Helvetica-Bold').text(label + ':', 40, y, { width: 100, align: 'left' });
      doc.fontSize(9).font('Helvetica').text(value, 145, y, { width: W - 105, align: 'left' });
      y += 16;
    };

    row('Patient',  data.patientName);
    row('Doctor',   data.doctorName);
    row('Service',  data.serviceName);
    row('Date',     `${data.appointmentDate}  ${data.appointmentTime}`);

    doc.moveTo(40, y + 4).lineTo(40 + W, y + 4).stroke('#e5e7eb');
    y += 14;

    // Amounts
    row('Original Amount', `${data.originalAmount.toFixed(2)} ${data.currency}`);

    if (data.discountType && data.discountType !== 'NONE' && (data.discountValue ?? 0) > 0) {
      const label = data.discountType === 'PERCENTAGE'
        ? `Discount ${data.discountValue}%`
        : `Discount`;
      const disc = data.discountType === 'PERCENTAGE'
        ? data.originalAmount * (data.discountValue ?? 0) / 100
        : (data.discountValue ?? 0);
      row(label, `-${disc.toFixed(2)} ${data.currency}`);
    }

    // Total line
    doc.moveTo(40, y + 2).lineTo(40 + W, y + 2).stroke('#111827');
    y += 10;
    doc.fontSize(12).font('Helvetica-Bold');
    doc.text('Total:', 40, y, { width: 100, align: 'left' });
    doc.text(`${data.finalAmount.toFixed(2)} ${data.currency}`, 145, y, { width: W - 105, align: 'left' });
    y += 20;

    // Multi-currency paid info
    if (data.paidAmount && data.paidCurrency && data.paidCurrency !== data.currency) {
      doc.fontSize(9).font('Helvetica');
      const converted = (data.paidAmount * (data.exchangeRate ?? 1)).toFixed(2);
      row('Paid', `${data.paidAmount.toFixed(2)} ${data.paidCurrency} = ${converted} ${data.currency}`);
      row('Rate', `1 ${data.paidCurrency} = ${(data.exchangeRate ?? 1).toFixed(4)} ${data.currency}`);
      if (data.surplus !== null && data.surplus !== 0) {
        row(data.surplus > 0 ? 'Surplus' : 'Deficit', `${Math.abs(data.surplus).toFixed(2)} ${data.currency}`);
      }
    }

    doc.moveTo(40, y + 4).lineTo(40 + W, y + 4).stroke('#e5e7eb');
    y += 14;

    row('Payment Method', METHOD_LABELS[data.method] ?? data.method);
    row('Status', STATUS_LABELS[data.status] ?? data.status);

    // Footer
    doc.fontSize(8).font('Helvetica').fillColor('#9ca3af')
      .text('Thank you for your trust', 40, doc.page.height - 50, { width: W, align: 'center' });

    doc.end();
  });
}

export async function sendInvoiceEmail(data: InvoiceData): Promise<void> {
  const pdf = await generateInvoicePdf(data);

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

  await resend.emails.send({
    from: FROM,
    to:   data.patientEmail,
    subject: `فاتورتك من DenClinic — ${data.serviceName}`,
    html,
    attachments: [{ filename: 'invoice.pdf', content: pdf }],
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
