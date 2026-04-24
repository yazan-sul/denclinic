import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, ConflictError, NotFoundError, UnauthorizedError } from '@/lib/errors';
import { verifyToken } from '@/lib/auth';
import { evaluateAppointmentPolicy } from '@/lib/appointmentPolicy';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) {
      throw new UnauthorizedError('غير مصرح');
    }

    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      throw new UnauthorizedError('رمز غير صالح أو منتهي الصلاحية');
    }

    const { bookingId } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        status: true,
        appointmentDate: true,
        appointmentTime: true,
        slotId: true,
        payment: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundError('الحجز غير موجود');
    }

    if (appointment.userId !== decoded.userId) {
      throw new UnauthorizedError('لا يمكنك إلغاء هذا الحجز');
    }

    if (appointment.status !== 'PENDING' && appointment.status !== 'CONFIRMED') {
      throw new ConflictError('يمكن إلغاء الحجوزات المعلقة أو المؤكدة فقط');
    }

    const policy = evaluateAppointmentPolicy(appointment.appointmentDate, appointment.appointmentTime);
    if (policy.hasStarted) {
      throw new ConflictError('لا يمكن إلغاء موعد بدأ بالفعل');
    }

    const cancelled = await prisma.$transaction(async (tx) => {
      if (appointment.slotId) {
        await tx.slot.update({
          where: { id: appointment.slotId },
          data: { isAvailable: true },
        });
      }

      if (appointment.payment) {
        let paymentStatus: 'REFUNDED' | 'CANCELLED' | null = null;

        if (appointment.payment.status === 'COMPLETED') {
          paymentStatus = policy.canRefund ? 'REFUNDED' : 'CANCELLED';
        } else if (appointment.payment.status === 'PENDING') {
          paymentStatus = 'CANCELLED';
        }

        if (paymentStatus) {
          await tx.payment.update({
            where: { id: appointment.payment.id },
            data: { status: paymentStatus },
          });
        }
      }

      return tx.appointment.update({
        where: { id: bookingId },
        data: {
          status: 'CANCELLED',
          slotId: null,
          retryDeadline: null,
        },
        select: {
          id: true,
          status: true,
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        ...cancelled,
        policy: {
          canRefund: policy.canRefund,
          hoursRemaining: policy.hoursRemaining,
          refundWindowHours: policy.refundWindowHours,
        },
      },
      message: policy.canRefund
        ? 'تم إلغاء الموعد واسترداد المبلغ'
        : `تم إلغاء الموعد. لا يمكن استرداد المبلغ قبل أقل من ${policy.refundWindowHours} ساعات`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
