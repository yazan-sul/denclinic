import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, ForbiddenError, UnauthorizedError } from '@/lib/errors';
import { validateUserId } from '@/lib/validators';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
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

    const { userId: userIdStr } = await params;
    const requestedUserId = validateUserId({ userId: userIdStr });

    if (requestedUserId !== decoded.userId) {
      throw new ForbiddenError('لا يمكنك عرض حجوزات مستخدم آخر');
    }

    const appointments = await prisma.appointment.findMany({
      where: {
        userId: decoded.userId,
      },
      include: {
        clinic: { select: { name: true } },
        branch: { select: { name: true, address: true } },
        doctor: {
          select: {
            id: true,
            user: { select: { name: true } },
          },
        },
        service: { select: { name: true } },
      },
      orderBy: {
        appointmentDate: 'desc',
      },
    });

    return NextResponse.json({ success: true, data: appointments });
  } catch (error) {
    return handleApiError(error);
  }
}
