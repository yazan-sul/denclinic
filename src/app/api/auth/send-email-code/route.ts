import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailOtpStore } from '@/lib/tokenStorage';
import { sendOtpEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'البريد الإلكتروني مطلوب' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if email already registered
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, message: 'البريد الإلكتروني مستخدم بالفعل' },
        { status: 409 }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    emailOtpStore[normalizedEmail] = {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
    };

    await sendOtpEmail({ to: normalizedEmail, otp });

    return NextResponse.json(
      { success: true, message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Send email code error:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ في إرسال الرمز' },
      { status: 500 }
    );
  }
}
