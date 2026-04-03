import { NextResponse } from 'next/server';
import { MOCK_USERS } from '@/lib/mockData';
import { handleApiError } from '@/lib/errors';

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ message: 'غير مصرح' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    
    try {
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
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
    } catch (err) {
      return NextResponse.json({ message: 'رمز غير صالح' }, { status: 401 });
    }
  } catch (error) {
    return handleApiError(error);
  }
}
