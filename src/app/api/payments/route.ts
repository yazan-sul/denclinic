import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, ConflictError, NotFoundError, UnauthorizedError } from '@/lib/errors';
import { paymentSchema } from '@/lib/validators';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) {
      throw new UnauthorizedError('غير مصرح');
    }

    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      throw new UnauthorizedError('رمز غير صالح أو منتهي الصلاحية');
    }

    const body = await request.json();
    const validated = paymentSchema.parse(body);

    const { appointmentId, method, cardNumber, expiry, cvv, simulationResult } = validated;

    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        select: {
          id: true,
          userId: true,
          status: true,
          clinicId: true,
          branchId: true,
          doctorId: true,
          serviceId: true,
          service: {
            select: {
              basePrice: true,
            },
          },
        },
      });

      if (!appointment) {
        throw new NotFoundError('الحجز غير موجود');
      }

      if (appointment.userId !== decoded.userId) {
        throw new UnauthorizedError('لا يمكنك الدفع لهذا الحجز');
      }

      if (appointment.status !== 'PENDING' && appointment.status !== 'PAYMENT_FAILED') {
        throw new ConflictError('لا يمكن تنفيذ الدفع لهذا الحجز');
      }

      const existingPayment = await tx.payment.findUnique({
        where: { appointmentId },
      });

      if (existingPayment) {
        if (existingPayment.status === 'FAILED') {
          await tx.payment.delete({ where: { id: existingPayment.id } });
        } else {
          throw new ConflictError('تمت معالجة الدفع مسبقاً لهذا الحجز');
        }
      }

      const priorEligibleVisitsCount = await tx.appointment.count({
        where: {
          userId: decoded.userId,
          clinicId: appointment.clinicId,
          branchId: appointment.branchId,
          id: { not: appointment.id },
          OR: [
            {
              status: {
                in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW', 'RESCHEDULED'],
              },
            },
            {
              payment: {
                is: {
                  status: {
                    in: ['PENDING', 'COMPLETED'],
                  },
                },
              },
            },
          ],
        },
      });

      const isFirstTimeAtScope = priorEligibleVisitsCount === 0;
      if (isFirstTimeAtScope && method === 'CASH') {
        throw new ConflictError('أول زيارة لهذا الموعد تتطلب الدفع بالبطاقة قبل التأكيد');
      }

      const amount = appointment.service?.basePrice ?? 50;

      const isCardSuccess = method === 'CARD' && simulationResult === 'success';
      const paymentStatus = method === 'CASH'
        ? 'PENDING'
        : (isCardSuccess ? 'COMPLETED' : 'FAILED');
      const nextAppointmentStatus = method === 'CASH'
        ? 'CONFIRMED'
        : (isCardSuccess ? 'CONFIRMED' : 'PAYMENT_FAILED');

      const paymentDescription = method === 'CASH'
        ? 'Cash payment to be collected at clinic'
        : `Mock card payment ****${cardNumber!.slice(-4)} exp ${expiry!}`;

      const transactionId = method === 'CASH'
        ? `CASH-PENDING-${Date.now()}`
        : `MOCK-${Date.now()}-${cvv!.length}`;

      const payment = await tx.payment.create({
        data: {
          appointmentId,
          userId: decoded.userId,
          amount,
          currency: 'LYD',
          method,
          status: paymentStatus,
          description: paymentDescription,
          transactionId,
          transactionTime: new Date(),
        },
      });

      const updatedAppointment = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: nextAppointmentStatus,
          retryDeadline: !isCardSuccess && method === 'CARD' ? new Date(Date.now() + 15 * 60 * 1000) : null,
        },
      });

      return {
        payment,
        appointment: updatedAppointment,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentId: result.payment.id,
        paymentStatus: result.payment.status,
        appointmentId: result.appointment.id,
        appointmentStatus: result.appointment.status,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues?.[0];
      const message = (firstError as any)?.message || 'بيانات الدفع غير صحيحة';
      return NextResponse.json({ success: false, message }, { status: 400 });
    }

    return handleApiError(error);
  }
}
