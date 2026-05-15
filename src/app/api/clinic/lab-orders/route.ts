import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  handleApiError, UnauthorizedError, ForbiddenError,
  ValidationError, NotFoundError,
} from '@/lib/errors';
import { UserRole, LabOrderStatus, WorkCategory, WorkType, DentalMaterial, ImpressionType } from '@prisma/client';

// ── Auth ──────────────────────────────────────────────────────────────────────

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
    return { clinicId: user.doctorProfiles[0].clinicId, branchId: user.doctorProfiles[0].branchId, doctorId: user.doctorProfiles[0].id, roles };
  if (roles.includes('STAFF') && user.staffProfiles.length > 0)
    return { clinicId: user.staffProfiles[0].clinicId, branchId: user.staffProfiles[0].branchId, doctorId: null, roles };
  if (roles.includes('CLINIC_OWNER') && user.clinicsOwned?.id)
    return { clinicId: user.clinicsOwned.id, branchId: null, doctorId: null, roles };
  throw new ForbiddenError('لا تملك صلاحية');
}

// ── Shared include ────────────────────────────────────────────────────────────

const ORDER_INCLUDE = {
  lab:     { select: { id: true, name: true, phones: true } },
  patient: { select: { id: true, user: { select: { name: true, phoneNumber: true } } } },
  doctor:  { select: { id: true, user: { select: { name: true } } } },
  branch:  { select: { id: true, name: true } },
  items:   true,
  orderAppointment:   { select: { id: true, appointmentDate: true, appointmentTime: true } },
  fittingAppointment: { select: { id: true, appointmentDate: true, appointmentTime: true } },
  parentOrder: { select: { id: true } },
  _count:  { select: { remakeOrders: true } },
} as const;

// ── GET /api/clinic/lab-orders ────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const { clinicId, branchId, doctorId } = await resolveAccess(decoded.userId);
    const { searchParams } = new URL(request.url);

    const status     = searchParams.get('status');
    const labId      = searchParams.get('labId');
    const search     = searchParams.get('search')?.trim();
    const fromDate   = searchParams.get('from');
    const toDate     = searchParams.get('to');
    const branchParam = searchParams.get('branchId');
    const sortDir    = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';
    const page       = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize   = Math.min(50, parseInt(searchParams.get('pageSize') || '20', 10));

    const where: any = {
      clinicId,
      ...(branchId && !branchParam ? { branchId } : {}),
      ...(branchParam ? { branchId: parseInt(branchParam, 10) } : {}),
      ...(doctorId   ? { doctorId } : {}),
      ...(status && status !== 'ALL' ? { status: status as LabOrderStatus } : {}),
      ...(labId ? { labId: parseInt(labId, 10) } : {}),
      ...(fromDate || toDate ? {
        orderDate: {
          ...(fromDate ? { gte: new Date(`${fromDate}T00:00:00Z`) } : {}),
          ...(toDate   ? { lte: new Date(`${toDate}T23:59:59Z`)   } : {}),
        },
      } : {}),
      ...(search ? {
        OR: [
          { patient: { user: { name: { contains: search, mode: 'insensitive' as const } } } },
          { lab:     { name: { contains: search, mode: 'insensitive' as const } } },
        ],
      } : {}),
    };

    const [total, orders] = await Promise.all([
      prisma.labOrder.count({ where }),
      prisma.labOrder.findMany({
        where,
        include: ORDER_INCLUDE,
        orderBy: { orderDate: sortDir },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: orders,
      pagination: { page, pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// ── POST /api/clinic/lab-orders ───────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const { clinicId, branchId: profileBranchId, doctorId } = await resolveAccess(decoded.userId);

    const body = await request.json();
    const {
      labId, patientId, branchId: bodyBranchId,
      orderAppointmentId, impressionType,
      totalCost, orderDate, sentDate, expectedDate, notes, items,
    } = body;

    const branchId = bodyBranchId ? parseInt(bodyBranchId, 10) : profileBranchId;
    if (!branchId) throw new ValidationError('الفرع مطلوب');
    if (!labId)    throw new ValidationError('المختبر مطلوب');
    if (!patientId) throw new ValidationError('المريض مطلوب');
    if (!Array.isArray(items) || items.length === 0)
      throw new ValidationError('يجب إضافة عنصر واحد على الأقل');

    // Validate each item
    for (const item of items) {
      if (!item.category || !Object.values(WorkCategory).includes(item.category))
        throw new ValidationError('فئة العمل غير صالحة');
      if (!item.workType || !Object.values(WorkType).includes(item.workType))
        throw new ValidationError('نوع العمل غير صالح');
      if (!Array.isArray(item.toothNumbers) || item.toothNumbers.length === 0)
        throw new ValidationError('يجب تحديد سن واحد على الأقل لكل عنصر');
      if (item.material && !Object.values(DentalMaterial).includes(item.material))
        throw new ValidationError('المادة غير صالحة');
    }

    const order = await prisma.$transaction(async (tx) => {
      // Verify lab belongs to clinic
      const lab = await tx.lab.findFirst({ where: { id: parseInt(labId, 10), clinicId } });
      if (!lab) throw new NotFoundError('المختبر غير موجود');

      // Verify patient has an appointment in this clinic
      const patientAccess = await tx.appointment.findFirst({
        where: { patientId: parseInt(patientId, 10), clinicId },
      });
      if (!patientAccess) throw new ForbiddenError('لا تملك صلاحية الوصول لهذا المريض');

      return tx.labOrder.create({
        data: {
          clinicId,
          branchId,
          labId:     parseInt(labId, 10),
          patientId: parseInt(patientId, 10),
          doctorId:  doctorId ?? null,
          orderAppointmentId:  orderAppointmentId  || null,
          impressionType: (impressionType as ImpressionType) || 'PHYSICAL',
          orderDate:    orderDate    ? new Date(orderDate)    : undefined,
          sentDate:     sentDate     ? new Date(sentDate)     : null,
          totalCost:    totalCost    ? parseFloat(totalCost)  : 0,
          expectedDate: expectedDate ? new Date(expectedDate) : null,
          notes:        notes || null,
          items: {
            create: items.map((item: any) => ({
              category:     item.category     as WorkCategory,
              workType:     item.workType     as WorkType,
              toothNumbers: item.toothNumbers as number[],
              material:     item.material     ? item.material as DentalMaterial : null,
              shade:        item.shade        || null,
              stumpShade:   item.stumpShade   || null,
              notes:        item.notes        || null,
            })),
          },
        },
        include: ORDER_INCLUDE,
      });
    });

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
