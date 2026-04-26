import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ValidationError, NotFoundError } from '@/lib/errors';

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