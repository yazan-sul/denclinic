import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError, ConflictError } from '@/lib/errors';
import { UserRole } from '@prisma/client';
import { rejectIfDoctorMode } from '@/lib/roleGuard';
import crypto from 'crypto';

// GET /api/clinic/staff-patients?nationalId=X
// Find a patient by national ID
export async function GET(request: NextRequest) {
  try {
    rejectIfDoctorMode(request);

    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { roles: true, staffProfiles: { select: { clinicId: true } } },
    });

    if (!user) throw new UnauthorizedError('غير مصرح');

    const roles = user.roles as UserRole[];
    if (!roles.includes('STAFF') && !roles.includes('CLINIC_OWNER') && !roles.includes('ADMIN')) {
      throw new ForbiddenError('لا تملك صلاحية البحث عن المرضى');
    }

    const nationalId = new URL(request.url).searchParams.get('nationalId')?.trim();
    if (!nationalId) throw new ValidationError('رقم الهوية مطلوب');

    const patient = await prisma.patient.findUnique({
      where: { nationalId },
      select: {
        id: true,
        nationalId: true,
        dateOfBirth: true,
        gender: true,
        bloodType: true,
        allergies: true,
        user: {
          select: { id: true, name: true, phoneNumber: true, email: true },
        },
      },
    });

    if (!patient) {
      return NextResponse.json({ success: true, found: false, data: null });
    }

    return NextResponse.json({ success: true, found: true, data: patient });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/clinic/staff-patients
// Create a new patient profile (if phone not in system) or link nationalId to existing user
export async function POST(request: NextRequest) {
  try {
    rejectIfDoctorMode(request);

    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { roles: true },
    });

    if (!user) throw new UnauthorizedError('غير مصرح');

    const roles = user.roles as UserRole[];
    if (!roles.includes('STAFF') && !roles.includes('CLINIC_OWNER') && !roles.includes('ADMIN')) {
      throw new ForbiddenError('لا تملك صلاحية إنشاء ملفات المرضى');
    }

    const body = await request.json();
    const { nationalId, name, phoneNumber, dateOfBirth, gender, bloodType, allergies } = body;

    if (!nationalId?.trim()) throw new ValidationError('رقم الهوية مطلوب');
    if (!name?.trim())       throw new ValidationError('الاسم مطلوب');
    if (!phoneNumber?.trim()) throw new ValidationError('رقم الهاتف مطلوب');

    // Check if nationalId already exists
    const existingByNid = await prisma.patient.findUnique({ where: { nationalId: nationalId.trim() } });
    if (existingByNid) throw new ConflictError('رقم الهوية مسجّل مسبقاً');

    // Check if a user with this phone exists
    const existingUser = await prisma.user.findFirst({
      where: { phoneNumber: phoneNumber.trim() },
      include: { patient: true },
    });

    let patient;

    if (existingUser) {
      if (existingUser.patient) {
        // User has a patient profile — update nationalId if missing
        if (existingUser.patient.nationalId && existingUser.patient.nationalId !== nationalId.trim()) {
          throw new ConflictError('هذا المستخدم لديه رقم هوية مختلف مسجّل');
        }
        patient = await prisma.patient.update({
          where: { id: existingUser.patient.id },
          data: {
            nationalId:  nationalId.trim(),
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            gender:      gender      || undefined,
            bloodType:   bloodType   || undefined,
            allergies:   allergies   || undefined,
          },
          select: {
            id: true, nationalId: true, dateOfBirth: true, gender: true,
            user: { select: { id: true, name: true, phoneNumber: true } },
          },
        });
      } else {
        // User exists but has no patient profile — create one
        patient = await prisma.patient.create({
          data: {
            userId:      existingUser.id,
            nationalId:  nationalId.trim(),
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            gender:      gender      || undefined,
            bloodType:   bloodType   || undefined,
            allergies:   allergies   || undefined,
          },
          select: {
            id: true, nationalId: true, dateOfBirth: true, gender: true,
            user: { select: { id: true, name: true, phoneNumber: true } },
          },
        });
      }
    } else {
      // No user with this phone — create user + patient
      const tempPassword = crypto.randomBytes(16).toString('hex');
      const newUser = await prisma.user.create({
        data: {
          name:        name.trim(),
          phoneNumber: phoneNumber.trim(),
          password:    tempPassword,
          roles:       ['PATIENT'],
          patient: {
            create: {
              nationalId:  nationalId.trim(),
              dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
              gender:      gender      || undefined,
              bloodType:   bloodType   || undefined,
              allergies:   allergies   || undefined,
            },
          },
        },
        include: { patient: { select: { id: true, nationalId: true, dateOfBirth: true, gender: true } } },
      });
      patient = {
        ...newUser.patient,
        user: { id: newUser.id, name: newUser.name, phoneNumber: newUser.phoneNumber },
      };
    }

    return NextResponse.json({ success: true, data: patient }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH /api/clinic/staff-patients
// Update an existing patient profile
export async function PATCH(request: NextRequest) {
  try {
    rejectIfDoctorMode(request);

    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { roles: true },
    });

    if (!user) throw new UnauthorizedError('غير مصرح');

    const roles = user.roles as UserRole[];
    if (!roles.includes('STAFF') && !roles.includes('CLINIC_OWNER') && !roles.includes('ADMIN')) {
      throw new ForbiddenError('لا تملك صلاحية تعديل ملفات المرضى');
    }

    const body = await request.json();
    const { patientId, name, phoneNumber, dateOfBirth, gender, bloodType, allergies } = body;

    if (!patientId) throw new ValidationError('معرّف المريض مطلوب');

    const existing = await prisma.patient.findUnique({
      where: { id: Number(patientId) },
      select: { userId: true },
    });
    if (!existing) throw new ValidationError('المريض غير موجود');

    await prisma.$transaction([
      prisma.patient.update({
        where: { id: Number(patientId) },
        data: {
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
          gender:      gender      ?? undefined,
          bloodType:   bloodType   ?? undefined,
          allergies:   allergies   ?? undefined,
        },
      }),
      ...(name || phoneNumber ? [
        prisma.user.update({
          where: { id: existing.userId },
          data: {
            ...(name        ? { name: name.trim() }               : {}),
            ...(phoneNumber ? { phoneNumber: phoneNumber.trim() } : {}),
          },
        }),
      ] : []),
    ]);

    const updated = await prisma.patient.findUnique({
      where: { id: Number(patientId) },
      select: {
        id: true, nationalId: true, dateOfBirth: true, gender: true, bloodType: true, allergies: true,
        user: { select: { id: true, name: true, phoneNumber: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
