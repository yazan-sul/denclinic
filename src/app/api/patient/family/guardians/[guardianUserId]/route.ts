import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, NotFoundError, ForbiddenError, ValidationError } from '@/lib/errors';
import { createNotification } from '@/lib/notifications';

const YEAR_MS = 365.25 * 24 * 60 * 60 * 1000;

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
      select: { id: true, dateOfBirth: true },
    });
    if (!myPatient) throw new NotFoundError('لم يتم العثور على ملفك الطبي');

    // Age check — must be 18+
    if (!myPatient.dateOfBirth) throw new ForbiddenError('لا يمكن التحقق من عمرك، يرجى تحديث ملفك الشخصي');
    const age = (Date.now() - new Date(myPatient.dateOfBirth).getTime()) / YEAR_MS;
    if (age < 18) throw new ForbiddenError('يجب أن يكون عمرك 18 سنة على الأقل لإزالة ولي الأمر');

    const record = await prisma.patientGuardian.findUnique({
      where: { guardianUserId_patientId: { guardianUserId, patientId: myPatient.id } },
      include: { guardianUser: { select: { name: true } } },
    });
    if (!record) throw new NotFoundError('العلاقة غير موجودة');

    const myUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { name: true },
    });

    await prisma.patientGuardian.delete({
      where: { guardianUserId_patientId: { guardianUserId, patientId: myPatient.id } },
    });

    await createNotification({
      userId: guardianUserId, type: 'GENERAL',
      title: 'تمت إزالتك كولي أمر',
      message: `قرر ${myUser?.name ?? 'المريض'} إزالتك من قائمة أولياء أموره.`,
      link: '/patient/family', targetRole: 'PATIENT',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}