import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { ForbiddenError, UnauthorizedError, handleApiError } from '@/lib/errors';

const ADMIN_ROLES = ['ADMIN', 'CLINIC_OWNER', 'BRANCH_MANAGER'] as const;

type ActivityItem = {
  id: string;
  text: string;
  time: string;
  createdAt: Date;
};

function startOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function addDays(date: Date, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function formatRelativeTime(date: Date, now: Date) {
  const diffMinutes = Math.round((date.getTime() - now.getTime()) / (1000 * 60));
  const formatter = new Intl.RelativeTimeFormat('ar', { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, 'day');
}

function getDaysLeft(endDate: Date | null, now: Date) {
  if (!endDate) return null;
  return Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('authToken')?.value;

    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      throw new UnauthorizedError('Invalid authentication token');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        managedBranch: {
          select: {
            id: true,
            name: true,
            clinicId: true,
          },
        },
      },
    });

    if (!user || !ADMIN_ROLES.includes(user.role as (typeof ADMIN_ROLES)[number])) {
      throw new ForbiddenError('Admin access required');
    }

    let clinicIds: number[] | undefined;
    let branchIds: number[] | undefined;
    let scope: 'admin' | 'clinic_owner' | 'branch_manager' = 'admin';
    let scopeLabel = 'All clinics';

    if (user.role === 'CLINIC_OWNER') {
      scope = 'clinic_owner';
      const ownedClinics = await prisma.clinic.findMany({
        where: { ownerId: user.id },
        select: { id: true, name: true },
      });
      clinicIds = ownedClinics.map((clinic) => clinic.id);
      scopeLabel = ownedClinics[0]?.name || 'My clinic';
    } else if (user.role === 'BRANCH_MANAGER') {
      if (!user.managedBranch) {
        throw new ForbiddenError('No managed branch is linked to this account');
      }

      scope = 'branch_manager';
      clinicIds = [user.managedBranch.clinicId];
      branchIds = [user.managedBranch.id];
      scopeLabel = user.managedBranch.name;
    }

    const now = new Date();
    const today = startOfDay(now);
    const tomorrow = addDays(today, 1);
    const weekEnd = addDays(today, 7);
    const monthStart = startOfMonth(now);

    const branchWhere = branchIds ? { id: { in: branchIds } } : clinicIds ? { clinicId: { in: clinicIds } } : {};
    const doctorWhere = branchIds ? { branchId: { in: branchIds } } : clinicIds ? { clinicId: { in: clinicIds } } : {};
    const appointmentWhere = {
      ...(branchIds ? { branchId: { in: branchIds } } : {}),
      ...(clinicIds ? { clinicId: { in: clinicIds } } : {}),
    };
    const subscriptionWhere = clinicIds ? { clinicId: { in: clinicIds } } : {};

    const [
      branches,
      doctors,
      appointmentsToday,
      appointmentsWeek,
      pendingAppointments,
      monthlyRevenue,
      branchManagers,
      recentBranches,
      recentDoctors,
      recentAppointments,
      recentPayments,
      subscriptions,
    ] = await Promise.all([
      prisma.branch.count({ where: branchWhere }),
      prisma.doctor.count({ where: doctorWhere }),
      prisma.appointment.count({
        where: {
          ...appointmentWhere,
          appointmentDate: { gte: today, lt: tomorrow },
        },
      }),
      prisma.appointment.count({
        where: {
          ...appointmentWhere,
          appointmentDate: { gte: today, lt: weekEnd },
        },
      }),
      prisma.appointment.count({
        where: {
          ...appointmentWhere,
          status: 'PENDING',
        },
      }),
      prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          status: 'COMPLETED',
          transactionTime: { gte: monthStart },
          appointment: appointmentWhere,
        },
      }),
      prisma.user.count({
        where: branchIds
          ? {
              role: 'BRANCH_MANAGER',
              managedBranchId: { in: branchIds },
            }
          : clinicIds
            ? {
                role: 'BRANCH_MANAGER',
                managedBranch: { clinicId: { in: clinicIds } },
              }
            : {
                role: 'BRANCH_MANAGER',
              },
      }),
      prisma.branch.findMany({
        where: branchWhere,
        select: { id: true, name: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 2,
      }),
      prisma.doctor.findMany({
        where: doctorWhere,
        select: {
          id: true,
          createdAt: true,
          user: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 2,
      }),
      prisma.appointment.findMany({
        where: appointmentWhere,
        select: {
          id: true,
          createdAt: true,
          patient: { select: { user: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        take: 2,
      }),
      prisma.payment.findMany({
        where: {
          status: 'COMPLETED',
          appointment: appointmentWhere,
        },
        select: {
          id: true,
          amount: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 2,
      }),
      prisma.subscription.findMany({
        where: subscriptionWhere,
        include: {
          clinic: { select: { name: true } },
          plan: { select: { name: true } },
        },
        orderBy: { endDate: 'asc' },
      }),
    ]);

    const recentActivity: ActivityItem[] = [
      ...recentBranches.map((branch) => ({
        id: `branch-${branch.id}`,
        text: `Branch added: ${branch.name}`,
        time: formatRelativeTime(branch.createdAt, now),
        createdAt: branch.createdAt,
      })),
      ...recentDoctors.map((doctor) => ({
        id: `doctor-${doctor.id}`,
        text: `Doctor joined: ${doctor.user.name}`,
        time: formatRelativeTime(doctor.createdAt, now),
        createdAt: doctor.createdAt,
      })),
      ...recentAppointments.map((appointment) => ({
        id: `appointment-${appointment.id}`,
        text: `New appointment for ${appointment.patient.user.name}`,
        time: formatRelativeTime(appointment.createdAt, now),
        createdAt: appointment.createdAt,
      })),
      ...recentPayments.map((payment) => ({
        id: `payment-${payment.id}`,
        text: `Payment received: ${payment.amount.toLocaleString('en-US')} EGP`,
        time: formatRelativeTime(payment.createdAt, now),
        createdAt: payment.createdAt,
      })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 6)
      .map((item) => ({
        id: item.id,
        text: item.text,
        time: item.time,
      }));

    const primarySubscription =
      subscriptions.find((subscription) => subscription.status === 'ACTIVE') ?? subscriptions[0] ?? null;

    return NextResponse.json({
      success: true,
      data: {
        scope,
        scopeLabel,
        branchScope:
          scope === 'branch_manager' && user.managedBranch
            ? {
                branchId: user.managedBranch.id,
                branchName: user.managedBranch.name,
              }
            : null,
        stats: {
          branches,
          doctors,
          staff: branchManagers,
          teamTotal: doctors + branchManagers,
          monthlyRevenue: monthlyRevenue._sum.amount ?? 0,
          appointmentsToday,
          appointmentsWeek,
          pendingAppointments,
        },
        subscription: {
          active: primarySubscription?.status === 'ACTIVE',
          status: primarySubscription?.status ?? 'NONE',
          planName: primarySubscription?.plan.name ?? 'No subscription',
          clinicName: primarySubscription?.clinic.name ?? null,
          daysLeft: getDaysLeft(primarySubscription?.endDate ?? null, now),
          activeCount: subscriptions.filter((subscription) => subscription.status === 'ACTIVE').length,
        },
        recentActivity,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
