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
  const sym = (c: string) => ({ ILS: '₪', USD: '$', JOD: 'د.أ', EUR: '€' }[c] ?? c);
  const curr = data.currency;

  const discountRow = data.discountType && data.discountType !== 'NONE' && (data.discountValue ?? 0) > 0
    ? (() => {
        const disc = data.discountType === 'PERCENTAGE'
          ? data.originalAmount * (data.discountValue ?? 0) / 100
          : (data.discountValue ?? 0);
        const label = data.discountType === 'PERCENTAGE' ? `خصم ${data.discountValue}%` : 'خصم ثابت';
        return `<tr><td style="color:#16a34a">${label}</td><td style="color:#16a34a;text-align:left">-${disc.toFixed(2)} ${sym(curr)}</td></tr>`;
      })()
    : '';

  const isDiffCurr = data.paidAmount && data.paidCurrency && data.paidCurrency !== curr;
  const paidRows = isDiffCurr
    ? `<tr style="border-top:1px dashed #e5e7eb">
        <td style="color:#6b7280">المدفوع</td>
        <td style="text-align:left;font-weight:600">${data.paidAmount!.toFixed(2)} ${sym(data.paidCurrency!)}</td>
       </tr>
       <tr>
        <td style="color:#6b7280">سعر الصرف</td>
        <td style="text-align:left">1 ${sym(data.paidCurrency!)} = ${(data.exchangeRate ?? 1).toFixed(4)} ${sym(curr)}</td>
       </tr>
       <tr>
        <td style="color:#6b7280">المعادل</td>
        <td style="text-align:left">${(data.paidAmount! * (data.exchangeRate ?? 1)).toFixed(2)} ${sym(curr)}</td>
       </tr>`
    : '';

  const surplusRow = data.surplus !== null && data.surplus !== undefined && data.surplus !== 0
    ? data.surplus > 0
      ? `<tr><td style="color:#7c3aed">رصيد في العيادة</td><td style="text-align:left;color:#7c3aed;font-weight:600">+${data.surplus.toFixed(2)} ${sym(curr)}</td></tr>`
      : `<tr><td style="color:#dc2626">عجز</td><td style="text-align:left;color:#dc2626;font-weight:600">${data.surplus.toFixed(2)} ${sym(curr)}</td></tr>`
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
    <tr><td style="color:#6b7280">المبلغ الأصلي</td><td dir="ltr">${data.originalAmount.toFixed(2)} ${sym(curr)}</td></tr>
    ${discountRow}
    <tr class="total-row"><td>الإجمالي المستحق</td><td style="color:#2563eb" dir="ltr">${data.finalAmount.toFixed(2)} ${sym(curr)}</td></tr>
    ${paidRows}
    ${surplusRow}
    <tr style="border-top:1px solid #e5e7eb"><td style="color:#6b7280;padding-top:10px">طريقة الدفع</td><td style="padding-top:10px">${METHOD_LABELS[data.method] ?? data.method}</td></tr>
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

// ─── Transactions Report PDF + Email ─────────────────────────────────────────

interface TransactionReportItem {
  paidAt:      string;
  paidAmount:  number;
  paidCurrency: string;
  exchangeRate: number;
  amountInCost: number;
  method:      string;
  notes:       string | null;
  serviceName: string;
}

interface InvoiceReportItem {
  serviceName:    string;
  appointmentDate: string;
  amount:         number;
  currency:       string;
  status:         string;
  surplus:        number | null;
  discountType:   string | null;
  discountValue:  number | null;
  originalAmount: number | null;
}

interface TransactionsReportData {
  clinicName:   string;
  branchName:   string;
  patientName:  string;
  patientEmail: string;
  generatedAt:  string;
  invoices:     InvoiceReportItem[];
  transactions: TransactionReportItem[];
  totalByCurrency: { currency: string; total: number }[];
  remainingDebt:   number;
  invoiceCurrency: string;
}

