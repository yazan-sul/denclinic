import { NextRequest, NextResponse } from 'next/server';
import { MOCK_USERS } from '@/lib/mockData';

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
    let user: any = MOCK_USERS.find((u) => u.email.toLowerCase() === googleEmail.toLowerCase());

    if (user) {
      // Link Google account to existing user
      user.googleId = googleId;
      user.emailVerified = true; // Google verifies emails
    } else {
      // Create new user from Google data
      const newUserId = Math.max(...MOCK_USERS.map((u) => u.id), 0) + 1;

      user = {
        id: newUserId,
        name: googleName || googleEmail.split('@')[0],
        email: googleEmail,
        phone: '',
        role: 'PATIENT', // Default role for new Google users
        password: '', // Empty password for OAuth users
        emailVerified: true, // Google verifies emails
        googleId: googleId,
      };

      MOCK_USERS.push(user);
    }

    // Generate auth token
    const authToken = Buffer.from(JSON.stringify({ userId: user.id, email: user.email })).toString('base64');

    return NextResponse.json(
      {
        success: true,
        message: 'تم تسجيل الدخول عبر Google بنجاح',
        token: authToken,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          emailVerified: (user as any).emailVerified || false,
          googleId: (user as any).googleId,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Google auth error:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ في معالجة طلبك' },
      { status: 500 }
    );
  }
}
