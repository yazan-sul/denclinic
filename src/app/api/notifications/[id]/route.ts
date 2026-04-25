import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors';

// PATCH /api/notifications/[id] — mark single notification as read
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const { id } = await params;
    const notifId = parseInt(id, 10);

    const notif = await prisma.notification.findUnique({ where: { id: notifId } });
    if (!notif || notif.userId !== decoded.userId) throw new ForbiddenError('غير مصرح');

    await prisma.notification.update({ where: { id: notifId }, data: { isRead: true } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}