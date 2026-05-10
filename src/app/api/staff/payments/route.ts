import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';
import { PaymentStatus } from '@prisma/client';

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const n = Number.parseInt(value, 10);
  if (!Number.isInteger(n) || n <= 0) throw new ValidationError('قيمة غير صحيحة');
  return n;
}

function parseDateParam(value: string | null, label: string): Date | null {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new ValidationError(`${label} غير صحيح`);
  const d = new Date(`${value}T00:00:00.000Z`);
  if (isNaN(d.getTime())) throw new ValidationError(`${label} غير صحيح`);
  return d;
}

const ALLOWED_STATUSES = new Set(Object.values(PaymentStatus));

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        roles: true,
        staffProfiles: { select: { clinicId: true, branchId: true } },
      },
    });
    if (!user) throw new UnauthorizedError('غير مصرح');

    const roles = user.roles as string[];
    const isStaff = roles.some(r => ['STAFF', 'ADMIN', 'CLINIC_OWNER'].includes(r));
    if (!isStaff) throw new ForbiddenError('يجب أن تكون من طاقم العمل');

    const { searchParams } = new URL(request.url);
    const requestedClinicId = searchParams.get('clinicId')
      ? parsePositiveInt(searchParams.get('clinicId'), 0) : null;
    const requestedBranchId = searchParams.get('branchId')
      ? parsePositiveInt(searchParams.get('branchId'), 0) : null;
    const statusParam = searchParams.get('status');
    const fromDate  = parseDateParam(searchParams.get('from'), 'تاريخ البداية');
    const toDate    = parseDateParam(searchParams.get('to'),   'تاريخ النهاية');
    const search    = searchParams.get('search')?.trim() || '';
    const page      = parsePositiveInt(searchParams.get('page'), 1);
    const pageSize  = Math.min(parsePositiveInt(searchParams.get('pageSize'), 20), 100);

    if (statusParam && !ALLOWED_STATUSES.has(statusParam as PaymentStatus)) {
      throw new ValidationError('حالة الدفع غير صحيحة');
    }

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

    const patientId  = searchParams.get('patientId') ? Number(searchParams.get('patientId')) : null;

    const searchFilter = search ? {
      OR: [
        { appointment: { patient: { user: { name: { contains: search, mode: 'insensitive' as const } } } } },
        { appointment: { patient: { user: { phoneNumber: { contains: search } } } } },
      ],
    } : {};

    const where = {
      appointment: {
        clinicId,
        ...(requestedBranchId ? { branchId: requestedBranchId } : {}),
        ...(patientId ? { patientId } : {}),
      },
      ...(statusParam ? { status: statusParam as PaymentStatus } : {}),
      ...(Object.keys(dateFilter).length ? { transactionTime: dateFilter } : {}),
      ...searchFilter,
    };

    const paymentSelect = {
      id: true,
      amount: true,
      originalAmount: true,
      discountType: true,
      discountValue: true,
      currency: true,
      paidAmount: true,
      paidCurrency: true,
      exchangeRate: true,
      surplus: true,
      method: true,
      status: true,
      transactionId: true,
      transactionTime: true,
      description: true,
      appointmentId: true,
      appointment: {
        select: {
          id: true,
          appointmentDate: true,
          appointmentTime: true,
          status: true,
          patient: {
            select: {
              id: true,
              user: { select: { id: true, name: true, phoneNumber: true, email: true } },
            },
          },
          service: { select: { id: true, name: true, basePrice: true } },
          doctor:  { select: { id: true, user: { select: { name: true } } } },
          branch:  { select: { id: true, name: true } },
        },
      },
    } as const;

    const [total, payments, payoutPayments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        orderBy: { transactionTime: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: paymentSelect,
      }),
      // Payout payments (clinic → patient): no appointmentId, patient in this clinic
      prisma.payment.findMany({
        where: {
          appointmentId: null,
          transactionId: { startsWith: 'PAYOUT-' },
          ...(statusParam ? { status: statusParam as PaymentStatus } : {}),
          ...(Object.keys(dateFilter).length ? { transactionTime: dateFilter } : {}),
          user: {
            patient: {
              appointments: { some: { clinicId } },
            },
          },
          ...(search ? {
            user: { name: { contains: search, mode: 'insensitive' as const } },
          } : {}),
        },
        orderBy: { transactionTime: 'desc' },
        select: { ...paymentSelect },
      }),
    ]);

    // Merge and sort
    const allPayments = [...payments, ...payoutPayments]
      .sort((a, b) => new Date(b.transactionTime).getTime() - new Date(a.transactionTime).getTime())
      .slice(0, pageSize);

    // Stats — per currency
    const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0);
    const todayEnd   = new Date(); todayEnd.setUTCHours(23, 59, 59, 999);
    const baseWhere  = { appointment: { clinicId } };

    const [todayRevenue, todayCount, pendingRows, refundedRows, totalRevenue] = await Promise.all([
      prisma.payment.groupBy({
        by: ['currency'],
        where: { ...baseWhere, status: 'COMPLETED', transactionTime: { gte: todayStart, lte: todayEnd } },
        _sum: { amount: true },
      }),
      prisma.payment.count({
        where: { ...baseWhere, status: { in: ['COMPLETED', 'PENDING'] }, transactionTime: { gte: todayStart, lte: todayEnd } },
      }),
      prisma.payment.groupBy({
        by: ['currency'],
        where: { ...baseWhere, status: 'PENDING' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.groupBy({
        by: ['currency'],
        where: { ...baseWhere, status: 'REFUNDED' },
        _sum: { amount: true },
      }),
      prisma.payment.groupBy({
        by: ['currency'],
        where: { ...baseWhere, status: 'COMPLETED' },
        _sum: { amount: true },
      }),
    ]);

    const toCurrencyList = (rows: { currency: unknown; _sum: { amount: number | null } }[]) =>
      rows.map(r => ({ currency: String(r.currency), amount: r._sum.amount ?? 0 }));

    return NextResponse.json({
      success: true,
      data: {
        payments: allPayments,
        pagination: { total: total + payoutPayments.length, page, pageSize, totalPages: Math.ceil((total + payoutPayments.length) / pageSize) },
        stats: {
          todayRevenue:   toCurrencyList(todayRevenue),
          todayCount,
          pendingCount:   pendingRows.reduce((s, r) => s + r._count, 0),
          pendingAmount:  toCurrencyList(pendingRows),
          refundedAmount: toCurrencyList(refundedRows),
          totalRevenue:   toCurrencyList(totalRevenue),
        },
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
