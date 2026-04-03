import { NextRequest, NextResponse } from 'next/server';
import { MOCK_USERS } from '@/lib/mockData';
import { emailVerificationTokens } from '@/lib/tokenStorage';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'رمز التحقق مطلوب' },
        { status: 400 }
      );
    }

    // Check if token exists and is not expired
    const verification = emailVerificationTokens[token];

    if (!verification) {
      return NextResponse.json(
        { success: false, message: 'رمز التحقق غير صالح أو منتهي الصلاحية' },
        { status: 400 }
      );
    }

    if (verification.expiresAt < Date.now()) {
      delete emailVerificationTokens[token];
      return NextResponse.json(
        { success: false, message: 'انتهت صلاحية رمز التحقق' },
        { status: 400 }
      );
    }

    // Find and update user email verification
    const user = MOCK_USERS.find((u) => u.id === verification.userId);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    // Mark email as verified
    (user as any).emailVerified = true;

    // Remove used token
    delete emailVerificationTokens[token];

    return NextResponse.json(
      {
        success: true,
        message: 'تم التحقق من البريد الإلكتروني بنجاح',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phoneNumber: (user as any).phoneNumber,
          role: user.role,
          emailVerified: true,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ في معالجة طلبك' },
      { status: 500 }
    );
  }
}
