import { NextRequest, NextResponse } from 'next/server';
import { MOCK_USERS } from '@/lib/mockData';
import { passwordResetTokens } from '@/lib/tokenStorage';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'البريد الإلكتروني مطلوب' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = MOCK_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      // For security, don't reveal if email exists
      return NextResponse.json(
        {
          success: true,
          message: 'إذا كان هناك حساب بهذا البريد الإلكتروني، ستتلقى رابط إعادة التعيين',
        },
        { status: 200 }
      );
    }

    // Generate reset token
    const resetToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour

    passwordResetTokens[resetToken] = {
      userId: user.id,
      email: user.email,
      expiresAt,
    };

    // In production, send email with reset link:
    // const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password/${resetToken}`;
    // await sendEmail({
    //   to: email,
    //   subject: 'إعادة تعيين كلمة المرور',
    //   html: `<a href="${resetUrl}">اضغط هنا لإعادة تعيين كلمة المرور</a>`
    // });

    // For demo, log the token to console
    console.log(`[DEBUG] Password reset token for ${email}: ${resetToken}`);
    console.log(`[DEBUG] Reset link: /auth/reset-password/${resetToken}`);

    return NextResponse.json(
      {
        success: true,
        message: 'تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني',
        // In production, remove this debug token
        debugToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ في معالجة طلبك' },
      { status: 500 }
    );
  }
}
