import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { UserRole } from '@prisma/client';

async function resolveClinicId(userId: number): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      staffProfiles:  { select: { clinicId: true } },
      doctorProfiles: { select: { clinicId: true } },
      clinicsOwned:   { select: { id: true } },
    },
  });
  if (!user) throw new UnauthorizedError('غير مصرح');
  const roles = user.roles as UserRole[];
  if (roles.includes('STAFF')        && user.staffProfiles.length  > 0) return user.staffProfiles[0].clinicId;
  if (roles.includes('DOCTOR')       && user.doctorProfiles.length > 0) return user.doctorProfiles[0].clinicId;
  if (roles.includes('CLINIC_OWNER') && user.clinicsOwned?.id)          return user.clinicsOwned.id;
  throw new ForbiddenError('لا تملك صلاحية');
}

// GET /api/clinic/lab-orders/stats
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const clinicId = await resolveClinicId(decoded.userId);

    // ── 1. Status breakdown ───────────────────────────────────────────────────
    type StatusRow = { status: string; count: bigint };
    const statusRows = await prisma.$queryRaw<StatusRow[]>`
      SELECT status::text, COUNT(*) AS count
      FROM "LabOrder"
      WHERE "clinicId" = ${clinicId}
      GROUP BY status
    `;
    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const r of statusRows) {
      byStatus[r.status] = Number(r.count);
      total += Number(r.count);
    }

    // ── 2. Turnaround & on-time (orders with both sentDate and receivedDate) ──
    type TurnaroundRow = {
      avg_days: number | null;
      on_time:  bigint;
      late:     bigint;
      total_tt: bigint;
    };
    const [ttRow] = await prisma.$queryRaw<TurnaroundRow[]>`
      SELECT
        AVG(EXTRACT(EPOCH FROM ("receivedDate" - "sentDate")) / 86400) AS avg_days,
        COUNT(*) FILTER (WHERE "receivedDate" <= "expectedDate") AS on_time,
        COUNT(*) FILTER (WHERE "receivedDate" >  "expectedDate") AS late,
        COUNT(*) AS total_tt
      FROM "LabOrder"
      WHERE "clinicId"     = ${clinicId}
        AND "sentDate"     IS NOT NULL
        AND "receivedDate" IS NOT NULL
    `;
    const avgTurnaroundDays = ttRow?.avg_days !== null ? Math.round((Number(ttRow.avg_days) + Number.EPSILON) * 10) / 10 : null;
    const onTimeCount  = Number(ttRow?.on_time  ?? 0);
    const lateCount    = Number(ttRow?.late     ?? 0);
    const totalWithTT  = Number(ttRow?.total_tt ?? 0);
    const onTimeRate   = totalWithTT > 0 ? Math.round((onTimeCount / totalWithTT) * 100) : null;

    // ── 3. Revenue & pending payments ────────────────────────────────────────
    type RevRow2 = { total_revenue: number; pending_revenue: number };
    const [rev2] = await prisma.$queryRaw<RevRow2[]>`
      SELECT
        COALESCE(SUM("patientPrice") FILTER (WHERE status NOT IN ('CANCELLED','DRAFT')), 0) AS total_revenue,
        COALESCE(SUM("patientPrice") FILTER (WHERE status = 'RECEIVED_AT_CLINIC'), 0)       AS pending_revenue
      FROM "LabOrder"
      WHERE "clinicId" = ${clinicId}
    `;

    // ── 4. Per-lab stats ──────────────────────────────────────────────────────
    type LabRow = {
      lab_id:     number;
      lab_name:   string;
      total:      bigint;
      completed:  bigint;
      rejected:   bigint;
      delayed:    bigint;
      on_time:    bigint;
      late:       bigint;
      total_tt:   bigint;
      avg_days:   number | null;
    };
    const labRows = await prisma.$queryRaw<LabRow[]>`
      SELECT
        l.id   AS lab_id,
        l.name AS lab_name,
        COUNT(lo.id)                                                               AS total,
        COUNT(lo.id) FILTER (WHERE lo.status = 'COMPLETED_FITTED')                AS completed,
        COUNT(lo.id) FILTER (WHERE lo.status = 'REJECTED')                        AS rejected,
        COUNT(lo.id) FILTER (WHERE lo.status = 'DELAYED')                         AS delayed,
        COUNT(lo.id) FILTER (WHERE lo."sentDate" IS NOT NULL AND lo."receivedDate" IS NOT NULL AND lo."receivedDate" <= lo."expectedDate") AS on_time,
        COUNT(lo.id) FILTER (WHERE lo."sentDate" IS NOT NULL AND lo."receivedDate" IS NOT NULL AND lo."receivedDate" >  lo."expectedDate") AS late,
        COUNT(lo.id) FILTER (WHERE lo."sentDate" IS NOT NULL AND lo."receivedDate" IS NOT NULL)                                           AS total_tt,
        AVG(EXTRACT(EPOCH FROM (lo."receivedDate" - lo."sentDate")) / 86400)
          FILTER (WHERE lo."sentDate" IS NOT NULL AND lo."receivedDate" IS NOT NULL) AS avg_days
      FROM "Lab" l
      JOIN "LabOrder" lo ON lo."labId" = l.id
      WHERE lo."clinicId" = ${clinicId}
      GROUP BY l.id, l.name
      ORDER BY total DESC
    `;

    const byLab = labRows.map(r => ({
      labId:           Number(r.lab_id),
      labName:         r.lab_name,
      total:           Number(r.total),
      completed:       Number(r.completed),
      rejected:        Number(r.rejected),
      delayed:         Number(r.delayed),
      onTime:          Number(r.on_time),
      late:            Number(r.late),
      onTimeRate:      Number(r.total_tt) > 0 ? Math.round((Number(r.on_time) / Number(r.total_tt)) * 100) : null,
      avgTurnaroundDays: r.avg_days !== null ? Math.round((Number(r.avg_days) + Number.EPSILON) * 10) / 10 : null,
    }));

    // ── 5. Monthly trend (last 6 months) ─────────────────────────────────────
    type TrendRow = { month: string; count: bigint };
    const trendRows = await prisma.$queryRaw<TrendRow[]>`
      SELECT TO_CHAR("orderDate", 'YYYY-MM') AS month, COUNT(*) AS count
      FROM "LabOrder"
      WHERE "clinicId" = ${clinicId}
        AND "orderDate" >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY month ASC
    `;
    const trend = trendRows.map(r => ({ month: r.month, count: Number(r.count) }));

    return NextResponse.json({
      success: true,
      data: {
        summary: {
          total,
          byStatus,
          avgTurnaroundDays,
          onTimeRate,
          onTimeCount,
          lateCount,
          totalWithTT,
          totalRevenue:   Math.round(Number(rev2?.total_revenue   ?? 0)),
          pendingRevenue: Math.round(Number(rev2?.pending_revenue  ?? 0)),
        },
        byLab,
        trend,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
