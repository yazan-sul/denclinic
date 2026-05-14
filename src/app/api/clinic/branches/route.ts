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
        doctorProfiles: { select: { clinicId: true } },
        staffProfiles:  { select: { clinicId: true } },
        clinicsOwned:   { select: { id: true } },
      },
    });

    if (!user) throw new UnauthorizedError('المستخدم غير موجود');

    const roles = user.roles as UserRole[];
    const requestedClinicId = parseInt(request.nextUrl.searchParams.get('clinicId') || '0', 10) || null;
    const activeRole = request.nextUrl.searchParams.get('activeRole');

    let clinicId: number | null = null;

    if (activeRole === 'STAFF' && user.staffProfiles.length > 0) {
      const profile = requestedClinicId
        ? user.staffProfiles.find(p => p.clinicId === requestedClinicId) ?? user.staffProfiles[0]
        : user.staffProfiles[0];
      clinicId = profile.clinicId;
    } else if (roles.includes('DOCTOR') && user.doctorProfiles.length > 0) {
      const profile = requestedClinicId
        ? user.doctorProfiles.find(p => p.clinicId === requestedClinicId) ?? user.doctorProfiles[0]
        : user.doctorProfiles[0];
      clinicId = profile.clinicId;
    } else if (roles.includes('STAFF') && user.staffProfiles.length > 0) {
      const profile = requestedClinicId
        ? user.staffProfiles.find(p => p.clinicId === requestedClinicId) ?? user.staffProfiles[0]
        : user.staffProfiles[0];
      clinicId = profile.clinicId;
    } else if (roles.includes('CLINIC_OWNER') && user.clinicsOwned?.id) {
      clinicId = user.clinicsOwned.id;
    } else if (roles.includes('ADMIN')) {
      clinicId = requestedClinicId;
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