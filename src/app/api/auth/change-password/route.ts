import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken, hashPassword, verifyPassword } from '@/lib/auth';
import { handleApiError, ValidationError } from '@/lib/errors';
import { verify as argon2Verify } from '@node-rs/argon2';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) return NextResponse.json({ success: false, error: { message: 'غير مصرح' } }, { status: 401 });

    const decoded = verifyToken(token);
    if (!decoded) return NextResponse.json({ success: false, error: { message: 'رمز غير صالح' } }, { status: 401 });

    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword)
      throw new ValidationError('جميع الحقول مطلوبة');
    if (newPassword.length < 8)
      throw new ValidationError('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, password: true },
    });
    if (!user) return NextResponse.json({ success: false, error: { message: 'المستخدم غير موجود' } }, { status: 404 });

    let isValid = false;
    if (user.password.startsWith('$argon2')) {
      try { isValid = await argon2Verify(user.password, currentPassword); } catch { isValid = false; }
    } else {
      isValid = verifyPassword(currentPassword, user.password);
    }

    if (!isValid) throw new ValidationError('كلمة المرور الحالية غير صحيحة');

    await prisma.user.update({
      where: { id: decoded.userId },
      data: { password: hashPassword(newPassword) },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
