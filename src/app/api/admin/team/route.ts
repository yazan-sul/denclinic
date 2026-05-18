import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح أو منتهي الصلاحية');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        roles: true,
        clinicsOwned: { select: { id: true } },
      },
    });

    if (!user) throw new UnauthorizedError('المستخدم غير موجود');

    const isClinicOwner = user.roles.includes('CLINIC_OWNER');

    if (!isClinicOwner) {
      throw new ForbiddenError('غير مصرح بالوصول');
    }

    const clinicId = isClinicOwner ? user.clinicsOwned?.id : null;
    if (!clinicId) {
      return NextResponse.json({ success: true, data: [] });
    }

    const [doctors, staff] = await Promise.all([
      prisma.doctor.findMany({
        where: { clinicId },
        select: {
          id: true,
          specialization: true,
          createdAt: true,
          user: { select: { name: true, phoneNumber: true, email: true } },
          branch: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.staff.findMany({
        where: { clinicId },
        select: {
          id: true,
          position: true,
          createdAt: true,
          user: { select: { name: true, phoneNumber: true, email: true } },
          branch: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Staff IDs are offset to avoid collision with doctor IDs in the UI list
    const STAFF_ID_OFFSET = 100_000;

    const data = [
      ...doctors.map((d) => ({
        id: d.id,
        name: d.user.name,
        phone: d.user.phoneNumber,
        email: d.user.email ?? '',
        role: 'DOCTOR' as const,
        specialization: d.specialization,
        branch: d.branch.name,
        status: 'active' as const,
        joinedAt: d.createdAt.toISOString().split('T')[0],
      })),
      ...staff.map((s) => ({
        id: s.id + STAFF_ID_OFFSET,
        name: s.user.name,
        phone: s.user.phoneNumber,
        email: s.user.email ?? '',
        role: 'STAFF' as const,
        specialization: s.position,
        branch: s.branch.name,
        status: 'active' as const,
        joinedAt: s.createdAt.toISOString().split('T')[0],
      })),
    ];

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error);
  }
}
