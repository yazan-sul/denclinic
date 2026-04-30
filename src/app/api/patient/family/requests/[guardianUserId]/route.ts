import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, NotFoundError, ValidationError } from '@/lib/errors';

async function getMyPatientId(userId: number): Promise<number | null> {
  const p = await prisma.patient.findFirst({ where: { userId }, select: { id: true } });
  return p?.id ?? null;
}

export async function PATCH(
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

    const myPatientId = await getMyPatientId(decoded.userId);
    if (!myPatientId) throw new NotFoundError('لم يتم العثور على ملفك الطبي');

    const record = await prisma.patientGuardian.findUnique({
      where: { guardianUserId_patientId: { guardianUserId, patientId: myPatientId } },
    });
    if (!record) throw new NotFoundError('الطلب غير موجود');
    if (record.status !== 'PENDING') throw new ValidationError('الطلب تمت معالجته مسبقاً');

    const [updated, myUser] = await Promise.all([
      prisma.patientGuardian.update({
        where: { guardianUserId_patientId: { guardianUserId, patientId: myPatientId } },
        data: { status: 'APPROVED' },
      }),
      prisma.user.findUnique({ where: { id: decoded.userId }, select: { name: true } }),
    ]);

    await prisma.notification.create({
      data: {
        userId: guardianUserId,
        type: 'GENERAL',
        title: 'تم قبول طلب الإضافة العائلية',
        message: `${myUser?.name} قبل انضمامك كأحد أفراد العائلة`,
        link: '/patient/family',
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

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

    const myPatientId = await getMyPatientId(decoded.userId);
    if (!myPatientId) throw new NotFoundError('لم يتم العثور على ملفك الطبي');

    const record = await prisma.patientGuardian.findUnique({
      where: { guardianUserId_patientId: { guardianUserId, patientId: myPatientId } },
    });
    if (!record) throw new NotFoundError('الطلب غير موجود');

    await prisma.patientGuardian.delete({
      where: { guardianUserId_patientId: { guardianUserId, patientId: myPatientId } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}