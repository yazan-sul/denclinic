import { NextRequest, NextResponse } from 'next/server';
import { MOCK_USERS } from '@/lib/mockData';
import { emailVerificationTokens } from '@/lib/tokenStorage';

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
          message: 'إذا كان هناك حساب بهذا البريد الإلكتروني، ستتلقى رابط التحقق',
        },
        { status: 200 }
      );
    }

    // Check if already verified
    if ((user as any).emailVerified) {
      return NextResponse.json(
        {
          success: true,
          message: 'البريد الإلكتروني مُتحقق منه بالفعل',
        },
        { status: 200 }
      );
    }

    // Generate verification token
    const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    emailVerificationTokens[verificationToken] = {
      userId: user.id,
      email: user.email,
      expiresAt,
    };

    // In production, send email with verification link:
    // const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify-email?token=${verificationToken}`;
    // await sendEmail({
    //   to: email,
    //   subject: 'تحقق من بريدك الإلكتروني',
    //   html: `<a href="${verifyUrl}">اضغط هنا للتحقق من بريدك الإلكتروني</a>`
    // });

    // For demo, log the token to console
    console.log(`[DEBUG] Email verification token for ${email}: ${verificationToken}`);
    console.log(`[DEBUG] Verify link: /auth/verify-email?token=${verificationToken}`);

    return NextResponse.json(
      {
        success: true,
        message: 'تم إرسال رابط التحقق إلى بريدك الإلكتروني',
        // In production, remove this debug token
        debugToken: process.env.NODE_ENV === 'development' ? verificationToken : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Send verification error:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ في معالجة طلبك' },
      { status: 500 }
    );
  }
}
