import { NextResponse } from 'next/server';
import { MOCK_USERS } from '@/lib/mockData';
import { handleApiError, ValidationError } from '@/lib/errors';
import { emailVerificationTokens } from '@/lib/tokenStorage';
import { signToken } from '@/lib/auth';
import { signupSchema } from '@/lib/validators';
import { z } from 'zod';

let userIdCounter = Math.max(...MOCK_USERS.map(u => u.id)) + 1;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate input with Zod schema
    const validated = signupSchema.parse(body);
    const { name, email, phoneNumber, password, role = 'PATIENT' } = validated;

    // Check if email already exists
    const existingUser = MOCK_USERS.find(u => u.email === email);
    if (existingUser) {
      throw new ValidationError('البريد الإلكتروني مستخدم بالفعل');
    }

    // Check if phone already exists
    const existingPhone = MOCK_USERS.find(u => u.phoneNumber === phoneNumber);
    if (existingPhone) {
      throw new ValidationError('رقم الهاتف مستخدم بالفعل');
    }

    // Create new user
    const newUser: any = {
      id: userIdCounter++,
      name,
      email,
      phoneNumber,
      password: password, // In production, hash this
      role: role as 'PATIENT' | 'DOCTOR' | 'STAFF' | 'ADMIN' | 'CLINIC_OWNER',
      avatar: `https://i.pravatar.cc/150?img=${userIdCounter % 70}`,
      emailVerified: false, // New users must verify email
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Add to mock users (in production, save to database)
    MOCK_USERS.push(newUser);

    // Generate email verification token
    const verificationToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    emailVerificationTokens[verificationToken] = {
      userId: newUser.id,
      email: newUser.email,
      expiresAt,
    };

    // In production, send verification email
    console.log(`[DEBUG] Email verification token for ${email}: ${verificationToken}`);
    console.log(`[DEBUG] Verify link: /auth/verify-email?token=${verificationToken}`);

    // Generate properly signed JWT token with HS256
    const token = signToken({ 
      userId: newUser.id, 
      email: newUser.email 
    });

    return NextResponse.json(
      {
        success: true,
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phoneNumber: newUser.phoneNumber,
          role: newUser.role,
          avatar: newUser.avatar,
          emailVerified: newUser.emailVerified,
        },
        message: 'يرجى التحقق من بريدك الإلكتروني لتفعيل حسابك',
      },
      { status: 201 }
    );
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
