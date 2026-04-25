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
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        doctorProfile: {
          select: {
            clinicId: true,
            clinic: { select: { id: true, name: true } },
          },
        },
        staffProfile: {
          select: {
            clinicId: true,
            clinic: { select: { id: true, name: true } },
          },
        },
        clinicsOwned: { select: { id: true, name: true } },
      },
    });

    if (!user) throw new UnauthorizedError('المستخدم غير موجود');

    const roles = user.roles as UserRole[];
    let clinics: { id: number; name: string }[] = [];

    if (roles.includes('DOCTOR') && user.doctorProfile?.clinic) {
      clinics = [user.doctorProfile.clinic];
    } else if (roles.includes('STAFF') && user.staffProfile?.clinic) {
      clinics = [user.staffProfile.clinic];
    } else if (roles.includes('CLINIC_OWNER') && user.clinicsOwned) {
      clinics = [{ id: user.clinicsOwned.id, name: user.clinicsOwned.name }];
    } else if (roles.includes('ADMIN')) {
      clinics = await prisma.clinic.findMany({
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
    } else {
      throw new ForbiddenError('ليست لديك صلاحية الوصول');
    }

    return NextResponse.json({ success: true, data: clinics });
  } catch (error) {
    return handleApiError(error);
  }
}