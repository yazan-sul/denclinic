import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { UserRole } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح أو منتهي الصلاحية');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        doctorProfile: { select: { clinicId: true } },
        staffProfile: { select: { clinicId: true } },
        clinicsOwned: { select: { id: true } },
      },
    });

    if (!user) throw new UnauthorizedError('المستخدم غير موجود');

    const roles = user.roles as UserRole[];

    let clinicId: number | null = null;

    if (roles.includes('DOCTOR') && user.doctorProfile?.clinicId) {
      clinicId = user.doctorProfile.clinicId;
    } else if (roles.includes('STAFF') && user.staffProfile?.clinicId) {
      clinicId = user.staffProfile.clinicId;
    } else if (roles.includes('CLINIC_OWNER') && user.clinicsOwned?.id) {
      clinicId = user.clinicsOwned.id;
    } else if (roles.includes('ADMIN')) {
      const clinicIdParam = new URL(request.url).searchParams.get('clinicId');
      clinicId = clinicIdParam ? parseInt(clinicIdParam, 10) : null;
    }

    if (!clinicId) throw new ForbiddenError('لا يمكن تحديد العيادة');

    const branches = await prisma.branch.findMany({
      where: { clinicId },
      select: { id: true, name: true, address: true },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: branches });
  } catch (error) {
    return handleApiError(error);
  }
}