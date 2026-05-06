import { NextRequest, NextResponse } from 'next/server';
import {
  normalizePasswordResetEmail,
  verifyPasswordResetOtp,
} from '@/services/auth/passwordResetOtp';

export async function POST(request: NextRequest) {
  try {
    const { email, otp, code } = await request.json();
    const submittedOtp = typeof otp === 'string' ? otp : code;

    if (!email || typeof email !== 'string' || typeof submittedOtp !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Email and verification code are required.' },
        { status: 400 },
      );
    }

    const normalizedEmail = normalizePasswordResetEmail(email);
    const normalizedOtp = submittedOtp.trim();

    if (!/^\d{6}$/.test(normalizedOtp)) {
      return NextResponse.json(
        { success: false, message: 'Enter the 6-digit verification code.' },
        { status: 400 },
      );
    }

    const result = await verifyPasswordResetOtp(normalizedEmail, normalizedOtp);

    if (!result.ok) {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: result.status },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Verification code confirmed.',
        resetToken: result.resetToken,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error('Verify password reset OTP failed:', error);
    return NextResponse.json(
      { success: false, message: 'Could not verify the code.' },
      { status: 500 },
    );
  }
}
