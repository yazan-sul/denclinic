import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, ValidationError } from '@/lib/errors';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { createNotification } from '@/lib/notifications';

const confirmSchema = z.object({
  paymentId:      z.string().min(1),
  method:         z.enum(['CASH', 'CARD', 'BANK_TRANSFER']),
  discountType:   z.enum(['NONE', 'PERCENTAGE', 'FIXED']).default('NONE'),
  discountValue:  z.number().min(0).default(0),
  paidAmount:     z.number().positive('المبلغ المدفوع يجب أن يكون أكبر من صفر'),
  paidCurrency:   z.enum(['ILS', 'USD', 'JOD', 'EUR']),
  exchangeRate:   z.number().positive().default(1),
  refundSurplus:  z.boolean().default(false),
  refundMethod:   z.enum(['CASH', 'CARD', 'BANK_TRANSFER']).optional(),
  notes:          z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const v = confirmSchema.parse(body);

    const payment = await prisma.payment.findUnique({
      where: { id: v.paymentId },
      select: {
        id: true, status: true, amount: true, originalAmount: true, currency: true,
        surplus: true,
        appointmentId: true,
        appointment: {
          select: {
            clinicId: true, patientId: true,
            service: { select: { name: true } },
            patient: { select: { userId: true } },
          },
        },
      },
    });

    if (!payment) throw new NotFoundError('الدفعة غير موجودة');
    if (payment.status !== 'PENDING') throw new ConflictError('يمكن تأكيد الفواتير المعلقة فقط');

    const staffClinicIds = user.staffProfiles.map(p => p.clinicId);
    if (payment.appointment && staffClinicIds.length > 0 && !staffClinicIds.includes(payment.appointment.clinicId)) {
      throw new ForbiddenError('لا صلاحية على هذه الدفعة');
    }

    if (v.discountType === 'PERCENTAGE' && v.discountValue > 100) {
      throw new ValidationError('نسبة الخصم يجب أن تكون بين 0 و 100');
    }

    const baseAmount = payment.originalAmount ?? payment.amount;

    if (v.discountType === 'FIXED' && v.discountValue > baseAmount) {
      throw new ValidationError('قيمة الخصم أكبر من المبلغ الأصلي');
    }

    const finalAmount = v.discountType === 'PERCENTAGE'
      ? baseAmount * (1 - v.discountValue / 100)
      : v.discountType === 'FIXED'
        ? Math.max(0, baseAmount - v.discountValue)
        : baseAmount;

    const rounded    = Math.round(finalAmount * 100) / 100;
    const currency   = String(payment.currency);
    const paidInCost = Math.round(v.paidAmount * v.exchangeRate * 100) / 100;

    // Add previously paid amount (from partial payments) to get total paid
    const previouslyPaid = (payment.surplus !== null && (payment.surplus ?? 0) < -0.005)
      ? Math.max(0, Math.round((payment.amount + (payment.surplus ?? 0)) * 100) / 100)
      : 0;
    const totalPaid  = Math.round((paidInCost + previouslyPaid) * 100) / 100;
    const surplus    = Math.round((totalPaid - rounded) * 100) / 100;

    const isPartial = surplus < -0.005; // still not fully paid after this payment

    const discountDesc = v.discountType === 'PERCENTAGE'
      ? ` (خصم ${v.discountValue}%)`
      : v.discountType === 'FIXED'
        ? ` (خصم ثابت ${v.discountValue} ${currency})`
        : '';

    const partialNote = isPartial
      ? ` — مدفوع جزئياً ${paidInCost.toFixed(2)} ${currency} من ${rounded.toFixed(2)} ${currency}`
      : '';

    // If refundSurplus: save surplus=0 on payment, create payout record
    const savedSurplus = isPartial ? surplus : ((v.refundSurplus && surplus > 0) ? 0 : surplus);

    const [updated] = await prisma.$transaction([
      prisma.payment.update({
        where: { id: v.paymentId },
        data: {
          status:          isPartial ? 'PENDING' : 'COMPLETED',
          method:          v.method,
          amount:          rounded,
          originalAmount:  baseAmount,
          discountType:    v.discountType,
          discountValue:   v.discountValue,
          paidAmount:      v.paidAmount,
          paidCurrency:    v.paidCurrency,
          exchangeRate:    v.exchangeRate,
          surplus:         savedSurplus,
          transactionTime: new Date(),
          description:     `${payment.appointment?.service.name ?? ''}${discountDesc}${v.notes ? ' — ' + v.notes : ''}${partialNote}`,
        },
        select: { id: true, amount: true, status: true, surplus: true },
      }),
      prisma.paymentTransaction.create({
        data: {
          paymentId:   v.paymentId,
          paidAmount:  v.paidAmount,
          paidCurrency: v.paidCurrency,
          exchangeRate: v.exchangeRate,
          amountInCost: paidInCost,
          method:      v.method,
          notes:       v.notes,
          paidAt:      new Date(),
        },
      }),
    ]);

    // Create immediate payout record if refunding surplus
    if (v.refundSurplus && surplus > 0 && payment.appointmentId && payment.appointment?.patient.userId) {
      await prisma.payment.create({
        data: {
          userId:          payment.appointment.patient.userId,
          amount:          surplus,
          originalAmount:  surplus,
          currency:        payment.currency,
          paidAmount:      surplus,
          paidCurrency:    payment.currency,
          exchangeRate:    1,
          surplus:         0,
          method:          v.refundMethod ?? v.method,
          status:          'REFUNDED',
          transactionTime: new Date(),
          transactionId:   `PAYOUT-${Date.now()}`,
          description:     `استرداد فائض — ${payment.appointment.service.name}`,
        },
      });
    }

    const patientUserId = payment.appointment?.patient?.userId;
    if (patientUserId && !isPartial) {
      await createNotification({
        userId: patientUserId,
        type: 'APPOINTMENT_UPDATED',
        title: 'تم تأكيد دفعتك',
        message: v.refundSurplus && surplus > 0
          ? `تم تأكيد دفعتك بمبلغ ${rounded.toFixed(2)} ${currency} وسيتم استرداد الفائض (${surplus.toFixed(2)} ${currency}).`
          : `تم تأكيد دفعتك بمبلغ ${rounded.toFixed(2)} ${currency}.`,
        link: '/patient/bookings',
      });
    }

    return NextResponse.json({
      success: true,
      data:    updated,
      message: v.refundSurplus && surplus > 0
        ? `تم تأكيد الدفعة واسترداد الفائض (${surplus.toFixed(2)} ${currency})`
        : 'تم تأكيد استلام الدفعة',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0]?.message }, { status: 400 });
    }
    return handleApiError(error);
  }
}
