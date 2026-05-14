import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError, ConflictError } from '@/lib/errors';
import { UserRole } from '@prisma/client';
import { rejectIfDoctorMode } from '@/lib/roleGuard';
import crypto from 'crypto';

const patientSelect = {
  id: true, nationalId: true, dateOfBirth: true,
  gender: true, bloodType: true, allergies: true,
  user: { select: { id: true, name: true, phoneNumber: true, email: true } },
} as const;

// GET /api/clinic/staff-patients?search=X  — search by name / phone / nationalId (system-wide)
// GET /api/clinic/staff-patients?nationalId=X — exact match (legacy)
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

    const sp         = new URL(request.url).searchParams;
    const nationalId = sp.get('nationalId')?.trim();
    const search     = sp.get('search')?.trim();

    // Legacy: exact nationalId lookup
    if (nationalId) {
      const patient = await prisma.patient.findUnique({ where: { nationalId }, select: patientSelect });
      return NextResponse.json({ success: true, found: !!patient, data: patient ?? null });
    }

    if (!search) throw new ValidationError('search أو nationalId مطلوب');

    // Search system-wide by name, phone, or nationalId
    const patients = await prisma.patient.findMany({
      where: {
        OR: [
          { nationalId:  { contains: search } },
          { user: { name:        { contains: search, mode: 'insensitive' } } },
          { user: { phoneNumber: { contains: search } } },
        ],
      },
      select: patientSelect,
      take: 10,
      orderBy: { user: { name: 'asc' } },
    });

    return NextResponse.json({ success: true, found: patients.length > 0, data: patients });
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

    // Validation
    const nidClean = nationalId?.trim() ?? '';
    if (!nidClean) throw new ValidationError('رقم الهوية مطلوب');
    if (!/^\d+$/.test(nidClean)) throw new ValidationError('رقم الهوية يجب أن يحتوي أرقاماً فقط');
    if (nidClean.length < 7)  throw new ValidationError('رقم الهوية يجب أن يكون 7 أرقام على الأقل');
    if (nidClean.length > 12) throw new ValidationError('رقم الهوية لا يتجاوز 12 رقماً');

    const nameTrim = name?.trim() ?? '';
    if (!nameTrim) throw new ValidationError('الاسم مطلوب');
    const nameParts = nameTrim.split(/\s+/);
    if (nameParts.length !== 4) throw new ValidationError('يجب إدخال الاسم الرباعي (4 كلمات)');
    if (nameParts.some((p: string) => p.length < 2)) throw new ValidationError('كل كلمة في الاسم يجب أن تكون حرفين على الأقل');
    if (nameParts.some((p: string) => /\d/.test(p))) throw new ValidationError('يجب ألا يحتوي الاسم على أرقام');

    const phoneClean = (phoneNumber?.trim() ?? '').replace(/\D/g, '');
    if (!phoneClean) throw new ValidationError('رقم الهاتف مطلوب');
    if (phoneClean.length < 9)  throw new ValidationError('رقم الهاتف قصير جداً');
    if (phoneClean.length > 13) throw new ValidationError('رقم الهاتف طويل جداً');

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
