import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';
import { randomUUID } from 'crypto';

// Helper function to verify Google ID token
// In production, use google-auth-library for proper verification
async function verifyGoogleToken(idToken: string) {
  // For demo purposes, we'll do a basic validation
  // In production, use: https://www.npmjs.com/package/google-auth-library
  try {
    // Decode the token (base64)
    const parts = idToken.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // In production, properly verify the signature using Google's public keys
    // For now, just decode and validate basic structure
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    // Verify token hasn't expired
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    // Return the decoded payload
    return payload;
  } catch (error) {
    console.error('Error verifying Google token:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json(
        { success: false, message: 'Google ID token مطلوب' },
        { status: 400 }
      );
    }

    // Verify the Google token
    const googlePayload = await verifyGoogleToken(idToken);

    if (!googlePayload) {
      return NextResponse.json(
        { success: false, message: 'Google ID token غير صحيح أو منتهي الصلاحية' },
        { status: 400 }
      );
    }

    // Extract Google user info
    const googleEmail = googlePayload.email;
    const googleId = googlePayload.sub;
    const googleName = googlePayload.name;
    const googlePicture = googlePayload.picture;

    if (!googleEmail || !googleId) {
      return NextResponse.json(
        { success: false, message: 'بيانات Google غير كاملة' },
        { status: 400 }
      );
    }

    // Check if user exists with this email
    let user = await prisma.user.findFirst({
      where: {
        email: {
          equals: googleEmail,
          mode: 'insensitive',
        },
      },
    });

    if (user) {
      // Link Google account to existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId,
          emailVerified: true,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          name: googleName || googleEmail.split('@')[0],
          email: googleEmail,
          phoneNumber: `google-${googleId}`,
          role: 'PATIENT',
          password: hashPassword(randomUUID()),
          emailVerified: true,
          googleId,
        },
      });
    }

    // Generate auth token using proper JWT
    const authToken = signToken({ 
      userId: user.id, 
      email: user.email || '' 
    });

    const response = NextResponse.json(
      {
        success: true,
        message: 'تم تسجيل الدخول عبر Google بنجاح',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          emailVerified: user.emailVerified,
          googleId: user.googleId,
        },
      },
      { status: 200 }
    );

    // Set HTTP-only cookie
    response.cookies.set('authToken', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ في معالجة طلبك' },
      { status: 500 }
    );
  }
}
