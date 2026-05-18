import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors';

const MONTH_NAMES = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
const QUARTER_LABELS = ['ر1','ر2','ر3','ر4'];

function gradeFromOccupancy(pct: number): { grade: string; color: string } {
  if (pct >= 90) return { grade: 'A+', color: 'bg-green-500' };
  if (pct >= 80) return { grade: 'A',  color: 'bg-emerald-500' };
  if (pct >= 70) return { grade: 'B+', color: 'bg-blue-500' };
  if (pct >= 60) return { grade: 'B',  color: 'bg-amber-500' };
  return { grade: 'C', color: 'bg-red-500' };
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { roles: true, clinicsOwned: { select: { id: true } } },
    });

    if (!user) throw new UnauthorizedError('المستخدم غير موجود');
    if (!user.roles.includes('CLINIC_OWNER') && !user.roles.includes('ADMIN')) {
      throw new ForbiddenError('غير مصرح بالوصول');
    }

    const clinicId = user.clinicsOwned?.id;
    if (!clinicId) return NextResponse.json({ success: true, data: emptyDashboard() });

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const todayStart = new Date(year, month, now.getDate());
    const todayEnd   = new Date(todayStart.getTime() + 86_400_000);
    const yearStart  = new Date(year, 0, 1);
    const yearEnd    = new Date(year + 1, 0, 1);
    const monthStart = new Date(year, month, 1);
    const monthEnd   = new Date(year, month + 1, 1);

    const [
      branchCount,
      doctorCount,
      staffCount,
      appointmentsToday,
      pendingAppointments,
      revenueResult,
      subscription,
      yearAppts,
      monthAppts,
      prevPatients,
    ] = await Promise.all([
      prisma.branch.count({ where: { clinicId } }),
      prisma.doctor.count({ where: { clinicId } }),
      prisma.staff.count({ where: { clinicId } }),
      prisma.appointment.count({
        where: { clinicId, appointmentDate: { gte: todayStart, lt: todayEnd }, status: { notIn: ['CANCELLED','PAYMENT_FAILED'] } },
      }),
      prisma.appointment.count({ where: { clinicId, status: 'PENDING' } }),
      prisma.payment.aggregate({
        where: { appointment: { clinicId }, status: 'COMPLETED', createdAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
      prisma.subscription.findUnique({
        where: { clinicId },
        select: { status: true, endDate: true, plan: { select: { name: true } } },
      }),
      // All appointments in this year (for revenue chart + service popularity)
      prisma.appointment.findMany({
        where: { clinicId, appointmentDate: { gte: yearStart, lt: yearEnd } },
        select: {
          appointmentDate: true,
          patientId: true,
          doctor: { select: { specialization: true } },
          payment: { select: { amount: true, status: true } },
        },
      }),
      // This month's appointments (for weekly volume + patient acquisition)
      prisma.appointment.findMany({
        where: { clinicId, appointmentDate: { gte: monthStart, lt: monthEnd } },
        select: {
          appointmentDate: true,
          patientId: true,
          branch: { select: { name: true } },
        },
      }),
      // Patients seen before this month (to determine new vs returning)
      prisma.appointment.findMany({
        where: { clinicId, appointmentDate: { lt: monthStart } },
        distinct: ['patientId'],
        select: { patientId: true },
      }),
    ]);

    // ── Subscription ──
    let daysLeft = 0, subActive = false, planName = '';
    if (subscription) {
      daysLeft = Math.max(0, Math.ceil((subscription.endDate.getTime() - now.getTime()) / 86_400_000));
      subActive = subscription.status === 'ACTIVE';
      planName  = subscription.plan.name;
    }

    // ── Revenue chart: monthly (12 buckets) ──
    const revenueMonthly = Array.from({ length: 12 }, (_, m) => {
      const ms = new Date(year, m, 1);
      const me = new Date(year, m + 1, 1);
      const revenue = yearAppts
        .filter((a) => {
          const d = new Date(a.appointmentDate);
          return d >= ms && d < me && a.payment?.status === 'COMPLETED';
        })
        .reduce((s, a) => s + (a.payment!.amount), 0);
      return { label: MONTH_NAMES[m], value: Math.round(revenue) };
    });

    // ── Revenue chart: quarterly (4 buckets, derived from monthly) ──
    const revenueQuarterly = [0, 1, 2, 3].map((q) => ({
      label: `${QUARTER_LABELS[q]} ${year}`,
      value: revenueMonthly.slice(q * 3, q * 3 + 3).reduce((s, d) => s + d.value, 0),
    }));

    // ── Weekly appointment volume (current month) ──
    const lastDay = new Date(year, month + 1, 0);
    const appointmentVolume: { label: string; patients: number }[] = [];
    let ws = new Date(monthStart);
    let weekNum = 1;
    while (ws <= lastDay) {
      const we = new Date(ws.getTime() + 7 * 86_400_000);
      const count = monthAppts.filter((a) => {
        const d = new Date(a.appointmentDate);
        return d >= ws && d < we;
      }).length;
      appointmentVolume.push({ label: `أسبوع ${weekNum}`, patients: count });
      ws = new Date(ws.getTime() + 7 * 86_400_000);
      weekNum++;
    }

    // ── Patient acquisition (current month) ──
    const prevSet = new Set(prevPatients.map((p) => p.patientId));
    const monthPatientIds = new Set(monthAppts.map((a) => a.patientId));
    let newPatients = 0, returningPatients = 0;
    monthPatientIds.forEach((id) => { if (prevSet.has(id)) returningPatients++; else newPatients++; });

    // ── Service popularity (by doctor specialization, year-to-date) ──
    const specMap = new Map<string, number>();
    yearAppts.forEach((a) => {
      const s = a.doctor.specialization || 'أخرى';
      specMap.set(s, (specMap.get(s) ?? 0) + 1);
    });
    const totalSpecAppts = yearAppts.length;
    const servicePopularity = [...specMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({
        name,
        pct: totalSpecAppts > 0 ? Math.round((count / totalSpecAppts) * 100) : 0,
      }));

    // ── Branch efficiency (current month) ──
    const branchMap = new Map<string, number>();
    monthAppts.forEach((a) => {
      branchMap.set(a.branch.name, (branchMap.get(a.branch.name) ?? 0) + 1);
    });
    const totalMonthAppts = monthAppts.length;
    const branchEfficiency = [...branchMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => {
        const occupancy = totalMonthAppts > 0 ? Math.round((count / totalMonthAppts) * 100) : 0;
        return { name, occupancy, ...gradeFromOccupancy(occupancy) };
      });

    return NextResponse.json({
      success: true,
      data: {
        branches: branchCount,
        doctors: doctorCount,
        staff: staffCount,
        appointmentsToday,
        pendingAppointments,
        monthlyRevenue: Math.round(revenueResult._sum.amount ?? 0),
        subscription: { active: subActive, planName, daysLeft },
        revenueMonthly,
        revenueQuarterly,
        appointmentVolume,
        newPatients,
        returningPatients,
        servicePopularity,
        branchEfficiency,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function emptyDashboard() {
  const MONTH_NAMES_LOCAL = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const year = new Date().getFullYear();
  return {
    branches: 0, doctors: 0, staff: 0,
    appointmentsToday: 0, pendingAppointments: 0, monthlyRevenue: 0,
    subscription: { active: false, planName: '', daysLeft: 0 },
    revenueMonthly:   MONTH_NAMES_LOCAL.map((label) => ({ label, value: 0 })),
    revenueQuarterly: QUARTER_LABELS.map((q) => ({ label: `${q} ${year}`, value: 0 })),
    appointmentVolume: [],
    newPatients: 0,
    returningPatients: 0,
    servicePopularity: [],
    branchEfficiency: [],
  };
}