const INVOICE_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  COMPLETED: { label: 'مدفوع',   color: '#15803d', bg: '#dcfce7' },
  PENDING:   { label: 'معلّق',   color: '#b45309', bg: '#fef3c7' },
  REFUNDED:  { label: 'مسترد',   color: '#7c3aed', bg: '#ede9fe' },
  CANCELLED: { label: 'ملغي',    color: '#6b7280', bg: '#f3f4f6' },
  FAILED:    { label: 'فاشل',    color: '#dc2626', bg: '#fee2e2' },
};

function generateTransactionsReportHtml(data: TransactionsReportData): string {
  const sym = (c: string) => ({ ILS: '₪', USD: '$', JOD: 'د.أ', EUR: '€' }[c] ?? c);

  const invoiceRows = data.invoices.map(inv => {
    const st      = INVOICE_STATUS_LABELS[inv.status] ?? { label: inv.status, color: '#111', bg: '#f3f4f6' };
    const orig    = inv.originalAmount ?? inv.amount;
    const hasDisc = inv.discountType && inv.discountType !== 'NONE' && (inv.discountValue ?? 0) > 0;
    const disc    = hasDisc
      ? (inv.discountType === 'PERCENTAGE'
          ? `${inv.discountValue}% (${(orig * (inv.discountValue ?? 0) / 100).toFixed(2)} ${sym(inv.currency)})`
          : `${inv.discountValue?.toFixed(2)} ${sym(inv.currency)}`)
      : '—';
    const remaining = inv.status === 'PENDING' && (inv.surplus ?? 0) < -0.005
      ? Math.max(0, -(inv.surplus ?? 0)) : null;
    const surplus   = inv.status === 'COMPLETED' && (inv.surplus ?? 0) > 0.005 ? inv.surplus : null;
    const apptDate  = inv.appointmentDate
      ? new Date(inv.appointmentDate).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
    const surpStr = remaining !== null
      ? `<br><span style="color:#dc2626;font-size:11px">متبقي: ${remaining.toFixed(2)}</span>`
      : surplus !== null
        ? `<br><span style="color:#7c3aed;font-size:11px">فائض: +${(surplus ?? 0).toFixed(2)}</span>`
        : '';
    return `<tr>
      <td dir="ltr">${apptDate}</td>
      <td>${inv.serviceName}</td>
      <td dir="ltr">${orig.toFixed(2)} ${sym(inv.currency)}</td>
      <td>${disc}</td>
      <td dir="ltr">${inv.amount.toFixed(2)} ${sym(inv.currency)}${surpStr}</td>
      <td><span style="background:${st.bg};color:${st.color};padding:2px 8px;border-radius:99px;font-size:11px;font-weight:600">${st.label}</span></td>
    </tr>`;
  }).join('');

  const txnRows = data.transactions.map((t, i) => {
    const d    = new Date(t.paidAt);
    const date = d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' });
    const time = d.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
    const isDiff = t.paidCurrency !== data.invoiceCurrency;
    const amtCell = isDiff
      ? `${t.paidAmount.toFixed(2)} ${sym(t.paidCurrency)}<br><small style="color:#6b7280">= ${t.amountInCost.toFixed(2)} ${sym(data.invoiceCurrency)} × ${t.exchangeRate.toFixed(4)}</small>`
      : `${t.paidAmount.toFixed(2)} ${sym(t.paidCurrency)}`;
    return `<tr>
      <td style="color:#9ca3af;text-align:center;font-size:11px">${data.transactions.length - i}</td>
      <td dir="ltr">${date}<br><span style="color:#9ca3af;font-size:11px">${time}</span></td>
      <td>${t.serviceName}</td>
      <td dir="ltr">${amtCell}</td>
      <td>${METHOD_LABELS[t.method] ?? t.method}</td>
      <td style="color:#6b7280">${t.notes ?? '—'}</td>
    </tr>`;
  }).join('');

  const totalPaid  = data.totalByCurrency.map(tc =>
    `<span style="font-size:18px;font-weight:700;color:#16a34a">${tc.total.toFixed(2)} ${sym(tc.currency)}</span>`
  ).join(' + ') || `<span style="font-size:18px;font-weight:700;color:#16a34a">0.00</span>`;

  const CSS = `
    * { box-sizing:border-box; margin:0; padding:0; }
    body { font-family:'Segoe UI',Tahoma,Arial,sans-serif; font-size:13px; color:#111; background:#fff; padding:32px; }
    .header { background:#2563eb; color:#fff; padding:20px 24px; border-radius:8px; margin-bottom:24px; display:flex; justify-content:space-between; align-items:flex-start; }
    .header h1 { font-size:22px; margin-bottom:4px; }
    .section-title { font-size:15px; font-weight:700; margin:24px 0 10px; color:#1e3a5f; border-bottom:2px solid #2563eb; padding-bottom:4px; }
    .info-grid { display:grid; grid-template-columns:120px 1fr; gap:6px 12px; margin-bottom:8px; font-size:13px; }
    .info-grid .lbl { color:#6b7280; font-weight:600; }
    .summary { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:4px; }
    .summary-card { border:1px solid #e5e7eb; border-radius:8px; padding:14px 12px; }
    .summary-card .s-label { font-size:11px; color:#6b7280; margin-bottom:4px; }
    table { width:100%; border-collapse:collapse; font-size:12px; }
    thead tr { background:#2563eb; color:#fff; }
    thead th { padding:9px 8px; text-align:right; font-weight:600; white-space:nowrap; }
    tbody tr:nth-child(even) { background:#f9fafb; }
    tbody td { padding:8px; border-bottom:1px solid #e5e7eb; vertical-align:top; }
    [dir="ltr"] { direction:ltr; unicode-bidi:embed; white-space:nowrap; }
    .footer { margin-top:24px; text-align:center; color:#9ca3af; font-size:11px; border-top:1px solid #e5e7eb; padding-top:12px; }
    @media print {
      body { padding:16px; }
      .header { -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      @page { margin:1cm; }
    }`;

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <title>تقرير مالي — ${data.patientName}</title>
  <style>${CSS}</style>
</head>
<body>
  <div class="header">
    <div>
      <div style="font-size:12px;opacity:.75;margin-bottom:2px">${data.generatedAt}</div>
      <div style="font-size:13px;opacity:.85">${data.clinicName}${data.branchName ? ' — ' + data.branchName : ''}</div>
    </div>
    <div style="text-align:right">
      <h1>🦷 DenClinic</h1>
      <div style="font-size:14px;opacity:.9;margin-top:2px">تقرير مالي</div>
    </div>
  </div>

  <div class="section-title">معلومات المريض</div>
  <div class="info-grid" style="margin-bottom:24px">
    <span class="lbl">الاسم</span>         <span>${data.patientName}</span>
    <span class="lbl">العيادة</span>        <span>${data.clinicName}</span>
    <span class="lbl">تاريخ التقرير</span>  <span>${data.generatedAt}</span>
  </div>

  <div class="section-title">الملخص المالي</div>
  <div class="summary" style="margin-bottom:28px">
    <div class="summary-card">
      <div class="s-label">إجمالي المدفوع</div>
      <div class="s-value">${totalPaid}</div>
    </div>
    <div class="summary-card">
      <div class="s-label">مستحق الدفع</div>
      <div class="s-value" style="font-size:18px;font-weight:700;color:#dc2626">${data.remainingDebt.toFixed(2)} ${sym(data.invoiceCurrency)}</div>
    </div>
    <div class="summary-card">
      <div class="s-label">عدد الدفعات</div>
      <div class="s-value" style="font-size:18px;font-weight:700">${data.transactions.length}</div>
    </div>
    <div class="summary-card">
      <div class="s-label">حالة الحساب</div>
      <div class="s-value" style="font-size:14px;font-weight:700;color:${data.remainingDebt > 0 ? '#dc2626' : '#16a34a'}">${data.remainingDebt > 0 ? 'يوجد دين' : 'مسوّى ✓'}</div>
    </div>
  </div>

  <div class="section-title">الفواتير</div>
  ${data.invoices.length === 0
    ? '<p style="color:#6b7280;text-align:center;padding:20px">لا توجد فواتير</p>'
    : `<table style="margin-bottom:28px">
        <thead><tr>
          <th>التاريخ</th><th>الخدمة</th><th>المبلغ الأصلي</th>
          <th>الخصم</th><th>المبلغ النهائي</th><th>الحالة</th>
        </tr></thead>
        <tbody>${invoiceRows}</tbody>
      </table>`}

  <div class="section-title">الدفعات التفصيلية (${data.transactions.length})</div>
  ${data.transactions.length === 0
    ? '<p style="color:#6b7280;text-align:center;padding:20px">لا توجد دفعات مسجّلة</p>'
    : `<table>
        <thead><tr>
          <th style="width:28px">#</th><th>التاريخ والوقت</th><th>الخدمة</th>
          <th>المبلغ المدفوع</th><th>طريقة الدفع</th><th>ملاحظات</th>
        </tr></thead>
        <tbody>${txnRows}</tbody>
      </table>`}

  <div class="footer">تم إنشاء هذا التقرير بواسطة DenClinic — سري وخاص بالمريض</div>
</body>
</html>`;
}

export async function sendTransactionsReportEmail(data: TransactionsReportData): Promise<void> {
  const reportHtml = generateTransactionsReportHtml(data);
  const pdf = await generatePdfFromHtml(reportHtml);
  const sym = (c: string) => ({ ILS: '₪', USD: '$', JOD: 'د.أ', EUR: '€' }[c] ?? c);

  const totalsText = data.totalByCurrency
    .map(tc => `${tc.total.toFixed(2)} ${sym(tc.currency)}`)
    .join(' + ') || '—';

  const bodyHtml = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#2563eb;padding:24px;text-align:center;">
          <h1 style="margin:0;color:#fff;font-size:22px;">🦷 DenClinic</h1>
          <p style="margin:4px 0 0;color:#bfdbfe;font-size:13px;">${data.clinicName}</p>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 16px;color:#374151;">مرحباً <strong>${data.patientName}</strong>،</p>
          <p style="margin:0 0 24px;color:#374151;line-height:1.6;">
            يُرفق بهذا البريد سجل الحركات المالية الخاص بك في عيادتنا (${data.transactions.length} حركة).
          </p>
          <table width="100%" style="background:#f9fafb;border-radius:8px;padding:16px;border:1px solid #e5e7eb;" cellpadding="6">
            <tr>
              <td style="color:#6b7280;font-size:13px;">إجمالي المدفوع</td>
              <td style="font-size:15px;font-weight:bold;color:#2563eb;text-align:left;">${totalsText}</td>
            </tr>
            ${data.remainingDebt > 0 ? `<tr>
              <td style="color:#6b7280;font-size:13px;">الدين المتبقي</td>
              <td style="font-size:15px;font-weight:bold;color:#dc2626;text-align:left;">${data.remainingDebt.toFixed(2)} ${sym(data.invoiceCurrency)}</td>
            </tr>` : `<tr>
              <td colspan="2" style="color:#15803d;font-size:13px;font-weight:600;">الحساب مسوّى بالكامل ✓</td>
            </tr>`}
            <tr>
              <td style="color:#6b7280;font-size:13px;">تاريخ التقرير</td>
              <td style="font-size:13px;text-align:left;">${data.generatedAt}</td>
            </tr>
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
    console.log(`[EMAIL] تقرير حركات → ${data.patientEmail}`);
    return;
  }

  const uniqueId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await resend.emails.send({
    from: FROM,
    to:   data.patientEmail,
    subject: `سجل حركاتك المالية — DenClinic — ${data.generatedAt}`,
    html:    bodyHtml,
    attachments: [{ filename: 'transactions-report.pdf', content: pdf }],
    headers: { 'Message-ID': `<txn-report-${uniqueId}@denclinic>` },
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
