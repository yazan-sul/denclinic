import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import { UserRole } from '@prisma/client';

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

      return tx.labOrder.create({
        data: {
          clinicId,
          branchId:  branchId  ?? original.branchId,
          labId:     original.labId,
          patientId: original.patientId,
          doctorId:  doctorId  ?? original.doctorId,
          impressionType: original.impressionType,
          totalCost:    original.totalCost,    // inherit lab cost from original
          patientPrice: (original as any).patientPrice ?? 0,
          expectedDate: expectedDate ? new Date(expectedDate) : null,
          notes:     notes || `إعادة صنع من طلب مرفوض — ${original.lab?.name ?? ''}`.trim(),
          parentOrderId: original.id,
          items: {
            create: original.items.map((item: any) => ({
              category:     item.category,
              workType:     item.workType,
              toothNumbers: item.toothNumbers,
              material:     item.material,
              shade:        item.shade,
              stumpShade:   item.stumpShade,
              notes:        item.notes,
              cost:         item.cost ?? 0,
            })),
          },
        },
        include: {
          items:       true,
          lab:         { select: { id: true, name: true } },
          patient:     { select: { id: true, user: { select: { name: true } } } },
          parentOrder: { select: { id: true } },
        },
      });
    });

    return NextResponse.json({ success: true, data: remake }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
