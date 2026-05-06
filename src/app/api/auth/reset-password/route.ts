import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import {
  findValidPasswordResetToken,
  normalizePasswordResetEmail,
} from '@/services/auth/passwordResetOtp';

export async function POST(request: NextRequest) {
  try {
    const { email, newPassword, resetToken } = await request.json();

    if (!email || !newPassword || !resetToken) {
      return NextResponse.json(
        { success: false, message: 'Email, reset token, and new password are required.' },
        { status: 400 },
      );
    }

    if (typeof email !== 'string' || typeof newPassword !== 'string' || typeof resetToken !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Invalid password reset request.' },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 8 characters.' },
        { status: 400 },
      );
    }

    const normalizedEmail = normalizePasswordResetEmail(email);
    const resetRecord = await findValidPasswordResetToken(normalizedEmail, resetToken);

    if (!resetRecord) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired password reset token.' },
        { status: 400 },
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
        id: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Invalid or expired password reset token.' },
        { status: 400 },
      );
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashPassword(newPassword) },
        select: { id: true },
      }),
      prisma.passwordResetOtp.deleteMany({
        where: { email: normalizedEmail },
      }),
    ]);

    return NextResponse.json(
      { success: true, message: 'Password updated successfully. Please sign in again.' },
      { status: 200 },
    );
  } catch (error) {
    console.error('Reset password failed:', error);
    return NextResponse.json(
      { success: false, message: 'Could not reset the password.' },
      { status: 500 },
    );
  }
}
