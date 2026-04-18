import { NextRequest, NextResponse } from 'next/server';
import { emailOtpStore } from '@/lib/tokenStorage';
import { sendOtpEmail } from '@/lib/email';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, message: 'البريد الإلكتروني مطلوب' }, { status: 400 });
    }

    const normalized = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalized)) {
      return NextResponse.json({ success: false, message: 'البريد الإلكتروني غير صحيح' }, { status: 400 });
    }

    // Check if email already in use
    const existingUser = await prisma.user.findUnique({ where: { email: normalized } });
    if (existingUser) {
      return NextResponse.json({ success: false, message: 'البريد الإلكتروني مستخدم بالفعل، يرجى استخدام بريد آخر' }, { status: 409 });
    }

    // Rate-limit: don't resend if unexpired code was sent within the last 60 seconds
    const existing = emailOtpStore[normalized];
    if (existing && existing.expiresAt - Date.now() > 9 * 60 * 1000) {
      return NextResponse.json({ success: false, message: 'تم إرسال رمز مسبقاً، يرجى الانتظار دقيقة قبل إعادة الإرسال' }, { status: 429 });
    }

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    emailOtpStore[normalized] = { otp, expiresAt: Date.now() + 10 * 60 * 1000 };

    await sendOtpEmail({ to: normalized, otp });

    return NextResponse.json({
      success: true,
      message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني',
    });
  } catch {
    return NextResponse.json({ success: false, message: 'حدث خطأ، يرجى المحاولة لاحقاً' }, { status: 500 });
  }
}
