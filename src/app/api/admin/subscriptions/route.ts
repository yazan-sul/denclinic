import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors';

// SubscriptionPlan has no maxStaff column — derive from tier
const MAX_STAFF_BY_TIER: Record<string, number> = {
  BASIC: 5,
  PROFESSIONAL: 15,
  ENTERPRISE: 50,
};

function mapStatus(status: string): 'active' | 'expired' | 'cancelled' | 'trial' {
  if (status === 'ACTIVE') return 'active';
  if (status === 'EXPIRED') return 'expired';
  if (status === 'CANCELLED') return 'cancelled';
  return 'trial'; // PENDING_PAYMENT
}

function mapPaymentStatus(status: string): 'paid' | 'pending' | 'failed' {
  if (status === 'COMPLETED' || status === 'REFUNDED') return 'paid';
  if (status === 'FAILED' || status === 'CANCELLED') return 'failed';
  return 'pending';
}

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
    const isAdmin = user.roles.includes('ADMIN');

    if (!isClinicOwner && !isAdmin) {
      throw new ForbiddenError('غير مصرح بالوصول');
    }

    const clinicId = isClinicOwner ? user.clinicsOwned?.id : null;
    if (!clinicId) {
      return NextResponse.json({ success: true, data: null });
    }

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: {
        name: true,
        _count: { select: { branches: true, doctors: true, staff: true } },
        subscription: {
          select: {
            id: true,
            status: true,
            startDate: true,
            endDate: true,
            autoRenew: true,
            plan: {
              select: {
                tier: true,
                name: true,
                monthlyPrice: true,
                maxBranches: true,
                maxDoctors: true,
                features: true,
              },
            },
            payments: {
              select: {
                id: true,
                amount: true,
                status: true,
                transactionTime: true,
              },
              orderBy: { transactionTime: 'desc' },
              take: 20,
            },
          },
        },
      },
    });

    if (!clinic || !clinic.subscription) {
      return NextResponse.json({ success: true, data: null });
    }

    const sub = clinic.subscription;
    const plan = sub.plan;

    return NextResponse.json({
      success: true,
      data: {
        id: sub.id,
        clinicName: clinic.name,
        plan: {
          tier: plan.tier,
          name: plan.name,
          monthlyPrice: plan.monthlyPrice,
          maxBranches: plan.maxBranches,
          maxDoctors: plan.maxDoctors,
          maxStaff: MAX_STAFF_BY_TIER[plan.tier] ?? 10,
          features: plan.features,
        },
        status: mapStatus(sub.status),
        startDate: sub.startDate.toISOString().split('T')[0],
        endDate: sub.endDate.toISOString().split('T')[0],
        autoRenew: sub.autoRenew,
        branchesUsed: clinic._count.branches,
        doctorsUsed: clinic._count.doctors,
        staffUsed: clinic._count.staff,
        invoices: sub.payments.map((p) => ({
          id: p.id,
          date: p.transactionTime.toISOString().split('T')[0],
          amount: p.amount,
          status: mapPaymentStatus(p.status),
          plan: plan.name,
        })),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
