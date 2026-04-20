import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, ValidationError } from '@/lib/errors';
import { verifiedEmailSet } from '@/lib/tokenStorage';
import { signToken, hashPassword, encryptUsername } from '@/lib/auth';
import { signupSchema } from '@/lib/validators';
import { sendWelcomeEmail } from '@/lib/email';
import { z } from 'zod';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const validated = signupSchema.parse(body);
    const {
      firstName, fatherName, grandfatherName, familyName,
      username, email, phoneNumber, dateOfBirth, nationalId, bloodType, gender,
      password,
    } = validated;

    const name = `${firstName} ${fatherName} ${grandfatherName} ${familyName}`;

    const encryptedUsername = encryptUsername(username);
    const existingUsername = await prisma.user.findUnique({ where: { username: encryptedUsername } });
    if (existingUsername) {
      throw new ValidationError('اسم المستخدم مستخدم بالفعل، اختر اسماً آخر');
    }

    const normalizedEmail = email?.trim().toLowerCase() || undefined;

    let emailIsVerified = false;
    if (normalizedEmail) {
      const verifiedUntil = verifiedEmailSet[normalizedEmail];
      if (verifiedUntil && Date.now() <= verifiedUntil) {
        emailIsVerified = true;
        delete verifiedEmailSet[normalizedEmail];
      }
    }

    if (emailIsVerified && normalizedEmail) {
      const existingEmail = await prisma.user.findUnique({ where: { email: normalizedEmail } });
      if (existingEmail) {
        throw new ValidationError('البريد الإلكتروني مستخدم بالفعل');
      }
    }

    const hashedPassword = hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name,
        username: encryptedUsername,
        email: emailIsVerified ? normalizedEmail : undefined,
        emailVerified: emailIsVerified,
        phoneNumber,
        password: hashedPassword,
        // roles defaults to [PATIENT] via schema
        patient: {
          create: {
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
            gender: gender || null,
            bloodType: bloodType || null,
            nationalId: nationalId || null,
          },
        },
      },
      include: { patient: true },
    });

    if (emailIsVerified && normalizedEmail) {
      await sendWelcomeEmail({ to: normalizedEmail, name: firstName });
    }

    const token = signToken({ userId: newUser.id, email: newUser.email ?? undefined });

    const message = emailIsVerified
      ? 'تم إنشاء حسابك بنجاح!'
      : normalizedEmail
        ? 'تم إنشاء حسابك! يرجى التحقق من بريدك الإلكتروني لتفعيل حسابك'
        : 'تم إنشاء حسابك بنجاح!';

    const response = NextResponse.json(
      {
        success: true,
        message,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          phoneNumber: newUser.phoneNumber,
          roles: newUser.roles,
          emailVerified: emailIsVerified,
        },
      },
      { status: 201 }
    );

    response.cookies.set('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/',
    });

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = (error.issues?.[0] as any)?.message || 'بيانات غير صحيحة';
      return NextResponse.json({ success: false, message }, { status: 400 });
    }
    return handleApiError(error);
  }
}
