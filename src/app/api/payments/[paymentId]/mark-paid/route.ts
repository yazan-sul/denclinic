import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, UnauthorizedError, ConflictError, NotFoundError } from '@/lib/errors';
import { verifyToken } from '@/lib/auth';

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
      select: { role: true },
    });

    if (!user || !['STAFF', 'ADMIN', 'CLINIC_OWNER'].includes(user.role)) {
      throw new UnauthorizedError('غير مصرح. يجب أن تكون من طاقم العمل.');
    }

    const { paymentId } = await params;

    const payment = await prisma.$transaction(async (tx) => {
      const existingPayment = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { appointment: true },
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

      if (existingPayment.appointment?.status !== 'CONFIRMED') {
        throw new ConflictError('حالة الحجز لا تسمح بتحصيل هذه الدفعة');
      }

      return tx.payment.update({
        where: { id: paymentId },
        data: { status: 'COMPLETED' },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        status: payment.status,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
