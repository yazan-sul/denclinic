import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import { UserRole } from '@prisma/client';
import { createNotification } from '@/lib/notifications';

async function resolveAccess(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      doctorProfiles: { select: { clinicId: true, id: true, branchId: true } },
      staffProfiles:  { select: { clinicId: true, branchId: true } },
      clinicsOwned:   { select: { id: true } },
    },
  });
  if (!user) throw new UnauthorizedError('غير مصرح');
  const roles = user.roles as UserRole[];

  if (roles.includes('DOCTOR') && user.doctorProfiles.length > 0)
    return { clinicId: user.doctorProfiles[0].clinicId, branchId: user.doctorProfiles[0].branchId, doctorId: user.doctorProfiles[0].id };
  if (roles.includes('STAFF') && user.staffProfiles.length > 0)
    return { clinicId: user.staffProfiles[0].clinicId, branchId: user.staffProfiles[0].branchId, doctorId: null };
  if (roles.includes('CLINIC_OWNER') && user.clinicsOwned?.id)
    return { clinicId: user.clinicsOwned.id, branchId: null, doctorId: null };
  throw new ForbiddenError('لا تملك صلاحية');
}

// POST /api/clinic/lab-orders/[id]/remake
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const { clinicId, branchId, doctorId } = await resolveAccess(decoded.userId);
    const { id } = await params;

    const body = await request.json();
    const { notes, expectedDate } = body;

    const remake = await prisma.$transaction(async (tx) => {
      const original = await tx.labOrder.findFirst({
        where: { id, clinicId },
        include: { items: true, lab: { select: { name: true } } },
      });
      if (!original) throw new NotFoundError('الطلب الأصلي غير موجود');
      if (original.status !== 'REJECTED')
        throw new ValidationError('لا يمكن إنشاء إعادة صنع إلا بعد رفض الطلب');

      const remake = await tx.labOrder.create({
        data: {
          clinicId,
          branchId:  branchId  ?? original.branchId,
          labId:     original.labId,
          patientId: original.patientId,
          doctorId:  doctorId  ?? original.doctorId,
          impressionType: original.impressionType,
          totalCost:    original.totalCost,
          expectedDate: expectedDate ? new Date(expectedDate) : null,
          notes:     notes || `إعادة صنع من طلب مرفوض — ${original.lab?.name ?? ''}`.trim(),
          parentOrderId: original.id,
        },
      });

      // Set patientPrice via raw SQL
      const origPatientPrice = parseFloat(String((original as any).patientPrice ?? 0));
      if (origPatientPrice > 0)
        await tx.$executeRaw`UPDATE "LabOrder" SET "patientPrice" = ${origPatientPrice} WHERE id = ${remake.id}`;

      // Insert items via raw SQL (workaround for Prisma v7 WASM nested-create issue)
      for (const item of original.items as any[]) {
        const teeth = (item.toothNumbers as number[]).map(Number).join(',');
        await tx.$executeRawUnsafe(
          `INSERT INTO "LabOrderItem" ("labOrderId","category","workType","toothNumbers","material","shade","stumpShade","notes","cost")
           VALUES ($1, $2::"WorkCategory", $3::"WorkType", ARRAY[${teeth}]::integer[], $4::"DentalMaterial", $5, $6, $7, $8)`,
          remake.id, item.category, item.workType, item.material ?? null,
          item.shade ?? null, item.stumpShade ?? null, item.notes ?? null, parseFloat(item.cost) || 0,
        );
      }

      return tx.labOrder.findUniqueOrThrow({
        where: { id: remake.id },
        include: {
          items:       true,
          lab:         { select: { id: true, name: true } },
          patient:     { select: { id: true, user: { select: { name: true } } } },
          parentOrder: { select: { id: true } },
        },
      });
    });

    const patientUserId = await prisma.patient.findUnique({
      where: { id: remake.patientId },
      select: { userId: true },
    });
    if (patientUserId?.userId) {
      await createNotification({
        userId: patientUserId.userId, type: 'GENERAL',
        title: 'إعادة صنع طلب المختبر',
        message: `تم رفض طلب المختبر السابق وجارٍ إعادة الصنع. سنعلمك عند الانتهاء.`,
        link: '/patient/bookings', targetRole: 'PATIENT',
      });
    }

    return NextResponse.json({ success: true, data: remake }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
