import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, NotFoundError, ForbiddenError, ValidationError } from '@/lib/errors';
import { GuardianRelationship, GuardianStatus } from '@prisma/client';
import { createNotification } from '@/lib/notifications';

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

const REVERSE_RELATIONSHIP: Record<string, GuardianRelationship> = {
  PARENT: GuardianRelationship.CHILD,
  CHILD: GuardianRelationship.PARENT,
  SPOUSE: GuardianRelationship.SPOUSE,
  SIBLING: GuardianRelationship.SIBLING,
  GRANDPARENT: GuardianRelationship.OTHER,
  OTHER: GuardianRelationship.OTHER,
};

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ guardianUserId: string }> }
) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const { guardianUserId: gStr } = await params;
    const guardianUserId = parseInt(gStr, 10);
    if (isNaN(guardianUserId)) throw new ValidationError('معرف غير صحيح');

    const myPatient = await prisma.patient.findFirst({
      where: { userId: decoded.userId },
      select: { id: true },
    });
    if (!myPatient) throw new NotFoundError('لم يتم العثور على ملفك الطبي');

    const record = await prisma.patientGuardian.findUnique({
      where: { guardianUserId_patientId: { guardianUserId, patientId: myPatient.id } },
    });
    if (!record) throw new NotFoundError('الطلب غير موجود');
    if (record.status !== 'PENDING') throw new ValidationError('لا يمكن إلغاء طلب تمت معالجته');

    await prisma.patientGuardian.delete({
      where: { guardianUserId_patientId: { guardianUserId, patientId: myPatient.id } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guardianUserId: string }> }
) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const { guardianUserId: gStr } = await params;
    const guardianUserId = parseInt(gStr, 10);
    if (isNaN(guardianUserId)) throw new ValidationError('معرف غير صحيح');

    // Current user must be 18+
    const myPatient = await prisma.patient.findFirst({
      where: { userId: decoded.userId },
      select: { id: true, dateOfBirth: true },
    });
    if (!myPatient) throw new NotFoundError('لم يتم العثور على ملفك الطبي');
    if (!myPatient.dateOfBirth) throw new ForbiddenError('يرجى تحديث تاريخ ميلادك في ملفك الشخصي');

    const myAge = (Date.now() - new Date(myPatient.dateOfBirth).getTime()) / YEAR_MS;
    if (myAge < 18) throw new ForbiddenError('يجب أن يكون عمرك 18 سنة على الأقل لطلب رؤية سجل شخص آخر');

    // Find the existing guardian relationship to get the original relationship type
    const existingRelation = await prisma.patientGuardian.findFirst({
      where: { guardianUserId, patientId: myPatient.id, status: 'APPROVED' },
    });
    if (!existingRelation) throw new NotFoundError('لا توجد علاقة سابقة مع هذا الشخص');

    // Find the guardian's patient record
    const guardianPatient = await prisma.patient.findFirst({
      where: { userId: guardianUserId },
    });
    if (!guardianPatient) throw new NotFoundError('لم يتم العثور على ملف هذا الشخص');

    // Check if reverse relationship already exists
    const alreadyExists = await prisma.patientGuardian.findUnique({
      where: { guardianUserId_patientId: { guardianUserId: decoded.userId, patientId: guardianPatient.id } },
    });
    if (alreadyExists) throw new ValidationError('أنت بالفعل لديك وصول إلى سجل هذا الشخص');

    // Determine reverse relationship
    const reverseRelationship = REVERSE_RELATIONSHIP[existingRelation.relationship] ?? GuardianRelationship.OTHER;

    // Determine status
    const guardianUser = await prisma.user.findUnique({
      where: { id: guardianUserId },
      select: { password: true, name: true },
    });
    const status = guardianUser?.password ? GuardianStatus.PENDING : GuardianStatus.APPROVED;

    const myUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { name: true },
    });

    await prisma.patientGuardian.create({
      data: {
        guardianUserId: decoded.userId,
        patientId: guardianPatient.id,
        relationship: reverseRelationship,
        status,
      },
    });

    if (status === GuardianStatus.PENDING) {
      await createNotification({
        userId: guardianUserId, type: 'GENERAL',
        title: 'طلب وصول إلى السجل الطبي',
        message: `${myUser?.name} يطلب رؤية سجلك الطبي`,
        link: '/patient/family', targetRole: 'PATIENT',
      });
    }

    return NextResponse.json({ success: true, status });
  } catch (error) {
    return handleApiError(error);
  }
}