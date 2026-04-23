import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError } from '@/lib/errors';
import { verifyToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Get token from HTTP-only cookie
    const token = request.cookies.get('authToken')?.value;
    
    if (!token) {
      return NextResponse.json({ message: 'غير مصرح' }, { status: 401 });
    }
    
    // Verify JWT signature and expiry
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ message: 'رمز غير صالح أو منتهي الصلاحية' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        patient: true,
        doctorProfile: true,
      },
    });

    if (!user) {
      return NextResponse.json({ message: 'المستخدم غير موجود' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name || '',
        email: user.email || null,
        phoneNumber: user.phoneNumber || '',
        roles: user.roles,
        ...(user.avatar && { avatar: user.avatar }),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
