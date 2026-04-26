import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ValidationError } from '@/lib/errors';
import { GuardianRelationship, GuardianStatus } from '@prisma/client';

const VALID_RELATIONSHIPS = Object.values(GuardianRelationship).filter((r) => r !== 'SELF');

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const dependents = await prisma.patientGuardian.findMany({
      where: { guardianUserId: decoded.userId },
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
      orderBy: { id: 'asc' },
    });

    return NextResponse.json({ success: true, data: dependents });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const body = await request.json();
    const { nationalId, relationship } = body;

    if (!nationalId?.trim()) throw new ValidationError('رقم الهوية مطلوب');
    if (!relationship) throw new ValidationError('الصلة مطلوبة');
    if (!VALID_RELATIONSHIPS.includes(relationship)) throw new ValidationError('الصلة غير صحيحة');

    const [dependent, guardianPatient, guardianUser] = await Promise.all([
      prisma.patient.findFirst({ where: { nationalId: nationalId.trim() } }),
      prisma.patient.findFirst({ where: { userId: decoded.userId } }),
      prisma.user.findUnique({ where: { id: decoded.userId }, select: { name: true } }),
    ]);

    if (!dependent) throw new ValidationError('هذا الشخص غير مسجل في النظام');
    if (dependent.userId === decoded.userId) throw new ValidationError('لا يمكنك إضافة نفسك');

    // Age-based relationship validation
    const guardianDob = guardianPatient?.dateOfBirth;
    const dependentDob = dependent.dateOfBirth;

    const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

    if (dependentDob) {
      const dDob = new Date(dependentDob).getTime();
      const dependentAge = (Date.now() - dDob) / YEAR_MS;

      // Dependent too young to be a parent/grandparent/spouse regardless of guardian age
      if (['PARENT', 'GRANDPARENT'].includes(relationship) && dependentAge < 18) {
        throw new ValidationError('الشخص المضاف أصغر من أن يكون والداً أو جداً');
      }
      if (relationship === 'SPOUSE' && dependentAge < 18) {
        throw new ValidationError('الشخص المضاف يجب أن يكون 18 سنة على الأقل');
      }

      // If guardian DOB available → do the full comparison
      if (guardianDob) {
        const gDob = new Date(guardianDob).getTime();
        // positive = dependent is older, negative = guardian is older
        const depOlderByYears = (gDob - dDob) / YEAR_MS;

        if (relationship === 'PARENT' && depOlderByYears < 10) {
          throw new ValidationError('الشخص المضاف يجب أن يكون أكبر منك بـ 10 سنوات على الأقل ليكون والداً');
        }
        if (relationship === 'CHILD' && depOlderByYears > -10) {
          throw new ValidationError('الشخص المضاف يجب أن يكون أصغر منك بـ 10 سنوات على الأقل ليكون ابناً');
        }
        if (relationship === 'GRANDPARENT' && depOlderByYears < 28) {
          throw new ValidationError('الشخص المضاف يجب أن يكون أكبر منك بـ 28 سنة على الأقل ليكون جداً');
        }
        if (relationship === 'SPOUSE') {
          const guardianAge = (Date.now() - gDob) / YEAR_MS;
          if (guardianAge < 18) {
            throw new ValidationError('كلا الطرفين يجب أن يكونا 18 سنة على الأقل');
          }
        }
      }
    }

    const existing = await prisma.patientGuardian.findUnique({
      where: { guardianUserId_patientId: { guardianUserId: decoded.userId, patientId: dependent.id } },
    });
    if (existing) throw new ValidationError('هذا الشخص موجود في قائمة عائلتك بالفعل');

    // If dependent has a real account → PENDING until they approve
    const dependentUser = await prisma.user.findUnique({
      where: { id: dependent.userId },
      select: { password: true },
    });
    const status: GuardianStatus = dependentUser?.password
      ? GuardianStatus.PENDING
      : GuardianStatus.APPROVED;

    const guardian = await prisma.patientGuardian.create({
      data: {
        guardianUserId: decoded.userId,
        patientId: dependent.id,
        relationship: relationship as GuardianRelationship,
        status,
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

    if (status === GuardianStatus.PENDING) {
      await prisma.notification.create({
        data: {
          userId: dependent.userId,
          type: 'GENERAL',
          title: 'طلب إضافة عائلي',
          message: `${guardianUser?.name} طلب إضافتك إلى قائمة عائلته`,
          link: '/patient/family',
        },
      });
    }

    return NextResponse.json({ success: true, data: guardian }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}