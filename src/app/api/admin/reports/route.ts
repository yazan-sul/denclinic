import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';

type Period = 'week' | 'month' | 'quarter' | 'year';

function getDateRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  let start: Date;
  switch (period) {
    case 'week':
      start = new Date(end.getTime() - 7 * 86_400_000);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), q * 3, 1);
      break;
    }
    default: // year
      start = new Date(now.getFullYear(), 0, 1);
  }
  return { start, end };
}

type ApptRow = {
  id: string;
  appointmentDate: Date;
  status: string;
  patientId: number;
  doctorId: number;
  doctor: { specialization: string; user: { name: string } };
  branch: { name: string };
  payment: { amount: number; status: string } | null;
};

const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
const MONTH_NAMES = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

function apptRevenue(a: ApptRow): number {
  return a.payment?.status === 'COMPLETED' ? a.payment.amount : 0;
}

function buildChart(appts: ApptRow[], period: Period) {
  const now = new Date();

  if (period === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = d.toDateString();
      const bucket = appts.filter((a) => new Date(a.appointmentDate).toDateString() === key);
      return { label: DAY_NAMES[d.getDay()], appointments: bucket.length, revenue: Math.round(bucket.reduce((s, a) => s + apptRevenue(a), 0)) };
    });
  }

  if (period === 'month') {
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const result = [];
    let ws = new Date(firstDay);
    let wn = 1;
    while (ws <= lastDay) {
      const we = new Date(ws.getTime() + 7 * 86_400_000);
      const bucket = appts.filter((a) => { const d = new Date(a.appointmentDate); return d >= ws && d < we; });
      result.push({ label: `أ${wn}`, appointments: bucket.length, revenue: Math.round(bucket.reduce((s, a) => s + apptRevenue(a), 0)) });
      ws = new Date(ws.getTime() + 7 * 86_400_000);
      wn++;
    }
    return result;
  }

  if (period === 'quarter') {
    const q = Math.floor(now.getMonth() / 3);
    return Array.from({ length: 3 }, (_, i) => {
      const m = q * 3 + i;
      const ms = new Date(now.getFullYear(), m, 1);
      const me = new Date(now.getFullYear(), m + 1, 1);
      const bucket = appts.filter((a) => { const d = new Date(a.appointmentDate); return d >= ms && d < me; });
      return { label: MONTH_NAMES[m], appointments: bucket.length, revenue: Math.round(bucket.reduce((s, a) => s + apptRevenue(a), 0)) };
    });
  }

  // year
  return Array.from({ length: 12 }, (_, m) => {
    const ms = new Date(now.getFullYear(), m, 1);
    const me = new Date(now.getFullYear(), m + 1, 1);
    const bucket = appts.filter((a) => { const d = new Date(a.appointmentDate); return d >= ms && d < me; });
    return { label: MONTH_NAMES[m], appointments: bucket.length, revenue: Math.round(bucket.reduce((s, a) => s + apptRevenue(a), 0)) };
  });
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
    if (!clinicId) {
      return NextResponse.json({ success: true, data: emptyReports() });
    }

    const rawPeriod = request.nextUrl.searchParams.get('period') ?? 'month';
    if (!['week', 'month', 'quarter', 'year'].includes(rawPeriod)) throw new ValidationError('الفترة غير صالحة');
    const period = rawPeriod as Period;

    const { start, end } = getDateRange(period);

    const [appts, prevPatientRows] = await Promise.all([
      prisma.appointment.findMany({
        where: { clinicId, appointmentDate: { gte: start, lt: end } },
        select: {
          id: true,
          appointmentDate: true,
          status: true,
          patientId: true,
          doctorId: true,
          doctor: { select: { specialization: true, user: { select: { name: true } } } },
          branch: { select: { name: true } },
          payment: { select: { amount: true, status: true } },
        },
      }),
      prisma.appointment.findMany({
        where: { clinicId, appointmentDate: { lt: start } },
        distinct: ['patientId'],
        select: { patientId: true },
      }),
    ]);

    const prevSet = new Set(prevPatientRows.map((p) => p.patientId));
    const periodSet = new Set(appts.map((a) => a.patientId));
    let newPatients = 0;
    let returningPatients = 0;
    periodSet.forEach((id) => { if (prevSet.has(id)) returningPatients++; else newPatients++; });

    const statusCounts: Record<string, number> = {};
    appts.forEach((a) => { statusCounts[a.status] = (statusCounts[a.status] ?? 0) + 1; });

    const totalAppointments = appts.length;
    const completed = statusCounts['COMPLETED'] ?? 0;
    const attendanceRate = totalAppointments > 0 ? Math.round((completed / totalAppointments) * 100) : 0;
    const totalRevenue = appts.reduce((s, a) => s + apptRevenue(a), 0);

    const appointmentsByStatus = [
      { label: 'مكتمل', count: statusCounts['COMPLETED'] ?? 0, color: 'bg-green-500' },
      { label: 'ملغي', count: statusCounts['CANCELLED'] ?? 0, color: 'bg-red-500' },
      { label: 'لم يحضر', count: statusCounts['NO_SHOW'] ?? 0, color: 'bg-amber-500' },
      { label: 'معلق', count: statusCounts['PENDING'] ?? 0, color: 'bg-blue-500' },
    ].filter((s) => s.count > 0);

    const stats = [
      { label: 'إجمالي المواعيد', value: totalAppointments, change: 0, icon: '📅', color: 'primary' },
      { label: 'الإيرادات', value: `${Math.round(totalRevenue).toLocaleString('ar')}₪`, change: 0, icon: '💰', color: 'green' },
      { label: 'مرضى جدد', value: newPatients, change: 0, icon: '👥', color: 'purple' },
      { label: 'معدل الحضور', value: `${attendanceRate}%`, change: 0, icon: '✅', color: 'blue' },
    ];

    // Top doctors
    const doctorMap = new Map<number, { name: string; specialization: string; appointments: number; revenue: number }>();
    appts.forEach((a) => {
      if (!doctorMap.has(a.doctorId)) {
        doctorMap.set(a.doctorId, { name: a.doctor.user.name, specialization: a.doctor.specialization, appointments: 0, revenue: 0 });
      }
      const d = doctorMap.get(a.doctorId)!;
      d.appointments++;
      d.revenue += apptRevenue(a);
    });
    const topDoctors = [...doctorMap.values()]
      .sort((a, b) => b.appointments - a.appointments)
      .slice(0, 5)
      .map((d) => ({ ...d, revenue: Math.round(d.revenue), rating: 4.5 }));

    // Top branches
    const branchMap = new Map<string, { appointments: number; revenue: number }>();
    appts.forEach((a) => {
      if (!branchMap.has(a.branch.name)) branchMap.set(a.branch.name, { appointments: 0, revenue: 0 });
      const b = branchMap.get(a.branch.name)!;
      b.appointments++;
      b.revenue += apptRevenue(a);
    });
    const totalBranchAppts = appts.length;
    const topBranches = [...branchMap.entries()]
      .sort((a, b) => b[1].appointments - a[1].appointments)
      .map(([name, d]) => ({
        name,
        appointments: d.appointments,
        revenue: Math.round(d.revenue),
        occupancy: totalBranchAppts > 0 ? Math.round((d.appointments / totalBranchAppts) * 100) : 0,
      }));

    return NextResponse.json({
      success: true,
      data: { stats, chart: buildChart(appts, period), topDoctors, topBranches, appointmentsByStatus, newPatients, returningPatients },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function emptyReports() {
  return {
    stats: [
      { label: 'إجمالي المواعيد', value: 0, change: 0, icon: '📅', color: 'primary' },
      { label: 'الإيرادات', value: '0₪', change: 0, icon: '💰', color: 'green' },
      { label: 'مرضى جدد', value: 0, change: 0, icon: '👥', color: 'purple' },
      { label: 'معدل الحضور', value: '0%', change: 0, icon: '✅', color: 'blue' },
    ],
    chart: [],
    topDoctors: [],
    topBranches: [],
    appointmentsByStatus: [],
    newPatients: 0,
    returningPatients: 0,
  };
}
