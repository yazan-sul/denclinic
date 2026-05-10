import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';
import { Currency, PaymentMethod, UserRole } from '@prisma/client';
import { z } from 'zod';

const payoutSchema = z.object({
  patientId:  z.number().int().positive(),
  clinicId:   z.number().int().positive(),
  amount:     z.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  currency:   z.enum(['ILS', 'USD', 'JOD', 'EUR'] as const).default('ILS'),
  method:     z.enum(['CASH', 'CARD', 'BANK_TRANSFER'] as const),
  notes:      z.string().max(500).optional(),
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
    const isStaff = roles.some(r => ['STAFF', 'ADMIN', 'CLINIC_OWNER'].includes(r));
    if (!isStaff) throw new ForbiddenError('يجب أن تكون من طاقم العمل');

    const body = await request.json();
    const v = payoutSchema.parse(body);

    // Verify staff belongs to this clinic
    const staffClinicIds = user.staffProfiles.map(p => p.clinicId);
    if (staffClinicIds.length > 0 && !staffClinicIds.includes(v.clinicId)) {
      throw new ForbiddenError('لا صلاحية على هذه العيادة');
    }

    // Get patient's user ID
    const patient = await prisma.patient.findUnique({
      where: { id: v.patientId },
      select: { userId: true, user: { select: { name: true } } },
    });
    if (!patient) throw new ValidationError('المريض غير موجود');

    const payment = await prisma.$transaction(async (tx) => {
      // Reduce surplus from existing payments (oldest first)
      const surplusPayments = await tx.payment.findMany({
        where: {
          userId: patient.userId,
          status: 'COMPLETED',
          surplus: { gt: 0 },
          appointment: { clinicId: v.clinicId },
        },
        select: { id: true, surplus: true },
        orderBy: { transactionTime: 'asc' },
      });

      let remaining = v.amount;
      for (const p of surplusPayments) {
        if (remaining <= 0) break;
        const currentSurplus = p.surplus ?? 0;
        const deduct = Math.min(remaining, currentSurplus);
        await tx.payment.update({
          where: { id: p.id },
          data: { surplus: Math.round((currentSurplus - deduct) * 100) / 100 },
        });
        remaining = Math.round((remaining - deduct) * 100) / 100;
      }

      // Record the payout as a REFUNDED payment (clinic → patient)
      return tx.payment.create({
        data: {
          userId:          patient.userId,
          amount:          v.amount,
          originalAmount:  v.amount,
          currency:        v.currency as Currency,
          paidAmount:      v.amount,
          paidCurrency:    v.currency as Currency,
          exchangeRate:    1,
          surplus:         0,
          method:          v.method as PaymentMethod,
          status:          'REFUNDED',
          description:     `صرف للمريض ${patient.user.name}${v.notes ? ' — ' + v.notes : ''}`,
          transactionId:   `PAYOUT-${decoded.userId}-${Date.now()}`,
          transactionTime: new Date(),
        },
      });
    });

    // Notify patient
    await prisma.notification.create({
      data: {
        userId:  patient.userId,
        type:    'APPOINTMENT_UPDATED',
        title:   'تم صرف مبلغ لك',
        message: `تم صرف مبلغ ${v.amount.toFixed(2)} ${v.currency} من العيادة بطريقة ${{ CASH: 'نقدي', CARD: 'بطاقة', BANK_TRANSFER: 'تحويل بنكي' }[v.method]}.`,
        link:    '/patient/bookings',
      },
    });

    return NextResponse.json({
      success: true,
      data:    { paymentId: payment.id, amount: v.amount, currency: v.currency },
      message: `تم صرف ${v.amount.toFixed(2)} ${v.currency} للمريض`,
    }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0]?.message ?? 'بيانات غير صحيحة' }, { status: 400 });
    }
    return handleApiError(error);
  }
}
