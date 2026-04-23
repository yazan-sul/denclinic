import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  handleApiError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
} from '@/lib/errors';
import { AppointmentStatus, UserRole } from '@prisma/client';

const ALLOWED_STATUSES = new Set(Object.values(AppointmentStatus));

function parseDateParam(value: string | null, fieldLabel: string): Date | null {
  if (!value) {
    return null;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`${fieldLabel} غير صحيح`);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${fieldLabel} غير صحيح`);
  }

  return date;
}

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new ValidationError('قيمة الترقيم غير صحيحة');
  }

  return parsed;
}

async function resolveClinicScope(userId: number, requestedClinicId: number | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      doctorProfile: { select: { clinicId: true } },
      staffProfile: { select: { clinicId: true } },
      clinicsOwned: { select: { id: true } },
    },
  });

  if (!user) {
    throw new UnauthorizedError('غير مصرح');
  }

  const roles = user.roles as UserRole[];

  if (roles.includes('ADMIN')) {
    if (!requestedClinicId) {
      throw new ValidationError('clinicId مطلوب لهذا المستخدم');
    }
    return { clinicId: requestedClinicId, roles };
  }

  if (roles.includes('DOCTOR') && user.doctorProfile?.clinicId) {
    return { clinicId: user.doctorProfile.clinicId, roles };
  }

  if (roles.includes('STAFF') && user.staffProfile?.clinicId) {
    return { clinicId: user.staffProfile.clinicId, roles };
  }

  if (roles.includes('CLINIC_OWNER') && user.clinicsOwned?.id) {
    return { clinicId: user.clinicsOwned.id, roles };
  }

  throw new ForbiddenError('ليست لديك صلاحية الوصول إلى سجلات العيادة');
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) {
      throw new UnauthorizedError('غير مصرح');
    }

    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      throw new UnauthorizedError('رمز غير صالح أو منتهي الصلاحية');
    }

    const { searchParams } = new URL(request.url);
    const requestedClinicIdRaw = searchParams.get('clinicId');
    const requestedClinicId = requestedClinicIdRaw
      ? parsePositiveInt(requestedClinicIdRaw, 1)
      : null;

    const page = parsePositiveInt(searchParams.get('page'), 1);
    const pageSize = Math.min(parsePositiveInt(searchParams.get('pageSize'), 20), 100);

    const statusParam = searchParams.get('status');
    const fromDate = parseDateParam(searchParams.get('from'), 'تاريخ البداية');
    const toDate = parseDateParam(searchParams.get('to'), 'تاريخ النهاية');
    const search = searchParams.get('search')?.trim();

    if (statusParam && !ALLOWED_STATUSES.has(statusParam as AppointmentStatus)) {
      throw new ValidationError('حالة الموعد غير صحيحة');
    }

    if (fromDate && toDate && fromDate > toDate) {
      throw new ValidationError('تاريخ البداية يجب أن يسبق تاريخ النهاية');
    }

    const { clinicId } = await resolveClinicScope(decoded.userId, requestedClinicId);

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (fromDate) {
      dateFilter.gte = fromDate;
    }
    if (toDate) {
      const endOfDay = new Date(toDate);
      endOfDay.setUTCHours(23, 59, 59, 999);
      dateFilter.lte = endOfDay;
    }

    const where = {
      clinicId,
      ...(statusParam ? { status: statusParam as AppointmentStatus } : {}),
      ...(Object.keys(dateFilter).length > 0
        ? { appointmentDate: dateFilter }
        : {}),
      ...(search
        ? {
            OR: [
              { patient: { user: { name: { contains: search, mode: 'insensitive' as const } } } },
              { doctor: { user: { name: { contains: search, mode: 'insensitive' as const } } } },
              { service: { name: { contains: search, mode: 'insensitive' as const } } },
            ],
          }
        : {}),
    };

    const [total, appointments] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.findMany({
        where,
        include: {
          clinic: { select: { id: true, name: true } },
          branch: { select: { id: true, name: true } },
          patient: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  phoneNumber: true,
                  email: true,
                },
              },
            },
          },
          doctor: {
            select: {
              id: true,
              user: { select: { id: true, name: true } },
            },
          },
          service: { select: { id: true, name: true } },
        },
        orderBy: [
          { appointmentDate: 'desc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: appointments,
      pagination: {
        page,
        pageSize,
        total,
        pages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
