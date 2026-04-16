import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, ValidationError } from '@/lib/errors';
import { emailVerificationTokens, smsOtpStore, verifiedEmailSet } from '@/lib/tokenStorage';
import { signToken, hashPassword } from '@/lib/auth';
import { signupSchema } from '@/lib/validators';
import { z } from 'zod';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate input with Zod schema
    const validated = signupSchema.parse(body);
    const {
      firstName, fatherName, grandfatherName, familyName,
      username, email, phoneNumber, dateOfBirth, nationalId, bloodType, gender,
      password, role = 'PATIENT', smsOtp,
    } = validated;

    // Verify SMS OTP
    const otpEntry = smsOtpStore[phoneNumber];
    if (!otpEntry) {
      throw new ValidationError('لم يتم إرسال رمز التحقق، يرجى إعادة المحاولة');
    }
    if (Date.now() > otpEntry.expiresAt) {
      delete smsOtpStore[phoneNumber];
      throw new ValidationError('انتهت صلاحية رمز التحقق، يرجى طلب رمز جديد');
    }
    if (otpEntry.otp !== smsOtp) {
      throw new ValidationError('رمز التحقق غير صحيح');
    }
    // Mark OTP as used
    delete smsOtpStore[phoneNumber];

    // Build full name from name parts
    const name = `${firstName} ${fatherName} ${grandfatherName} ${familyName}`;

    // Check if username already exists
    const existingUsername = await prisma.user.findUnique({ where: { username } });
    if (existingUsername) {
      throw new ValidationError('اسم المستخدم مستخدم بالفعل، اختر اسماً آخر');
    }

    // Normalize email and check if it was verified via OTP
    const normalizedEmail = email ? email.trim().toLowerCase() : undefined;
    let emailIsVerified = false;
    if (normalizedEmail) {
      const verifiedUntil = verifiedEmailSet[normalizedEmail];
      if (verifiedUntil && Date.now() <= verifiedUntil) {
        emailIsVerified = true;
        delete verifiedEmailSet[normalizedEmail];
      }
    }

    // Check if email already exists in database
    if (normalizedEmail) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existingEmail) {
        throw new ValidationError('البريد الإلكتروني مستخدم بالفعل');
      }
    }

    // Hash the password
    const hashedPassword = hashPassword(password);

    // Create user with patient profile in a transaction
    const newUser = await prisma.user.create({
      data: {
        name,
        username,
        email: emailIsVerified ? normalizedEmail : undefined,
        phoneNumber,
        password: hashedPassword,
        role: (role as 'PATIENT' | 'DOCTOR' | 'STAFF' | 'ADMIN' | 'CLINIC_OWNER') || 'PATIENT',
        // Create patient profile if role is PATIENT
        ...(role === 'PATIENT' && {
          patient: {
            create: {
              dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
              gender: gender || null,
              bloodType: bloodType || null,
              nationalId: nationalId || null,
            },
          },
        }),
      },
      include: {
        patient: true,
      },
    });

    // Update emailVerified via raw SQL if email was OTP-verified
    if (emailIsVerified && newUser.id) {
      await prisma.$executeRaw`UPDATE "User" SET "emailVerified" = true WHERE id = ${newUser.id}`;
    }

    // Generate email verification token
    const verificationToken = 
      Math.random().toString(36).substring(2, 15) + 
      Math.random().toString(36).substring(2, 15);
    const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    emailVerificationTokens[verificationToken] = {
      userId: newUser.id,
      email: newUser.email!,
      expiresAt,
    };

    // In production, send verification email
    console.log(`[DEBUG] Email verification token for ${email}: ${verificationToken}`);
    console.log(`[DEBUG] Verify link: /auth/verify-email?token=${verificationToken}`);

    // Generate JWT token
    const token = signToken({ 
      userId: newUser.id, 
      email: newUser.email! 
    });

    const response = NextResponse.json(
      {
        success: true,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phoneNumber: newUser.phoneNumber,
          role: newUser.role,
          emailVerified: email ? false : null,
        },
        message: 'يرجى التحقق من بريدك الإلكتروني لتفعيل حسابك',
      },
      { status: 201 }
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
      console.error('[Signup] Zod validation errors:', JSON.stringify(error.issues, null, 2));
      return NextResponse.json(
        { success: false, message },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}
