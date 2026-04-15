import { NextRequest, NextResponse } from 'next/server';
import { MOCK_USERS } from '@/lib/mockData';
import { passwordResetTokens } from '@/lib/tokenStorage';
import { signToken } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, message: 'الرمز وكلمة المرور الجديدة مطلوبة' },
        { status: 400 }
      );
    }

    // Validate password
    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' },
        { status: 400 }
      );
    }

    // Check if token exists and is not expired
    const resetData = passwordResetTokens[token];

    if (!resetData) {
      return NextResponse.json(
        { success: false, message: 'رابط إعادة التعيين غير صالح أو منتهي الصلاحية' },
        { status: 400 }
      );
    }

    if (resetData.expiresAt < Date.now()) {
      delete passwordResetTokens[token];
      return NextResponse.json(
        { success: false, message: 'انتهت صلاحية رابط إعادة التعيين' },
        { status: 400 }
      );
    }

    // Find and update user password
    const user = MOCK_USERS.find((u) => u.id === resetData.userId);

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    // Update password (in real app, hash it)
    (user as any).password = newPassword;

    // Remove used token
    delete passwordResetTokens[token];

    // Generate new auth token using proper JWT
    const authToken = signToken({ 
      userId: user.id, 
      email: user.email 
    });

    const response = NextResponse.json(
      {
        success: true,
        message: 'تم تحديث كلمة المرور بنجاح',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phoneNumber: (user as any).phoneNumber,
          role: user.role,
          emailVerified: (user as any).emailVerified || false,
        },
      },
      { status: 200 }
    );

    // Set HTTP-only cookie
    response.cookies.set('authToken', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ في معالجة طلبك' },
      { status: 500 }
    );
  }
}
