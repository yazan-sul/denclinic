import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, UnauthorizedError, ConflictError, NotFoundError } from '@/lib/errors';
import { verifyToken } from '@/lib/auth';
import { createNotification } from '@/lib/notifications';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
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

    // Check if user is staff/admin
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { roles: true },
    });

    if (!user || !user.roles.some((role: string) => ['STAFF', 'ADMIN', 'CLINIC_OWNER'].includes(role))) {
      throw new UnauthorizedError('غير مصرح. يجب أن تكون من طاقم العمل.');
    }

    const { paymentId } = await params;

    const payment = await prisma.$transaction(async (tx) => {
      const existingPayment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: {
          appointment: {
            include: {
              patient: { select: { userId: true } },
              clinic: { select: { name: true } },
            },
          },
        },
      });

      if (!existingPayment) {
        throw new NotFoundError('الدفعة غير موجودة');
      }

      if (existingPayment.status !== 'PENDING') {
        throw new ConflictError('الدفعة ليست قيد الانتظار');
      }

      if (existingPayment.method !== 'CASH') {
        throw new ConflictError('هذه الدفعة ليست نقدية');
      }

      // Lab order payments have no appointment — skip appointment status check
      if (existingPayment.appointmentId) {
        if (
          existingPayment.appointment?.status !== 'CONFIRMED' &&
          existingPayment.appointment?.status !== 'IN_PROGRESS'
        ) {
          throw new ConflictError('حالة الحجز لا تسمح بتحصيل هذه الدفعة');
        }
      }

      const updated = await tx.payment.update({
        where: { id: paymentId },
        data: { status: 'COMPLETED' },
      });
      return {
        payment: updated,
        patientUserId: existingPayment.appointment?.patient?.userId ?? null,
        amount: existingPayment.amount,
        currency: existingPayment.currency,
        clinicName: existingPayment.appointment?.clinic?.name ?? 'العيادة',
      };
    });

    if (payment.patientUserId) {
      await createNotification({
        userId:     payment.patientUserId,
        type:       'APPOINTMENT_UPDATED',
        title:      'تم استلام دفعتك',
        message:    `تم تأكيد استلام دفعتك النقدية بمبلغ ${payment.amount.toFixed(2)} ${payment.currency} في ${payment.clinicName}.`,
        link:       '/patient/bookings',
        targetRole: 'PATIENT',
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.payment.id,
        status: payment.payment.status,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
