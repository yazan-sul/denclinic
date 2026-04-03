import { NextResponse } from 'next/server';
import { MOCK_USERS } from '@/lib/mockData';
import { handleApiError, ValidationError } from '@/lib/errors';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      throw new ValidationError('البريد الإلكتروني وكلمة المرور مطلوبان');
    }

    // Find user by email in mock data
    const user = MOCK_USERS.find(u => u.email === email);

    if (!user) {
      throw new ValidationError('بيانات تسجيل الدخول غير صحيحة');
    }

    // Simple password check (in production, compare hashed passwords)
    // For demo, if email exists, we accept it
    if (user.password !== password && password !== 'password') {
      throw new ValidationError('بيانات تسجيل الدخول غير صحيحة');
    }

    // Generate mock token (in production, use JWT)
    const token = Buffer.from(JSON.stringify({ userId: user.id, email: user.email })).toString(
      'base64'
    );

    return NextResponse.json(
      {
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          avatar: user.avatar,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
