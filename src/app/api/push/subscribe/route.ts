import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError } from '@/lib/errors';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const body = await request.json() as {
      subscription: { endpoint: string; keys: { p256dh: string; auth: string } };
      platform?: string;
    };

    const { endpoint, keys } = body.subscription;

    await prisma.deviceToken.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth, userId: decoded.userId },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        platform: body.platform ?? 'web',
        userId: decoded.userId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const { endpoint } = await request.json() as { endpoint: string };

    await prisma.deviceToken.deleteMany({
      where: { endpoint, userId: decoded.userId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
