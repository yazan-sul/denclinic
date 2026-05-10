import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';
import { UserRole } from '@prisma/client';

const METHOD_LABELS: Record<string, string> = {
  CASH: 'نقدي', CARD: 'بطاقة', BANK_TRANSFER: 'تحويل بنكي',
  ONLINE_PAYMENT: 'إلكتروني', INSURANCE: 'تأمين',
};
const STATUS_LABELS: Record<string, string> = {
  COMPLETED: 'مدفوع', PENDING: 'معلّق', REFUNDED: 'مسترد',
  CANCELLED: 'ملغي', FAILED: 'فاشل',
};
const STATUS_COLORS: Record<string, string> = {
  COMPLETED: '#16a34a', PENDING: '#d97706', REFUNDED: '#7c3aed',
  CANCELLED: '#dc2626', FAILED: '#dc2626',
};

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { roles: true, staffProfiles: { select: { clinicId: true } } },
    });
    if (!user) throw new UnauthorizedError('غير مصرح');

    const roles = user.roles as UserRole[];
    if (!roles.some(r => ['STAFF', 'ADMIN', 'CLINIC_OWNER'].includes(r))) {
      throw new ForbiddenError('يجب أن تكون من طاقم العمل');
    }

    const { searchParams } = new URL(request.url);
    const patientId = Number(searchParams.get('patientId'));
    const clinicId  = Number(searchParams.get('clinicId'));
    if (!patientId || !clinicId) throw new ValidationError('patientId و clinicId مطلوبان');

    const staffClinicIds = user.staffProfiles.map(p => p.clinicId);
    if (staffClinicIds.length > 0 && !staffClinicIds.includes(clinicId)) {
      throw new ForbiddenError('لا صلاحية على هذه العيادة');
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: { user: { select: { name: true, phoneNumber: true, email: true } } },
    });
    if (!patient) throw new ValidationError('المريض غير موجود');

    const payments = await prisma.payment.findMany({
      where: { appointment: { clinicId, patientId } },
      orderBy: { transactionTime: 'desc' },
      select: {
        amount: true, originalAmount: true, currency: true,
        paidAmount: true, paidCurrency: true, exchangeRate: true, surplus: true,
        discountType: true, discountValue: true, method: true, status: true,
        transactionTime: true, description: true,
        appointment: {
          select: {
            appointmentDate: true, appointmentTime: true,
            service: { select: { name: true } },
            branch:  { select: { name: true } },
          },
        },
      },
    });

    // Also fetch appointments with NO payment to count as unpaid debt
    const unpaidAppointments = await prisma.appointment.findMany({
      where: {
        clinicId,
        patientId,
        status: { in: ['CONFIRMED', 'COMPLETED', 'RESCHEDULED'] },
        payment: null,
      },
      select: {
        service: { select: { name: true, basePrice: true } },
        appointmentDate: true,
        appointmentTime: true,
        branch: { select: { name: true } },
      },
    });

    // Summary
    const totalPaid      = payments.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + p.amount, 0);
    const totalPending   = payments.filter(p => p.status === 'PENDING').reduce((s, p) => s + p.amount, 0);
    const unpaidCost     = unpaidAppointments.reduce((s, a) => s + (a.service.basePrice ?? 0), 0);
    const totalDebt      = totalPending + unpaidCost;
    const totalSurplus   = payments.filter(p => p.status === 'COMPLETED').reduce((s, p) => s + Math.max(0, p.surplus ?? 0), 0);
    const totalRefunded  = payments.filter(p => p.status === 'REFUNDED').reduce((s, p) => s + p.amount, 0);

    const dateStr = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

    // Rows for payments with CANCELLED/REFUNDED/FAILED excluded from debt but still shown
    const unpaidRows = unpaidAppointments.map(a => {
      const cost = (a.service.basePrice ?? 0).toFixed(2);
      return `<tr style="background:#fff7ed">
        <td dir="ltr">${a.appointmentDate.toISOString().split('T')[0]}</td>
        <td>${a.service.name}</td>
        <td dir="ltr">${cost} ILS</td>
        <td>—</td>
        <td dir="ltr">${cost} ILS</td>
        <td>—</td>
        <td>—</td>
        <td><span style="color:#dc2626;font-weight:600">غير مدفوع</span></td>
      </tr>`;
    }).join('');

    const rows = payments.map(p => {
      const orig     = (p.originalAmount ?? p.amount).toFixed(2);
      const final    = p.amount.toFixed(2);
      const curr     = String(p.currency);
      const disc     = (!p.discountType || p.discountType === 'NONE') ? '—'
        : p.discountType === 'PERCENTAGE'
          ? `${p.discountValue}% (${((p.originalAmount ?? p.amount) * (p.discountValue ?? 0) / 100).toFixed(2)} ${curr})`
          : `${p.discountValue?.toFixed(2)} ${curr}`;
      const paid     = p.paidAmount && p.paidCurrency && String(p.paidCurrency) !== curr
        ? `${p.paidAmount.toFixed(2)} ${p.paidCurrency}<br><small style="color:#6b7280">سعر: ${(p.exchangeRate ?? 1).toFixed(4)}</small>`
        : '—';
      const surpStr  = p.surplus && p.surplus !== 0
        ? `<br><span style="color:${p.surplus > 0 ? '#16a34a' : '#dc2626'};font-size:11px">${p.surplus > 0 ? 'فائض' : 'عجز'}: ${Math.abs(p.surplus).toFixed(2)}</span>`
        : '';
      const service  = p.appointment?.service.name ?? p.description ?? '—';
      const date     = p.appointment?.appointmentDate.toISOString().split('T')[0] ?? '—';
      const statusColor = STATUS_COLORS[p.status] ?? '#6b7280';

      return `<tr>
        <td dir="ltr">${date}</td>
        <td>${service}</td>
        <td dir="ltr">${orig} ${curr}</td>
        <td>${disc}</td>
        <td dir="ltr">${final} ${curr}${surpStr}</td>
        <td>${paid}</td>
        <td>${METHOD_LABELS[p.method] ?? p.method}</td>
        <td><span style="color:${statusColor};font-weight:600">${STATUS_LABELS[p.status] ?? p.status}</span></td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>تقرير مالي — ${patient.user.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 13px; color: #111; background: #fff; padding: 32px; }
    .header { background: #2563eb; color: #fff; padding: 20px 24px; border-radius: 8px; margin-bottom: 24px; }
    .header h1 { font-size: 22px; margin-bottom: 4px; }
    .header p  { font-size: 13px; opacity: .85; }
    .section-title { font-size: 15px; font-weight: 700; margin-bottom: 10px; color: #1e3a5f; border-bottom: 2px solid #2563eb; padding-bottom: 4px; }
    .info-grid { display: grid; grid-template-columns: 120px 1fr; gap: 6px 12px; margin-bottom: 24px; font-size: 13px; }
    .info-grid .lbl { color: #6b7280; font-weight: 600; }
    .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
    .summary-card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px 12px; }
    .summary-card .s-label { font-size: 11px; color: #6b7280; margin-bottom: 4px; }
    .summary-card .s-value { font-size: 18px; font-weight: 700; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    thead tr { background: #2563eb; color: #fff; }
    thead th { padding: 9px 8px; text-align: right; font-weight: 600; white-space: nowrap; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    tbody td { padding: 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
    .footer { margin-top: 24px; text-align: center; color: #9ca3af; font-size: 11px; border-top: 1px solid #e5e7eb; padding-top: 12px; }
    @media print {
      body { padding: 16px; }
      .no-print { display: none; }
      @page { margin: 1cm; }
    }
  </style>
</head>
<body>

  <div class="no-print" style="margin-bottom:16px;display:flex;gap:10px">
    <button onclick="window.print()" style="padding:8px 20px;background:#2563eb;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:13px">طباعة / حفظ كـ PDF</button>
    <button onclick="window.close()" style="padding:8px 20px;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;font-size:13px">إغلاق</button>
  </div>

  <div class="header">
    <h1>🦷 DenClinic — تقرير مالي</h1>
    <p>${dateStr}</p>
  </div>

  <div class="section-title">معلومات المريض</div>
  <div class="info-grid">
    <span class="lbl">الاسم</span>      <span>${patient.user.name}</span>
    <span class="lbl">الهاتف</span>     <span dir="ltr">${patient.user.phoneNumber}</span>
    ${patient.user.email ? `<span class="lbl">الإيميل</span><span>${patient.user.email}</span>` : ''}
    <span class="lbl">تاريخ التقرير</span> <span>${dateStr}</span>
  </div>

  <div class="section-title">الملخص المالي</div>
  <div class="summary">
    <div class="summary-card">
      <div class="s-label">إجمالي المدفوع</div>
      <div class="s-value" style="color:#16a34a">${totalPaid.toFixed(2)} ₪</div>
    </div>
    <div class="summary-card">
      <div class="s-label">مستحق الدفع</div>
      <div class="s-value" style="color:#dc2626">${totalDebt.toFixed(2)} ₪</div>
    </div>
    <div class="summary-card">
      <div class="s-label">فائض</div>
      <div class="s-value" style="color:#7c3aed">${totalSurplus.toFixed(2)} ₪</div>
    </div>
    <div class="summary-card">
      <div class="s-label">مستردات</div>
      <div class="s-value" style="color:#6b7280">${totalRefunded.toFixed(2)} ₪</div>
    </div>
  </div>

  <div class="section-title">سجل الحركات المالية</div>
  ${payments.length === 0
    ? '<p style="color:#6b7280;text-align:center;padding:24px">لا توجد حركات مالية</p>'
    : `<table>
        <thead>
          <tr>
            <th>التاريخ</th>
            <th>الخدمة</th>
            <th>المبلغ الأصلي</th>
            <th>الخصم</th>
            <th>المبلغ النهائي</th>
            <th>المدفوع</th>
            <th>طريقة الدفع</th>
            <th>الحالة</th>
          </tr>
        </thead>
        <tbody>${unpaidRows}${rows}</tbody>
      </table>`
  }

  <div class="footer">
    تم إنشاء هذا التقرير بواسطة DenClinic — سري وخاص بالمريض
  </div>

</body>
</html>`;

    return new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
