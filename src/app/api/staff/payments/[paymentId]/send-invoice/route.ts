import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import { UserRole } from '@prisma/client';
import { sendInvoiceEmail } from '@/lib/email';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
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
    const isStaff = roles.some(r => ['STAFF', 'ADMIN', 'CLINIC_OWNER'].includes(r));
    if (!isStaff) throw new ForbiddenError('يجب أن تكون من طاقم العمل');

    const { paymentId } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true, amount: true, originalAmount: true, currency: true,
        paidAmount: true, paidCurrency: true, exchangeRate: true, surplus: true,
        discountType: true, discountValue: true, method: true, status: true,
        transactionTime: true, description: true,
        appointment: {
          select: {
            clinicId: true, appointmentDate: true, appointmentTime: true,
            patient: { select: { user: { select: { name: true, email: true } } } },
            doctor:  { select: { user: { select: { name: true } } } },
            service: { select: { name: true } },
            branch:  { select: { name: true } },
          },
        },
      },
    });

    if (!payment) throw new NotFoundError('الدفعة غير موجودة');

    const staffClinicIds = user.staffProfiles.map(p => p.clinicId);
    const txTime = payment.transactionTime.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    const basePayment = {
      originalAmount: payment.originalAmount ?? payment.amount,
      finalAmount:    payment.amount,
      currency:       String(payment.currency),
      discountType:   payment.discountType,
      discountValue:  payment.discountValue,
      paidAmount:     payment.paidAmount,
      paidCurrency:   payment.paidCurrency ? String(payment.paidCurrency) : null,
      exchangeRate:   payment.exchangeRate,
      surplus:        payment.surplus,
      method:         String(payment.method),
      status:         String(payment.status),
      transactionTime: txTime,
    };

    if (payment.appointment) {
      // Appointment-based payment
      if (staffClinicIds.length > 0 && !staffClinicIds.includes(payment.appointment.clinicId))
        throw new ForbiddenError('لا صلاحية على هذه الدفعة');
      const patientEmail = payment.appointment.patient.user.email;
      if (!patientEmail) throw new ValidationError('المريض ليس لديه بريد إلكتروني مسجل');
      await sendInvoiceEmail({
        ...basePayment,
        branchName:      payment.appointment.branch.name,
        patientName:     payment.appointment.patient.user.name,
        patientEmail,
        doctorName:      payment.appointment.doctor.user.name,
        serviceName:     payment.appointment.service.name,
        appointmentDate: payment.appointment.appointmentDate.toISOString().split('T')[0],
        appointmentTime: payment.appointment.appointmentTime,
      });
    } else {
      // Lab order payment — fetch via raw SQL
      type LabRow = {
        lab_name: string; branch_name: string; clinic_id: number;
        doctor_name: string; received_date: Date | null; order_date: Date;
        patient_name: string; patient_email: string | null;
      };
      const [labRow] = await prisma.$queryRaw<LabRow[]>`
        SELECT l.name AS lab_name, br.name AS branch_name, lo."clinicId" AS clinic_id,
               COALESCE(u_doc.name, 'طبيب العيادة') AS doctor_name,
               lo."receivedDate" AS received_date, lo."orderDate" AS order_date,
               u_pat.name AS patient_name, u_pat.email AS patient_email
        FROM "Payment" p
        JOIN "LabOrder" lo ON lo.id = p."labOrderId"
        JOIN "Lab" l ON l.id = lo."labId"
        JOIN "Branch" br ON br.id = lo."branchId"
        JOIN "Patient" pt ON pt.id = lo."patientId"
        JOIN "User" u_pat ON u_pat.id = pt."userId"
        LEFT JOIN "Doctor" doc ON doc.id = lo."doctorId"
        LEFT JOIN "User" u_doc ON u_doc.id = doc."userId"
        WHERE p.id = ${paymentId}
        LIMIT 1
      `;
      if (!labRow) throw new ValidationError('هذه الدفعة غير مرتبطة بموعد أو طلب مختبر');
      if (staffClinicIds.length > 0 && !staffClinicIds.includes(labRow.clinic_id))
        throw new ForbiddenError('لا صلاحية على هذه الدفعة');
      const patientEmail = labRow.patient_email;
      if (!patientEmail) throw new ValidationError('المريض ليس لديه بريد إلكتروني مسجل');
      const date = (labRow.received_date ?? labRow.order_date);
      await sendInvoiceEmail({
        ...basePayment,
        branchName:      labRow.branch_name,
        patientName:     labRow.patient_name,
        patientEmail,
        doctorName:      labRow.doctor_name,
        serviceName:     `طلب مختبر — ${labRow.lab_name}`,
        appointmentDate: new Date(date).toISOString().split('T')[0],
        appointmentTime: 'طلب مختبر',
      });
    }

    return NextResponse.json({
      success: true,
      message: `تم إرسال الفاتورة`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
