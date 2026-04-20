import { randomBytes } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailVerificationTokens } from '@/lib/tokenStorage';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'البريد الإلكتروني مطلوب' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true, email: true, name: true, emailVerified: true },
    });

    if (!user || !user.email) {
      return NextResponse.json(
        { success: true, message: 'إذا كان هناك حساب بهذا البريد الإلكتروني، ستتلقى رابط التحقق' },
        { status: 200 }
      );
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { success: true, message: 'البريد الإلكتروني مُتحقق منه بالفعل' },
        { status: 200 }
      );
    }

    const verificationToken = randomBytes(32).toString('hex');
    emailVerificationTokens[verificationToken] = {
      userId: user.id,
      email: user.email,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    };

    const firstName = user.name?.split(' ')[0] || 'مستخدم';
    await sendVerificationEmail({ to: user.email, name: firstName, verificationToken });

    return NextResponse.json(
      { success: true, message: 'تم إرسال رابط التحقق إلى بريدك الإلكتروني' },
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
