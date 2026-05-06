import { NextRequest, NextResponse } from 'next/server';
import { hashPassword, verifyPassword, verifyToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    const decoded = token ? verifyToken(token) : null;

    if (!decoded?.userId) {
      return NextResponse.json(
        { success: false, message: 'You must be signed in to change your password.' },
        { status: 401 },
      );
    }

    const { currentPassword, newPassword } = await request.json();

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Current password and new password are required.' },
        { status: 400 },
      );
    }

    if (!currentPassword) {
      return NextResponse.json(
        { success: false, message: 'Current password is required.' },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { success: false, message: 'Password must be at least 8 characters.' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        password: true,
      },
    });

    if (!user || !verifyPassword(currentPassword, user.password)) {
      return NextResponse.json(
        { success: false, message: 'Current password is incorrect.' },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashPassword(newPassword) },
      select: { id: true },
    });

    return NextResponse.json(
      { success: true, message: 'Password updated successfully.' },
      { status: 200 },
    );
  } catch (error) {
    console.error('Change password failed:', error);
    return NextResponse.json(
      { success: false, message: 'Could not update the password.' },
      { status: 500 },
    );
  }
}
