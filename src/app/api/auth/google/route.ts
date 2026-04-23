import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';
import { randomUUID } from 'crypto';

/**
 * Verifies an access_token against Google's tokeninfo endpoint
 * and returns the user's profile, or null if invalid.
 */
async function verifyGoogleAccessToken(accessToken: string): Promise<{
  sub: string;
  email: string;
  name?: string;
} | null> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v3/userinfo`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.sub || !data.email) return null;
    return data;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, profile } = body;

    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Google access token مطلوب' },
        { status: 400 }
      );
    }

    // Always re-verify the token with Google — never trust client-supplied profile alone
    const verifiedProfile = await verifyGoogleAccessToken(accessToken);

    if (!verifiedProfile) {
      return NextResponse.json(
        { success: false, message: 'فشل التحقق من Google token' },
        { status: 401 }
      );
    }

    const googleId = verifiedProfile.sub;
    const googleEmail = verifiedProfile.email;
    // Use server-verified name, fallback to client-supplied name for display
    const googleName = verifiedProfile.name || profile?.name || googleEmail.split('@')[0];

    // 1. Try to find by googleId first (fastest lookup)
    let user = await prisma.user.findFirst({ where: { googleId } });

    // 2. Fallback: find by email (handles existing non-Google accounts)
    if (!user) {
      user = await prisma.user.findFirst({
        where: {
          email: { equals: googleEmail, mode: 'insensitive' },
        },
      });
    }

    if (user) {
      // Link Google ID to existing account if not already linked
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId, emailVerified: true },
        });
      }
    } else {
      // Create a brand-new patient account via Google
      user = await prisma.user.create({
        data: {
          name: googleName,
          email: googleEmail,
          phoneNumber: `google-${googleId}`,
          roles: ['PATIENT'],
          password: hashPassword(randomUUID()), // random, unusable password
          emailVerified: true,
          googleId,
        },
      });
    }

    // Issue our own JWT and set an HTTP-only cookie
    const authToken = signToken({ userId: user.id, email: user.email || '' });

    const response = NextResponse.json(
      {
        success: true,
        message: 'تم تسجيل الدخول عبر Google بنجاح',
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          roles: user.roles,
          emailVerified: user.emailVerified,
          googleId: user.googleId,
        },
      },
      { status: 200 }
    );

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
