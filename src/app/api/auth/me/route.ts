import { NextResponse } from 'next/server';
import { MOCK_USERS } from '@/lib/mockData';
import { handleApiError } from '@/lib/errors';
import { verifyToken } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'غير مصرح' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    
    // Verify JWT signature and expiry
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return NextResponse.json({ message: 'رمز غير صالح أو منتهي الصلاحية' }, { status: 401 });
    }

    const user = MOCK_USERS.find(u => u.id === decoded.userId);

    if (!user) {
      return NextResponse.json({ message: 'المستخدم غير موجود' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
