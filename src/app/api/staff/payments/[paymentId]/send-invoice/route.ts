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
        id: true,
        amount: true,
        originalAmount: true,
        currency: true,
        paidAmount: true,
        paidCurrency: true,
        exchangeRate: true,
        surplus: true,
        discountType: true,
        discountValue: true,
        method: true,
        status: true,
        transactionTime: true,
        appointment: {
          select: {
            clinicId: true,
            appointmentDate: true,
            appointmentTime: true,
            patient: {
              select: {
                user: { select: { name: true, email: true } },
              },
            },
            doctor:  { select: { user: { select: { name: true } } } },
            service: { select: { name: true } },
            branch:  { select: { name: true } },
          },
        },
      },
    });

    if (!payment) throw new NotFoundError('الدفعة غير موجودة');
    if (!payment.appointment) throw new ValidationError('هذه الدفعة غير مرتبطة بموعد');

    // Verify clinic scope
    const staffClinicIds = user.staffProfiles.map(p => p.clinicId);
    if (staffClinicIds.length > 0 && !staffClinicIds.includes(payment.appointment.clinicId)) {
      throw new ForbiddenError('لا صلاحية على هذه الدفعة');
    }

    const patientEmail = payment.appointment.patient.user.email;
    if (!patientEmail) throw new ValidationError('المريض ليس لديه بريد إلكتروني مسجل');

    await sendInvoiceEmail({
      branchName:      payment.appointment.branch.name,
      patientName:     payment.appointment.patient.user.name,
      patientEmail,
      doctorName:      payment.appointment.doctor.user.name,
      serviceName:     payment.appointment.service.name,
      appointmentDate: payment.appointment.appointmentDate.toISOString().split('T')[0],
      appointmentTime: payment.appointment.appointmentTime,
      originalAmount:  payment.originalAmount ?? payment.amount,
      finalAmount:     payment.amount,
      currency:        String(payment.currency),
      discountType:    payment.discountType,
      discountValue:   payment.discountValue,
      paidAmount:      payment.paidAmount,
      paidCurrency:    payment.paidCurrency ? String(payment.paidCurrency) : null,
      exchangeRate:    payment.exchangeRate,
      surplus:         payment.surplus,
      method:          String(payment.method),
      status:          String(payment.status),
      transactionTime: payment.transactionTime.toLocaleDateString('ar-EG', {
        year: 'numeric', month: 'long', day: 'numeric',
      }),
    });

    return NextResponse.json({
      success: true,
      message: `تم إرسال الفاتورة إلى ${patientEmail}`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
