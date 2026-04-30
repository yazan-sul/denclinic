import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';
import { UserRole } from '@prisma/client';

// GET /api/doctor/services — get current doctor's offered services
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const doctor = await prisma.doctor.findUnique({
      where: { userId: decoded.userId },
      select: {
        id: true,
        servicesOffered: { select: { id: true, name: true, estimatedDuration: true } },
      },
    });

    if (!doctor) throw new ForbiddenError('الطبيب غير موجود');

    return NextResponse.json({ success: true, data: doctor.servicesOffered });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT /api/doctor/services — update doctor's offered services
export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { roles: true },
    });
    if (!user || !(user.roles as UserRole[]).includes('DOCTOR')) {
      throw new ForbiddenError('لا تملك صلاحية تعديل الخدمات');
    }

    const body = await request.json();
    const { serviceIds } = body;

    if (!Array.isArray(serviceIds)) throw new ValidationError('serviceIds يجب أن يكون مصفوفة');

    const doctor = await prisma.doctor.update({
      where: { userId: decoded.userId },
      data: {
        servicesOffered: {
          set: serviceIds.map((id: number) => ({ id })),
        },
      },
      select: {
        servicesOffered: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, data: doctor.servicesOffered });
  } catch (error) {
    return handleApiError(error);
  }
}