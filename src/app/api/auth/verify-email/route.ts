import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailVerificationTokens } from '@/lib/tokenStorage';

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'رمز التحقق مطلوب' },
        { status: 400 }
      );
    }

    // Check if token exists and is not expired
    const verification = emailVerificationTokens[token];

    if (!verification) {
      return NextResponse.json(
        { success: false, message: 'رمز التحقق غير صالح أو منتهي الصلاحية' },
        { status: 400 }
      );
    }

    if (verification.expiresAt < Date.now()) {
      delete emailVerificationTokens[token];
      return NextResponse.json(
        { success: false, message: 'انتهت صلاحية رمز التحقق' },
        { status: 400 }
      );
    }

    // Find and update user email verification
    const user = await prisma.user.findUnique({
      where: { id: verification.userId },
    });

    if (!user || !user.email) {
      return NextResponse.json(
        { success: false, message: 'المستخدم غير موجود' },
        { status: 404 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });

    // Remove used token
    delete emailVerificationTokens[token];

    return NextResponse.json(
      {
        success: true,
        message: 'تم التحقق من البريد الإلكتروني بنجاح',
        user: {
          id: updatedUser.id,
          name: updatedUser.name,
          email: updatedUser.email,
          phoneNumber: updatedUser.phoneNumber,
          roles: updatedUser.roles,
          emailVerified: true,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ في معالجة طلبك' },
      { status: 500 }
    );
  }
}
