import { NextRequest, NextResponse } from 'next/server';
import { emailOtpStore, verifiedEmailSet } from '@/lib/tokenStorage';

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { success: false, message: 'البريد الإلكتروني والرمز مطلوبان' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const entry = emailOtpStore[normalizedEmail];

    if (!entry) {
      return NextResponse.json(
        { success: false, message: 'لم يتم إرسال رمز لهذا البريد، أرسل الرمز أولاً' },
        { status: 400 }
      );
    }

    if (Date.now() > entry.expiresAt) {
      delete emailOtpStore[normalizedEmail];
      return NextResponse.json(
        { success: false, message: 'انتهت صلاحية الرمز، أرسل رمزاً جديداً' },
        { status: 400 }
      );
    }

    if (entry.otp !== code.toString().trim()) {
      return NextResponse.json(
        { success: false, message: 'رمز التحقق غير صحيح' },
        { status: 400 }
      );
    }

    // Mark email as verified for 15 minutes (enough time to complete signup)
    delete emailOtpStore[normalizedEmail];
    verifiedEmailSet[normalizedEmail] = Date.now() + 15 * 60 * 1000;

    return NextResponse.json(
      { success: true, message: 'تم التحقق من البريد الإلكتروني بنجاح' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Verify email code error:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ في التحقق من الرمز' },
      { status: 500 }
    );
  }
}
