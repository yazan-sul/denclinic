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
        doctorProfiles: {
          select: {
            clinicId: true,
            clinic: { select: { id: true, name: true } },
          },
        },
        staffProfiles: {
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
    const activeRole = new URL(request.url).searchParams.get('activeRole');
    let clinics: { id: number; name: string }[] = [];

    if (activeRole === 'STAFF') {
      // Staff interface: return only staff-profile clinics
      clinics = user.staffProfiles.map(p => p.clinic).filter((c): c is { id: number; name: string } => c != null);
    } else if (roles.includes('DOCTOR') && user.doctorProfiles.length > 0) {
      clinics = user.doctorProfiles.map(p => p.clinic).filter((c): c is { id: number; name: string } => c != null);
    } else if (roles.includes('STAFF') && user.staffProfiles.length > 0) {
      clinics = user.staffProfiles.map(p => p.clinic).filter((c): c is { id: number; name: string } => c != null);
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