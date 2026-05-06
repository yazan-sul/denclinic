import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  consumePasswordResetRateLimit,
  createPasswordResetOtp,
  deletePasswordResetOtps,
  generatePasswordResetOtp,
  normalizePasswordResetEmail,
} from '@/services/auth/passwordResetOtp';
import { isEmailDeliveryConfigured, sendPasswordResetOtpEmail } from '@/services/email/resend';

const GENERIC_SUCCESS_MESSAGE =
  'If an account exists for this email, a password reset code has been sent.';

function getClientIp(request: NextRequest) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  );
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Email is required.' },
        { status: 400 },
      );
    }

    const normalizedEmail = normalizePasswordResetEmail(email);
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(normalizedEmail)) {
      return NextResponse.json(
        { success: false, message: 'Enter a valid email address.' },
        { status: 400 },
      );
    }

    if (!isEmailDeliveryConfigured()) {
      return NextResponse.json(
        {
          success: false,
          message: 'Email setup is missing. Add RESEND_API_KEY and EMAIL_FROM to send OTP codes.',
        },
        { status: 200 },
      );
    }

    const rateLimit = consumePasswordResetRateLimit(normalizedEmail, getClientIp(request));

    if (rateLimit.limited) {
      return NextResponse.json(
        {
          success: false,
          message: 'Too many password reset requests. Try again later.',
        },
        {
          status: 429,
          headers: { 'Retry-After': String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const user = await prisma.user.findFirst({
      where: {
        email: {
          equals: normalizedEmail,
          mode: 'insensitive',
        },
      },
      select: {
        email: true,
      },
    });

    if (!user?.email) {
      return NextResponse.json(
        { success: true, message: GENERIC_SUCCESS_MESSAGE },
        { status: 200 },
      );
    }

    const otp = generatePasswordResetOtp();

    try {
      await createPasswordResetOtp(normalizedEmail, otp);
      await sendPasswordResetOtpEmail({ to: user.email, otp });
    } catch (error) {
      await deletePasswordResetOtps(normalizedEmail);
      throw error;
    }

    return NextResponse.json(
      { success: true, message: GENERIC_SUCCESS_MESSAGE },
      { status: 200 },
    );
  } catch (error) {
    console.error('Forgot password request failed:', error);
    return NextResponse.json(
      { success: false, message: 'Could not send the password reset code.' },
      { status: 500 },
    );
  }
}
