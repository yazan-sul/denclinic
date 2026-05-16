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

    const status       = searchParams.get('status');
    const labId        = searchParams.get('labId');
    const patientIdParam = searchParams.get('patientId');
    const search       = searchParams.get('search')?.trim();
    const fromDate     = searchParams.get('from');
    const toDate       = searchParams.get('to');
    const expectedFrom = searchParams.get('expectedFrom');
    const expectedTo   = searchParams.get('expectedTo');
    const branchParam  = searchParams.get('branchId');
    const sortBy       = searchParams.get('sortBy') || 'orderDate';
    const sortDir      = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';
    const page         = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize     = Math.min(50, parseInt(searchParams.get('pageSize') || '20', 10));

    const where: any = {
      clinicId,
      ...(branchId && !branchParam ? { branchId } : {}),
      ...(branchParam ? { branchId: parseInt(branchParam, 10) } : {}),
      ...(doctorId   ? { doctorId } : {}),
      ...(status && status !== 'ALL' ? { status: status as LabOrderStatus } : {}),
      ...(labId        ? { labId:     parseInt(labId,        10) } : {}),
      ...(patientIdParam ? { patientId: parseInt(patientIdParam, 10) } : {}),
      ...(fromDate || toDate ? {
        orderDate: {
          ...(fromDate ? { gte: new Date(`${fromDate}T00:00:00Z`) } : {}),
          ...(toDate   ? { lte: new Date(`${toDate}T23:59:59Z`)   } : {}),
        },
      } : {}),
      ...(expectedFrom || expectedTo ? {
        expectedDate: {
          ...(expectedFrom ? { gte: new Date(`${expectedFrom}T00:00:00Z`) } : {}),
          ...(expectedTo   ? { lte: new Date(`${expectedTo}T23:59:59Z`)   } : {}),
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
        orderBy: sortBy === 'expectedDate'
          ? [{ expectedDate: sortDir }, { orderDate: 'desc' as const }]
          : { orderDate: sortDir },
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

    const { clinicId: profileClinicId, branchId: profileBranchId, doctorId: profileDoctorId } = await resolveAccess(decoded.userId);

    const body = await request.json();
    const {
      labId, patientId,
      clinicId: bodyClinicId, branchId: bodyBranchId,
      orderAppointmentId, impressionType,
      totalCost, patientPrice, orderDate, sentDate, expectedDate, notes, items,
    } = body;

    // Allow multi-clinic doctors to specify which clinic they're acting for
    let clinicId   = profileClinicId;
    let branchId   = profileBranchId;
    let resolvedDoctorId = profileDoctorId;

    if (bodyClinicId && parseInt(bodyClinicId, 10) !== profileClinicId) {
      // Validate doctor belongs to the requested clinic
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { doctorProfiles: { select: { clinicId: true, branchId: true, id: true } } },
      });
      const profile = user?.doctorProfiles.find(p => p.clinicId === parseInt(bodyClinicId, 10));
      if (!profile) throw new ForbiddenError('لا تنتمي لهذه العيادة');
      clinicId         = profile.clinicId;
      branchId         = profile.branchId;
      resolvedDoctorId = profile.id;
    }

    if (bodyBranchId) branchId = parseInt(bodyBranchId, 10);
    if (!branchId)  throw new ValidationError('الفرع مطلوب');
    if (!labId)     throw new ValidationError('المختبر مطلوب');
    if (!patientId) throw new ValidationError('المريض مطلوب');
    if (!Array.isArray(items) || items.length === 0)
      throw new ValidationError('يجب إضافة عنصر واحد على الأقل');

    if (!resolvedDoctorId)
      throw new ValidationError('يجب تحديد الطبيب المعالج');

    // Fix 6: date order validation
    const d = {
      order:    orderDate    ? new Date(orderDate)    : new Date(),
      sent:     sentDate     ? new Date(sentDate)     : null,
      expected: expectedDate ? new Date(expectedDate) : null,
    };
    if (d.sent && d.sent < d.order)
      throw new ValidationError('تاريخ التسليم للمختبر لا يمكن أن يكون قبل تاريخ الإنشاء');
    if (d.expected && d.sent && d.expected < d.sent)
      throw new ValidationError('تاريخ الاستلام من المختبر لا يمكن أن يكون قبل تاريخ التسليم');
    if (d.expected && !d.sent && d.expected < d.order)
      throw new ValidationError('تاريخ الاستلام من المختبر لا يمكن أن يكون قبل تاريخ الإنشاء');

    // Validate each item + tooth logic
    const SINGLE_TOOTH_TYPES = new Set(['SINGLE_CROWN','VENEER_EMAX','INLAY_ONLAY','IMPLANT_CROWN']);
    const usedTeeth = new Set<number>();

    for (const item of items) {
      if (!item.category || !Object.values(WorkCategory).includes(item.category))
        throw new ValidationError('فئة العمل غير صالحة');
      if (!item.workType || !Object.values(WorkType).includes(item.workType))
        throw new ValidationError('نوع العمل غير صالح');
      if (!Array.isArray(item.toothNumbers) || item.toothNumbers.length === 0)
        throw new ValidationError('يجب تحديد سن واحد على الأقل لكل عنصر');
      if (item.material && !Object.values(DentalMaterial).includes(item.material))
        throw new ValidationError('المادة غير صالحة');

      const teeth: number[] = item.toothNumbers;

      // Fix 3: single-tooth work types
      if (SINGLE_TOOTH_TYPES.has(item.workType) && teeth.length !== 1)
        throw new ValidationError(`${item.workType} يتطلب تحديد سن واحد فقط`);

      // Fix 4: bridge — consecutive in dental arc order (allows crossing midline)
      if (item.workType === 'DENTAL_BRIDGE') {
        if (teeth.length < 2)
          throw new ValidationError('الجسر يتطلب سنين متتاليين على الأقل');
        const isUpper = teeth.every((t: number) => t >= 11 && t <= 28);
        const isLower = teeth.every((t: number) => t >= 31 && t <= 48);
        if (!isUpper && !isLower)
          throw new ValidationError('أسنان الجسر يجب أن تكون كلها في نفس الفك');
        const UPPER_ARC = [18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28];
        const LOWER_ARC = [48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38];
        const arc = isUpper ? UPPER_ARC : LOWER_ARC;
        const indices = teeth.map((t: number) => arc.indexOf(t)).sort((a: number, b: number) => a - b);
        for (let i = 0; i < indices.length - 1; i++)
          if (indices[i + 1] !== indices[i] + 1)
            throw new ValidationError('أسنان الجسر يجب أن تكون متتالية على القوس السني');
      }

      // Fix 2: no duplicate teeth across items
      for (const tooth of teeth) {
        if (usedTeeth.has(tooth))
          throw new ValidationError(`السن ${tooth} مكرر في أكثر من عنصر`);
        usedTeeth.add(tooth);
      }
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
          doctorId:  resolvedDoctorId,
          orderAppointmentId:  orderAppointmentId  || null,
          impressionType: (impressionType as ImpressionType) || 'PHYSICAL',
          orderDate:    orderDate    ? new Date(orderDate)    : undefined,
          sentDate:     sentDate     ? new Date(sentDate)     : null,
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
              cost:         item.cost         ? parseFloat(item.cost) : 0,
            })),
          },
          // totalCost = lab cost (auto from items); patientPrice = what patient pays
          totalCost:    items.reduce((s: number, i: any) => s + (parseFloat(i.cost) || 0), 0),
          patientPrice: patientPrice ? parseFloat(patientPrice) : 0,
        },
        include: ORDER_INCLUDE,
      });
    });

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
