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
      where: { guardianUserId: decoded.userId, dependentInitiated: false },
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

    // Guardian age checks (regardless of dependent age)
    if (guardianDob) {
      const guardianAge = (Date.now() - new Date(guardianDob).getTime()) / YEAR_MS;
      if (guardianAge < 18 && relationship === 'CHILD') {
        throw new ValidationError('لا يمكنك إضافة شخص كابن لك وأنت دون 18 سنة');
      }
      if (guardianAge < 18 && relationship === 'SPOUSE') {
        throw new ValidationError('لا يمكنك إضافة شخص كزوج/زوجة وأنت دون 18 سنة');
      }
    }

    if (dependentDob) {
      const dDob = new Date(dependentDob).getTime();
      const dependentAge = (Date.now() - dDob) / YEAR_MS;

      // Dependent too young to be a parent/grandparent/spouse
      if (relationship === 'GRANDPARENT' && dependentAge < 35) {
        throw new ValidationError('الجد أو الجدة يجب أن يكون عمره 35 سنة على الأقل');
      }
      if (relationship === 'PARENT' && dependentAge < 18) {
        throw new ValidationError('الوالد يجب أن يكون عمره 18 سنة على الأقل');
      }
      if (relationship === 'SPOUSE' && dependentAge < 18) {
        throw new ValidationError('الزوج أو الزوجة يجب أن يكون عمره 18 سنة على الأقل');
      }

      // Full comparison when both DOBs available
      if (guardianDob) {
        const gDob = new Date(guardianDob).getTime();
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

    const { direction = 'add-dependent' } = body as { direction?: 'add-dependent' | 'add-guardian' };

    const dependentUser = await prisma.user.findUnique({
      where: { id: dependent.userId },
      select: { password: true },
    });

    // ── Direction: I want to be their guardian ──────────────────────────────
    if (direction === 'add-guardian') {
      // They must have an account to approve
      if (!dependentUser?.password) throw new ValidationError('هذا الشخص ليس لديه حساب في النظام ولا يمكنه الموافقة على الطلب');

      // They must be 18+ to be my guardian
      if (dependentDob) {
        const theirAge = (Date.now() - new Date(dependentDob).getTime()) / YEAR_MS;
        if (theirAge < 18) throw new ValidationError('لا يمكن لشخص دون 18 سنة أن يكون ولي أمر');
      }

      // Check no existing record
      const existingRev = await prisma.patientGuardian.findUnique({
        where: { guardianUserId_patientId: { guardianUserId: dependent.userId, patientId: guardianPatient?.id ?? -1 } },
      });
      if (existingRev) throw new ValidationError('هذا الشخص موجود في قائمة مسؤوليك بالفعل');

      const myPatient = guardianPatient;
      if (!myPatient) throw new ValidationError('لم يتم العثور على ملفك الطبي');

      await prisma.patientGuardian.create({
        data: {
          guardianUserId: dependent.userId,
          patientId: myPatient.id,
          relationship: relationship as GuardianRelationship,
          status: GuardianStatus.PENDING,
          dependentInitiated: true,
        },
      });

      await prisma.notification.create({
        data: {
          userId: dependent.userId,
          type: 'GENERAL',
          title: 'طلب ولاية',
          message: `${guardianUser?.name} يطلبك لتكون ولي أمره`,
          link: '/patient/family',
        },
      });

      return NextResponse.json({ success: true, direction: 'add-guardian', status: 'PENDING' }, { status: 201 });
    }

    // ── Direction: I want to be their guardian (add-dependent) ──────────────
    const existing = await prisma.patientGuardian.findUnique({
      where: { guardianUserId_patientId: { guardianUserId: decoded.userId, patientId: dependent.id } },
    });
    if (existing) throw new ValidationError('هذا الشخص موجود في قائمة عائلتك بالفعل');

    const depAge = dependentDob
      ? (Date.now() - new Date(dependentDob).getTime()) / YEAR_MS
      : null;
    const isMinor = depAge !== null ? depAge < 18 : !dependentUser?.password;

    let status: GuardianStatus;
    let notifyUserIds: number[] = [];
    let notifyIsForGuardians = false;

    if (isMinor) {
      const existingGuardians = await prisma.patientGuardian.findMany({
        where: { patientId: dependent.id, status: 'APPROVED' },
        select: { guardianUserId: true },
      });

      if (existingGuardians.length === 0) {
        status = GuardianStatus.APPROVED;
      } else {
        status = GuardianStatus.PENDING;
        notifyUserIds = existingGuardians.map((g) => g.guardianUserId);
        notifyIsForGuardians = true;
      }
    } else {
      status = GuardianStatus.PENDING;
      notifyUserIds = [dependent.userId];
    }

    const guardian = await prisma.patientGuardian.create({
      data: {
        guardianUserId: decoded.userId,
        patientId: dependent.id,
        relationship: relationship as GuardianRelationship,
        status,
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

    if (status === GuardianStatus.PENDING && notifyUserIds.length > 0) {
      await prisma.notification.createMany({
        data: notifyUserIds.map((userId) => ({
          userId,
          type: 'GENERAL' as const,
          title: notifyIsForGuardians ? 'طلب إضافة ولي أمر جديد' : 'طلب إضافة عائلي',
          message: notifyIsForGuardians
            ? `${guardianUser?.name} يطلب أن يكون ولي أمر على ${guardian.dependentPatient.user.name}`
            : `${guardianUser?.name} طلب إضافتك إلى قائمة عائلته`,
          link: '/patient/family',
        })),
      });
    }

    return NextResponse.json({ success: true, data: guardian }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}