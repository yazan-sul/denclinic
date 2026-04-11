import { NextResponse } from 'next/server';
import { MOCK_USERS } from '@/lib/mockData';
import { handleApiError, ValidationError } from '@/lib/errors';
import { signToken } from '@/lib/auth';
import { loginSchema } from '@/lib/validators';
import { z } from 'zod';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate input with Zod schema
    const validated = loginSchema.parse(body);
    const { email, password } = validated;

    // Find user by email in mock data
    const user = MOCK_USERS.find(u => u.email === email);

    if (!user) {
      throw new ValidationError('بيانات تسجيل الدخول غير صحيحة');
    }

    // Simple password check (in production, compare hashed passwords)
    // For demo, if email exists, we accept it
    if (user.password !== password && password !== 'password') {
      throw new ValidationError('بيانات تسجيل الدخول غير صحيحة');
    }

    // Generate properly signed JWT token with HS256
    const token = signToken({ 
      userId: user.id, 
      email: user.email 
    });

    return NextResponse.json(
      {
        success: true,
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          avatar: user.avatar,
        },
      },
      { status: 200 }
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
