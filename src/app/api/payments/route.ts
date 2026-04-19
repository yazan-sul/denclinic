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
      });

      if (!appointment) {
        throw new NotFoundError('الحجز غير موجود');
      }

      if (appointment.userId !== decoded.userId) {
        throw new UnauthorizedError('لا يمكنك الدفع لهذا الحجز');
      }

      if (appointment.status !== 'PENDING') {
        throw new ConflictError('لا يمكن تنفيذ الدفع لهذا الحجز');
      }

      const existingPayment = await tx.payment.findUnique({
        where: { appointmentId },
      });

      if (existingPayment) {
        throw new ConflictError('تمت معالجة الدفع مسبقاً لهذا الحجز');
      }

      const paymentStatus = simulationResult === 'success' ? 'COMPLETED' : 'FAILED';
      const nextAppointmentStatus = simulationResult === 'success' ? 'CONFIRMED' : 'CANCELLED';

      const payment = await tx.payment.create({
        data: {
          appointmentId,
          userId: decoded.userId,
          amount: 50,
          currency: 'LYD',
          method,
          status: paymentStatus,
          description: `Mock card payment ****${cardNumber.slice(-4)} exp ${expiry}`,
          transactionId: `MOCK-${Date.now()}-${cvv.length}`,
          transactionTime: new Date(),
        },
      });

      const updatedAppointment = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: nextAppointmentStatus,
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
