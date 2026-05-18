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

    const branches = await prisma.branch.findMany({
      where: clinicId ? { clinicId } : undefined,
      select: {
        id: true,
        name: true,
        address: true,
        phone: true,
        createdAt: true,
        _count: {
          select: { doctors: true, staff: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const data = branches.map((b) => ({
      id: b.id,
      name: b.name,
      address: b.address,
      phone: b.phone ?? '',
      createdAt: b.createdAt.toISOString().split('T')[0],
      doctorsCount: b._count.doctors,
      staffCount: b._count.staff,
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error);
  }
}
