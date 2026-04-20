import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, ValidationError } from '@/lib/errors';
import { signToken, verifyPassword } from '@/lib/auth';
import { loginSchema } from '@/lib/validators';
import { verify } from '@node-rs/argon2';
import { z } from 'zod';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate input with Zod schema
    const validated = loginSchema.parse(body);
    const { email, password } = validated;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        patient: true,
        doctorProfile: true,
      },
    });

    if (!user) {
      throw new ValidationError('بيانات تسجيل الدخول غير صحيحة');
    }

    let isPasswordValid = false;

    // Try Argon2 verification first (used in seed)
    if (user.password.startsWith('$argon2')) {
      try {
        isPasswordValid = await verify(user.password, password);
      } catch (argon2Error) {
        console.warn('Argon2 verification failed:', argon2Error);
        isPasswordValid = false;
      }
    } else {
      // Fall back to PBKDF2 verification
      isPasswordValid = verifyPassword(password, user.password);
    }

    if (!isPasswordValid) {
      throw new ValidationError('بيانات تسجيل الدخول غير صحيحة');
    }

    const token = signToken({ 
      userId: user.id, 
      email: user.email || '' 
    });

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          name: user.name || '',
          email: user.email || '',
          phoneNumber: user.phoneNumber || '',
          roles: user.roles,
          ...(user.avatar && { avatar: user.avatar }),
        },
      },
      { status: 200 }
    );

    // Set HTTP-only cookie
    response.cookies.set('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues?.[0];
      const message = (firstError as any)?.message || 'بيانات غير صحيحة';
      return NextResponse.json(
        { success: false, message },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}
