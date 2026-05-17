import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ValidationError } from '@/lib/errors';
import { z } from 'zod';

const subscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
  platform: z.enum(['android', 'ios', 'web']).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const raw = await request.json();
    const parsed = subscribeSchema.safeParse(raw);
    if (!parsed.success) throw new ValidationError('بيانات الاشتراك غير صحيحة');

    const { endpoint, keys } = parsed.data.subscription;
    const platform = parsed.data.platform;

    await prisma.deviceToken.upsert({
      where: { endpoint },
      update: { p256dh: keys.p256dh, auth: keys.auth, userId: decoded.userId },
      create: {
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        platform: platform ?? 'web',
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
