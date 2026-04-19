import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, ConflictError, NotFoundError, UnauthorizedError } from '@/lib/errors';
import { verifyToken } from '@/lib/auth';

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
      },
    });

    if (!appointment) {
      throw new NotFoundError('الحجز غير موجود');
    }

    if (appointment.userId !== decoded.userId) {
      throw new UnauthorizedError('لا يمكنك إلغاء هذا الحجز');
    }

    if (appointment.status !== 'PENDING') {
      throw new ConflictError('يمكن إلغاء الحجوزات المعلقة فقط');
    }

    const cancelled = await prisma.appointment.update({
      where: { id: bookingId },
      data: { status: 'CANCELLED' },
      select: {
        id: true,
        status: true,
      },
    });

    return NextResponse.json({ success: true, data: cancelled });
  } catch (error) {
    return handleApiError(error);
  }
}
