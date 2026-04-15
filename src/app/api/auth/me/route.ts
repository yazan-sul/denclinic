import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MOCK_USERS } from '@/lib/mockData';
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

    // Try to find user in database first
    let user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        patient: true,
        doctorProfile: true,
      },
    });

    // Fallback to mock user if not found in database
    if (!user) {
      const mockUser = MOCK_USERS.find(u => u.id === decoded.userId);
      if (!mockUser) {
        return NextResponse.json({ message: 'المستخدم غير موجود' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        data: {
          id: mockUser.id,
          name: mockUser.name || '',
          email: mockUser.email || '',
          phoneNumber: mockUser.phoneNumber || '',
          role: mockUser.role,
          ...(mockUser.avatar && { avatar: mockUser.avatar }),
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        role: user.role,
        ...(user.avatar && { avatar: user.avatar }),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
