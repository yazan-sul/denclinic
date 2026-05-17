import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors';
import { createNotification } from '@/lib/notifications';

async function verifyGuardianAccess(userId: number, recordId: number) {
  const record = await prisma.patientGuardian.findUnique({
    where: { id: recordId },
    include: { dependentPatient: { include: { user: { select: { name: true } } } } },
  });
  if (!record) throw new NotFoundError('الطلب غير موجود');
  if (record.status !== 'PENDING') throw new ValidationError('الطلب تمت معالجته مسبقاً');

  // Verify caller is an approved guardian of this patient
  const myAccess = await prisma.patientGuardian.findFirst({
    where: { guardianUserId: userId, patientId: record.patientId, status: 'APPROVED' },
  });
  if (!myAccess) throw new ForbiddenError('ليس لديك صلاحية للموافقة على هذا الطلب');

  return record;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) throw new ValidationError('معرف غير صحيح');

    const record = await verifyGuardianAccess(decoded.userId, id);

    const [myUser] = await Promise.all([
      prisma.user.findUnique({ where: { id: decoded.userId }, select: { name: true } }),
    ]);

    await prisma.patientGuardian.update({
      where: { id },
      data: { status: 'APPROVED' },
    });

    // Notify the new guardian that they were approved
    await createNotification({
      userId: record.guardianUserId,
      type: 'GENERAL',
      title: 'تم قبول طلب الإضافة العائلية',
      message: `تمت الموافقة على إضافتك ولياً للأمر على ${record.dependentPatient.user.name}`,
      link: '/patient/family',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    if (isNaN(id)) throw new ValidationError('معرف غير صحيح');

    const record = await verifyGuardianAccess(decoded.userId, id);

    await prisma.patientGuardian.delete({ where: { id } });

    // Notify the requester that they were rejected
    await createNotification({
      userId: record.guardianUserId,
      type: 'GENERAL',
      title: 'تم رفض طلب الإضافة العائلية',
      message: `تم رفض طلبك لتكون ولياً للأمر على ${record.dependentPatient.user.name}`,
      link: '/patient/family',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}