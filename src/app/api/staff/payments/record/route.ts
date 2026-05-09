import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, ValidationError } from '@/lib/errors';
import { PaymentMethod } from '@prisma/client';
import { z } from 'zod';

const recordPaymentSchema = z.object({
  appointmentId: z.string().min(1, 'معرف الموعد مطلوب'),
  method: z.enum(['CASH', 'CARD', 'BANK_TRANSFER'] as const),
  amount: z.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  notes: z.string().max(500).optional(),
  discountType:  z.enum(['NONE', 'PERCENTAGE', 'FIXED']).default('NONE'),
  discountValue: z.number().min(0).default(0),
});

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        roles: true,
        staffProfiles: { select: { clinicId: true } },
      },
    });
    if (!user) throw new UnauthorizedError('غير مصرح');

    const roles = user.roles as string[];
    const isStaff = roles.some(r => ['STAFF', 'ADMIN', 'CLINIC_OWNER'].includes(r));
    if (!isStaff) throw new ForbiddenError('يجب أن تكون من طاقم العمل');

    const body = await request.json();
    const validated = recordPaymentSchema.parse(body);
    const { appointmentId, method, amount, notes, discountType, discountValue } = validated;

    // Verify appointment exists and belongs to staff's clinic
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: {
        id: true,
        clinicId: true,
        status: true,
        userId: true,
        service: { select: { name: true, basePrice: true } },
        patient: { select: { userId: true, user: { select: { name: true } } } },
        payment: { select: { id: true, status: true } },
      },
    });

    if (!appointment) throw new NotFoundError('الموعد غير موجود');

    const staffClinicIds = user.staffProfiles.map(p => p.clinicId);
    if (staffClinicIds.length > 0 && !staffClinicIds.includes(appointment.clinicId)) {
      throw new ForbiddenError('الموعد لا ينتمي إلى عيادتك');
    }

    // Don't allow recording payment if already COMPLETED
    if (appointment.payment?.status === 'COMPLETED') {
      throw new ConflictError('تم تسجيل دفعة مكتملة لهذا الموعد مسبقاً');
    }

    // Calculate final amount after discount
    let finalAmount = amount;
    if (discountType === 'PERCENTAGE') {
      if (discountValue < 0 || discountValue > 100) throw new ValidationError('نسبة الخصم يجب أن تكون بين 0 و 100');
      finalAmount = amount * (1 - discountValue / 100);
    } else if (discountType === 'FIXED') {
      if (discountValue > amount) throw new ValidationError('قيمة الخصم أكبر من المبلغ الأصلي');
      finalAmount = amount - discountValue;
    }
    finalAmount = Math.round(finalAmount * 100) / 100;

    const discountDesc = discountType === 'PERCENTAGE'
      ? ` (خصم ${discountValue}%)`
      : discountType === 'FIXED'
        ? ` (خصم ${discountValue} ثابت)`
        : '';

    const payment = await prisma.$transaction(async (tx) => {
      // If there's an existing failed/cancelled payment, delete it
      if (appointment.payment) {
        await tx.payment.delete({ where: { id: appointment.payment.id } });
      }

      const newPayment = await tx.payment.create({
        data: {
          appointmentId,
          userId: appointment.userId,
          amount: finalAmount,
          currency: 'ILS',
          method: method as PaymentMethod,
          // CASH → PENDING (to be confirmed), CARD/BANK → COMPLETED immediately
          status: method === 'CASH' ? 'PENDING' : 'COMPLETED',
          description: `${appointment.service.name}${discountDesc}${notes ? ' — ' + notes : ''}`,
          transactionId: `STAFF-${decoded.userId}-${Date.now()}`,
          transactionTime: new Date(),
        },
      });

      // Update appointment status to CONFIRMED
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: 'CONFIRMED' },
      });

      // Notify patient
      if (appointment.patient?.userId) {
        await tx.notification.create({
          data: {
            userId: appointment.patient.userId,
            type: 'APPOINTMENT_UPDATED',
            title: 'تم تسجيل دفعتك',
            message: method === 'CASH'
              ? `تم تسجيل دفعة نقدية بمبلغ ${finalAmount} ₪ لموعدك. سيتم تأكيدها عند الاستلام.`
              : `تم استلام دفعتك بمبلغ ${finalAmount} ₪ بنجاح.`,
            link: '/patient/bookings',
          },
        });
      }

      return newPayment;
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentId:   payment.id,
        amount:      payment.amount,
        finalAmount,
        discountType,
        discountValue,
        status:      payment.status,
        method:      payment.method,
      },
      message: method === 'CASH'
        ? 'تم تسجيل الدفعة النقدية — بانتظار التأكيد عند الاستلام'
        : 'تم تسجيل الدفعة بنجاح',
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const msg = error.issues[0]?.message ?? 'بيانات غير صحيحة';
      return NextResponse.json({ success: false, message: msg }, { status: 400 });
    }
    return handleApiError(error);
  }
}
