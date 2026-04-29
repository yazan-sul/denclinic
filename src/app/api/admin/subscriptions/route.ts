import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminScope } from '@/lib/adminScope';
import { ForbiddenError, NotFoundError, ValidationError, handleApiError } from '@/lib/errors';

const tierMap = {
  BASIC: 'basic',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise',
} as const;

const reverseTierMap = {
  basic: 'BASIC',
  professional: 'PROFESSIONAL',
  enterprise: 'ENTERPRISE',
} as const;

type TierKey = keyof typeof reverseTierMap;

function toDateString(date: Date | null) {
  return date ? date.toISOString().split('T')[0] : '';
}

async function getScopedClinicIds(scope: Awaited<ReturnType<typeof getAdminScope>>) {
  if (scope.clinicIds?.length) {
    return scope.clinicIds;
  }

  const clinics = await prisma.clinic.findMany({
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  return clinics.map((clinic) => clinic.id);
}

export async function GET() {
  try {
    const scope = await getAdminScope();
    const clinicIds = await getScopedClinicIds(scope);

    const [plans, subscription, branchesUsed, doctorsUsed, staffUsed, invoices] = await Promise.all([
      prisma.subscriptionPlan.findMany({
        orderBy: { monthlyPrice: 'asc' },
      }),
      prisma.subscription.findFirst({
        where: { clinicId: { in: clinicIds } },
        include: {
          clinic: { select: { id: true, name: true } },
          plan: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.branch.count({ where: { clinicId: { in: clinicIds } } }),
      prisma.doctor.count({ where: { clinicId: { in: clinicIds } } }),
      prisma.staff.count({ where: { clinicId: { in: clinicIds } } }),
      prisma.payment.findMany({
        where: {
          subscription: {
            clinicId: { in: clinicIds },
          },
        },
        select: {
          id: true,
          amount: true,
          status: true,
          transactionTime: true,
          subscription: {
            select: {
              plan: { select: { name: true } },
            },
          },
        },
        orderBy: { transactionTime: 'desc' },
        take: 10,
      }),
    ]);

    if (!subscription) {
      throw new NotFoundError('Subscription not found');
    }

    return NextResponse.json({
      success: true,
      data: {
        current: {
          id: subscription.id,
          clinicId: subscription.clinic.id,
          clinicName: subscription.clinic.name,
          plan: tierMap[subscription.plan.tier],
          status: subscription.status.toLowerCase(),
          startDate: toDateString(subscription.startDate),
          endDate: toDateString(subscription.endDate),
          autoRenew: subscription.autoRenew,
          branchesUsed,
          doctorsUsed,
          staffUsed,
        },
        plans: plans.map((plan) => ({
          id: tierMap[plan.tier],
          name: plan.name,
          monthlyPrice: plan.monthlyPrice,
          annualPrice: plan.annualPrice ?? Math.round(plan.monthlyPrice * 12),
          maxBranches: plan.maxBranches,
          maxDoctors: plan.maxDoctors,
          maxStaff: Math.max(plan.maxDoctors, plan.maxDoctors + 5),
          features: plan.features,
        })),
        invoices: invoices.map((invoice) => ({
          id: invoice.id,
          date: toDateString(invoice.transactionTime),
          amount: invoice.amount,
          status: invoice.status.toLowerCase(),
          plan: invoice.subscription?.plan.name ?? subscription.plan.name,
        })),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const scope = await getAdminScope();
    if (scope.role === 'BRANCH_MANAGER') {
      throw new ForbiddenError('Branch managers cannot modify subscriptions');
    }

    const clinicIds = await getScopedClinicIds(scope);
    const body = await request.json();
    const subscriptionId = typeof body.subscriptionId === 'number' ? body.subscriptionId : NaN;

    if (!Number.isInteger(subscriptionId)) {
      throw new ValidationError('Invalid subscription id');
    }

    const existing = await prisma.subscription.findFirst({
      where: {
        id: subscriptionId,
        clinicId: { in: clinicIds },
      },
      include: {
        plan: true,
        clinic: { select: { id: true, name: true } },
      },
    });

    if (!existing) {
      throw new NotFoundError('Subscription not found');
    }

    const nextPlanId = typeof body.plan === 'string' ? body.plan as TierKey : undefined;
    let planId = existing.planId;
    let monthlyBilled = existing.monthlyBilled;
    let endDate = existing.endDate;
    let renewalDate = existing.renewalDate;

    if (nextPlanId && reverseTierMap[nextPlanId]) {
      const nextPlan = await prisma.subscriptionPlan.findUnique({
        where: { tier: reverseTierMap[nextPlanId] },
      });

      if (!nextPlan) {
        throw new ValidationError('Selected plan does not exist');
      }

      planId = nextPlan.id;
      monthlyBilled = body.billingCycle === 'yearly' ? false : true;
      const now = new Date();
      endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + (monthlyBilled ? 1 : 12));
      renewalDate = endDate;
    }

    const updated = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        planId,
        monthlyBilled,
        autoRenew: typeof body.autoRenew === 'boolean' ? body.autoRenew : existing.autoRenew,
        endDate,
        renewalDate,
        status: 'ACTIVE',
      },
      include: {
        clinic: { select: { id: true, name: true } },
        plan: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        clinicId: updated.clinic.id,
        clinicName: updated.clinic.name,
        plan: tierMap[updated.plan.tier],
        status: updated.status.toLowerCase(),
        startDate: toDateString(updated.startDate),
        endDate: toDateString(updated.endDate),
        autoRenew: updated.autoRenew,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
