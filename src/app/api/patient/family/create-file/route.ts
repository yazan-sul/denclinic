import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ValidationError, ForbiddenError } from '@/lib/errors';
import { GuardianRelationship } from '@prisma/client';

const VALID_RELATIONSHIPS = Object.values(GuardianRelationship).filter((r) => r !== 'SELF');
const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const body = await request.json();
    const { nationalId, name, dateOfBirth, gender, bloodType, relationship, phone } = body;

    if (!nationalId?.trim()) throw new ValidationError('رقم الهوية مطلوب');
    if (!name?.trim()) throw new ValidationError('الاسم مطلوب');
    if (!dateOfBirth) throw new ValidationError('تاريخ الميلاد مطلوب');
    if (!relationship) throw new ValidationError('الصلة مطلوبة');
    if (!VALID_RELATIONSHIPS.includes(relationship)) throw new ValidationError('الصلة غير صحيحة');

    // Check nationalId not already in use
    const existing = await prisma.patient.findFirst({
      where: { nationalId: nationalId.trim() },
    });
    if (existing) throw new ValidationError('يوجد ملف طبي مسجل بهذا الرقم بالفعل');

    // Get guardian's patient info for age validation
    const guardianPatient = await prisma.patient.findFirst({
      where: { userId: decoded.userId },
      select: { id: true, dateOfBirth: true },
    });

    // Guardian age checks
    if (guardianPatient?.dateOfBirth) {
      const guardianAge = (Date.now() - new Date(guardianPatient.dateOfBirth).getTime()) / YEAR_MS;
      if (guardianAge < 18 && relationship === 'CHILD') {
        throw new ForbiddenError('لا يمكنك إضافة شخص كابن لك وأنت دون 18 سنة');
      }
      if (guardianAge < 18 && relationship === 'SPOUSE') {
        throw new ForbiddenError('لا يمكنك إضافة شخص كزوج/زوجة وأنت دون 18 سنة');
      }
    }

    // Dependent age checks
    const depAge = (Date.now() - new Date(dateOfBirth).getTime()) / YEAR_MS;
    if (relationship === 'GRANDPARENT' && depAge < 35) {
      throw new ValidationError('الجد أو الجدة يجب أن يكون عمره 35 سنة على الأقل');
    }
    if (relationship === 'PARENT' && depAge < 18) {
      throw new ValidationError('الوالد يجب أن يكون عمره 18 سنة على الأقل');
    }
    if (relationship === 'SPOUSE' && depAge < 18) {
      throw new ValidationError('الزوج أو الزوجة يجب أن يكون عمره 18 سنة على الأقل');
    }

    // Create file-only user + patient record + guardian relationship in one transaction
    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name: name.trim(),
          password: '',
          phoneNumber: phone?.trim() || 'N/A',
          patient: {
            create: {
              nationalId: nationalId.trim(),
              dateOfBirth: new Date(dateOfBirth),
              gender: gender || null,
              bloodType: bloodType || null,
            },
          },
        },
        include: { patient: true },
      });

      const guardian = await tx.patientGuardian.create({
        data: {
          guardianUserId: decoded.userId,
          patientId: newUser.patient!.id,
          relationship: relationship as GuardianRelationship,
          status: 'APPROVED',
          dependentInitiated: false,
        },
        include: {
          dependentPatient: {
            include: {
              user: { select: { name: true, avatar: true } },
              appointments: {
                orderBy: { appointmentDate: 'desc' },
                take: 1,
                select: { appointmentDate: true },
              },
            },
          },
        },
      });

      return guardian;
    });

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}