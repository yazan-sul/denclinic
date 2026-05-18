import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors';

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (mins < 60) return `منذ ${mins || 1} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  if (days === 1) return 'أمس';
  return `منذ ${days} أيام`;
}

const statusLabels: Record<string, string> = {
  PENDING: 'موعد جديد',
  CONFIRMED: 'تأكيد موعد',
  COMPLETED: 'إتمام موعد',
  CANCELLED: 'إلغاء موعد',
  NO_SHOW: 'مريض لم يحضر',
  IN_PROGRESS: 'موعد جارٍ',
  RESCHEDULED: 'إعادة جدولة',
  PAYMENT_FAILED: 'فشل دفع',
};

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
        clinicsOwned: { select: { id: true } },
      },
    });

    if (!user) throw new UnauthorizedError('المستخدم غير موجود');
    if (!user.roles.includes('CLINIC_OWNER') && !user.roles.includes('ADMIN')) {
      throw new ForbiddenError('غير مصرح بالوصول');
    }

    const clinicId = user.clinicsOwned?.id;
    if (!clinicId) {
      return NextResponse.json({
        success: true,
        data: {
          branches: 0, doctors: 0, staff: 0,
          appointmentsToday: 0, pendingAppointments: 0, appointmentsThisWeek: 0,
          monthlyRevenue: 0,
          subscription: { active: false, planName: '', daysLeft: 0 },
          recentActivity: [],
        },
      });
    }

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 86_400_000);
    const weekStart = new Date(todayStart.getTime() - 6 * 86_400_000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      branchCount, doctorCount, staffCount,
      appointmentsToday, pendingAppointments, appointmentsThisWeek,
      revenueResult, subscription, recentAppointments,
    ] = await Promise.all([
      prisma.branch.count({ where: { clinicId } }),
      prisma.doctor.count({ where: { clinicId } }),
      prisma.staff.count({ where: { clinicId } }),
      prisma.appointment.count({
        where: {
          clinicId,
          appointmentDate: { gte: todayStart, lt: todayEnd },
          status: { notIn: ['CANCELLED', 'PAYMENT_FAILED'] },
        },
      }),
      prisma.appointment.count({ where: { clinicId, status: 'PENDING' } }),
      prisma.appointment.count({
        where: {
          clinicId,
          appointmentDate: { gte: weekStart, lt: todayEnd },
          status: { notIn: ['CANCELLED', 'PAYMENT_FAILED'] },
        },
      }),
      prisma.payment.aggregate({
        where: {
          appointment: { clinicId },
          status: 'COMPLETED',
          createdAt: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
      prisma.subscription.findUnique({
        where: { clinicId },
        select: {
          status: true,
          endDate: true,
          plan: { select: { name: true } },
        },
      }),
      prisma.appointment.findMany({
        where: { clinicId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          status: true,
          updatedAt: true,
          patient: { select: { user: { select: { name: true } } } },
          doctor: { select: { user: { select: { name: true } } } },
        },
      }),
    ]);

    let subscriptionDaysLeft = 0;
    let subscriptionActive = false;
    let subscriptionPlanName = '';
    if (subscription) {
      subscriptionDaysLeft = Math.max(0, Math.ceil((subscription.endDate.getTime() - now.getTime()) / 86_400_000));
      subscriptionActive = subscription.status === 'ACTIVE';
      subscriptionPlanName = subscription.plan.name;
    }

    const recentActivity = recentAppointments.map((a) => ({
      id: a.id,
      text: `${statusLabels[a.status] ?? a.status} — ${a.patient.user.name} (د. ${a.doctor.user.name})`,
      time: relativeTime(a.updatedAt),
    }));

    return NextResponse.json({
      success: true,
      data: {
        branches: branchCount,
        doctors: doctorCount,
        staff: staffCount,
        appointmentsToday,
        pendingAppointments,
        appointmentsThisWeek,
        monthlyRevenue: Math.round(revenueResult._sum.amount ?? 0),
        subscription: {
          active: subscriptionActive,
          planName: subscriptionPlanName,
          daysLeft: subscriptionDaysLeft,
        },
        recentActivity,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
