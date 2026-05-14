import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';
import { UserRole } from '@prisma/client';

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n <= 0) throw new ValidationError('قيمة غير صحيحة');
  return n;
}

function parseDateParam(value: string | null): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ValidationError('تاريخ غير صحيح');
  const d = new Date(`${value}T00:00:00.000Z`);
  if (isNaN(d.getTime())) throw new ValidationError('تاريخ غير صحيح');
  return d;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { roles: true, staffProfiles: { select: { clinicId: true } } },
    });
    if (!user) throw new UnauthorizedError('غير مصرح');

    const roles = user.roles as UserRole[];
    if (!roles.some(r => ['STAFF', 'ADMIN', 'CLINIC_OWNER'].includes(r))) {
      throw new ForbiddenError('يجب أن تكون من طاقم العمل');
    }

    const { searchParams } = new URL(request.url);
    const requestedClinicId = searchParams.get('clinicId')
      ? parsePositiveInt(searchParams.get('clinicId'), 0) : null;
    const patientId = searchParams.get('patientId') ? Number(searchParams.get('patientId')) : null;
    const fromDate  = parseDateParam(searchParams.get('from'));
    const toDate    = parseDateParam(searchParams.get('to'));
    const search    = searchParams.get('search')?.trim() || '';
    const page      = parsePositiveInt(searchParams.get('page'), 1);
    const pageSize  = Math.min(parsePositiveInt(searchParams.get('pageSize'), 50), 200);

    // Resolve clinic
    let clinicId: number;
    if (user.staffProfiles.length > 0) {
      const profile = requestedClinicId
        ? user.staffProfiles.find(p => p.clinicId === requestedClinicId) ?? user.staffProfiles[0]
        : user.staffProfiles[0];
      clinicId = profile.clinicId;
    } else if (roles.includes('ADMIN') || roles.includes('CLINIC_OWNER')) {
      if (!requestedClinicId) throw new ValidationError('clinicId مطلوب');
      clinicId = requestedClinicId;
    } else {
      throw new ForbiddenError('لا يوجد ملف طاقم عمل');
    }

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (fromDate) dateFilter.gte = fromDate;
    if (toDate) {
      const end = new Date(toDate);
      end.setUTCHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const where = {
      payment: {
        appointment: {
          clinicId,
          ...(patientId ? { patientId } : {}),
        },
        ...(search ? {
          OR: [
            { appointment: { patient: { user: { name: { contains: search, mode: 'insensitive' as const } } } } },
            { appointment: { patient: { user: { phoneNumber: { contains: search } } } } },
          ],
        } : {}),
      },
      ...(Object.keys(dateFilter).length ? { paidAt: dateFilter } : {}),
    };

    const [total, transactions] = await Promise.all([
      prisma.paymentTransaction.count({ where }),
      prisma.paymentTransaction.findMany({
        where,
        orderBy: { paidAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id:          true,
          paidAmount:  true,
          paidCurrency: true,
          exchangeRate: true,
          amountInCost: true,
          method:      true,
          notes:       true,
          paidAt:      true,
          payment: {
            select: {
              id:       true,
              amount:   true,
              currency: true,
              status:   true,
              surplus:  true,
              appointment: {
                select: {
                  id:              true,
                  appointmentDate: true,
                  service:  { select: { name: true } },
                  patient:  { select: { id: true, user: { select: { name: true, phoneNumber: true } } } },
                  branch:   { select: { name: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        transactions,
        pagination: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
