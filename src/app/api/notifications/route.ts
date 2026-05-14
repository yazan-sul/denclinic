import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError } from '@/lib/errors';

// GET /api/notifications?activeRole=DOCTOR|STAFF|PATIENT|CLINIC_OWNER|ADMIN
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const activeRole = new URL(request.url).searchParams.get('activeRole');

    const notifications = await prisma.notification.findMany({
      where: {
        userId: decoded.userId,
        OR: [
          { targetRole: null },
          ...(activeRole ? [{ targetRole: activeRole }] : []),
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    return NextResponse.json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/notifications?activeRole=... — mark visible notifications as read
export async function PATCH(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const activeRole = new URL(request.url).searchParams.get('activeRole');

    await prisma.notification.updateMany({
      where: {
        userId: decoded.userId,
        isRead: false,
        OR: [
          { targetRole: null },
          ...(activeRole ? [{ targetRole: activeRole }] : []),
        ],
      },
      data: { isRead: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}