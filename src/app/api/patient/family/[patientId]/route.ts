import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const { patientId: patientIdStr } = await params;
    const patientId = parseInt(patientIdStr, 10);
    if (isNaN(patientId)) throw new ValidationError('معرف غير صحيح');

    const existing = await prisma.patientGuardian.findUnique({
      where: { guardianUserId_patientId: { guardianUserId: decoded.userId, patientId } },
    });
    if (!existing) throw new NotFoundError('العلاقة غير موجودة');

    await prisma.patientGuardian.delete({
      where: { guardianUserId_patientId: { guardianUserId: decoded.userId, patientId } },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

// Approve a dependentInitiated=true request (someone asked me to be their guardian)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const { patientId: patientIdStr } = await params;
    const patientId = parseInt(patientIdStr, 10);
    if (isNaN(patientId)) throw new ValidationError('معرف غير صحيح');

    const record = await prisma.patientGuardian.findUnique({
      where: { guardianUserId_patientId: { guardianUserId: decoded.userId, patientId } },
      include: { dependentPatient: { select: { userId: true } } },
    });
    if (!record) throw new NotFoundError('الطلب غير موجود');
    if (!record.dependentInitiated) throw new ForbiddenError('ليس لديك صلاحية الموافقة على هذا الطلب');
    if (record.status !== 'PENDING') throw new ValidationError('الطلب تمت معالجته مسبقاً');

    const [myUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: decoded.userId }, select: { name: true } }),
    ]);

    await prisma.patientGuardian.update({
      where: { guardianUserId_patientId: { guardianUserId: decoded.userId, patientId } },
      data: { status: 'APPROVED' },
    });

    await prisma.notification.create({
      data: {
        userId: record.dependentPatient.userId,
        type: 'GENERAL',
        title: 'تم قبول طلب الولاية',
        message: `${myUser?.name} وافق على أن يكون ولي أمرك`,
        link: '/patient/family',
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}