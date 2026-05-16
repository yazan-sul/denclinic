import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  handleApiError, UnauthorizedError, ForbiddenError,
  NotFoundError, ValidationError,
} from '@/lib/errors';
import { UserRole, LabOrderStatus, ImpressionType } from '@prisma/client';

// patientPrice raw SQL helper (Prisma v7 WASM adapter doesn't support ALTER TABLE fields)
async function injectPatientPrice<T extends { id: string }>(order: T): Promise<T & { patientPrice: number }> {
  const rows = await prisma.$queryRaw<{ patientPrice: number }[]>`SELECT "patientPrice" FROM "LabOrder" WHERE id = ${order.id}`;
  return { ...order, patientPrice: Number(rows[0]?.patientPrice ?? 0) };
}

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
    return { clinicId: user.doctorProfiles[0].clinicId, doctorId: user.doctorProfiles[0].id, roles };
  if (roles.includes('STAFF') && user.staffProfiles.length > 0)
    return { clinicId: user.staffProfiles[0].clinicId, doctorId: null, roles };
  if (roles.includes('CLINIC_OWNER') && user.clinicsOwned?.id)
    return { clinicId: user.clinicsOwned.id, doctorId: null, roles };
  throw new ForbiddenError('لا تملك صلاحية');
}

// ── Status date mapping ───────────────────────────────────────────────────────

// When transitioning to a status, auto-set the corresponding date
function statusDateUpdate(status: LabOrderStatus): Record<string, Date | null> {
  const now = new Date();
  if (status === 'SENT_TO_LAB')        return { sentDate:      now };
  if (status === 'RECEIVED_AT_CLINIC') return { receivedDate:  now };
  if (status === 'COMPLETED_FITTED')   return { completedDate: now };
  return {};
}

const ORDER_INCLUDE = {
  lab:     { select: { id: true, name: true, phones: true } },
  patient: { select: { id: true, user: { select: { name: true, phoneNumber: true } } } },
  doctor:  { select: { id: true, user: { select: { id: true, name: true } } } },
  branch:  { select: { id: true, name: true } },
  items:   true,
  orderAppointment:   { select: { id: true, appointmentDate: true, appointmentTime: true } },
  fittingAppointment: { select: { id: true, appointmentDate: true, appointmentTime: true } },
  parentOrder:  { select: { id: true } },
  remakeOrders: { select: { id: true, status: true, createdAt: true } },
} as const;

// ── GET /api/clinic/lab-orders/[id] ──────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const { clinicId } = await resolveAccess(decoded.userId);
    const { id } = await params;

    const order = await prisma.labOrder.findFirst({
      where: { id, clinicId },
      include: ORDER_INCLUDE,
    });
    if (!order) throw new NotFoundError('الطلب غير موجود');

    return NextResponse.json({ success: true, data: await injectPatientPrice(order) });
  } catch (error) {
    return handleApiError(error);
  }
}

// ── PATCH /api/clinic/lab-orders/[id] ────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const { clinicId } = await resolveAccess(decoded.userId);
    const { id } = await params;

    const existing = await prisma.labOrder.findFirst({ where: { id, clinicId } });
    if (!existing) throw new NotFoundError('الطلب غير موجود');

    const body = await request.json();
    const {
      status, notes, totalCost, patientPrice, expectedDate,
      fittingAppointmentId, labId,
      sentDate, orderDate, orderAppointmentId, impressionType, items,
    } = body;

    // Validate status transition
    if (status) {
      if (!Object.values(LabOrderStatus).includes(status as LabOrderStatus))
        throw new ValidationError('حالة غير صالحة');

      type AnyStatus = LabOrderStatus | 'CANCELLED';
      const VALID_TRANSITIONS: Partial<Record<AnyStatus, AnyStatus[]>> = {
        DRAFT:              ['SENT_TO_LAB', 'CANCELLED'],
        SENT_TO_LAB:        ['UNDER_CONSTRUCTION', 'DELAYED', 'CANCELLED'],
        UNDER_CONSTRUCTION: ['RECEIVED_AT_CLINIC', 'DELAYED', 'CANCELLED'],
        DELAYED:            ['UNDER_CONSTRUCTION', 'RECEIVED_AT_CLINIC', 'CANCELLED'],
        RECEIVED_AT_CLINIC: ['COMPLETED_FITTED', 'REJECTED'],
        COMPLETED_FITTED:   [],
        REJECTED:           [],
        CANCELLED:          [],
      };

      const allowed = VALID_TRANSITIONS[existing.status as LabOrderStatus] ?? [];
      if (!allowed.includes(status as LabOrderStatus))
        throw new ValidationError(
          `لا يمكن الانتقال من "${existing.status}" إلى "${status}"`
        );
    }

    // Build update data
    const data: Record<string, unknown> = {};
    if (status !== undefined)               { data.status = status; Object.assign(data, statusDateUpdate(status as LabOrderStatus)); }
    if (notes !== undefined)                data.notes = notes || null;
    if (totalCost !== undefined)            data.totalCost = parseFloat(totalCost);
    // patientPrice handled via raw SQL after update (Prisma v7 WASM issue)
    if (expectedDate !== undefined)         data.expectedDate = expectedDate ? new Date(expectedDate) : null;
    if (fittingAppointmentId !== undefined) data.fittingAppointmentId = fittingAppointmentId || null;
    if (impressionType !== undefined)       data.impressionType = impressionType as ImpressionType;
    if (sentDate !== undefined)             data.sentDate  = sentDate  ? new Date(sentDate)  : null;
    if (orderDate !== undefined)            data.orderDate = orderDate ? new Date(orderDate) : undefined;
    if (orderAppointmentId !== undefined)   data.orderAppointmentId = orderAppointmentId || null;
    if (labId !== undefined) {
      const lab = await prisma.lab.findFirst({ where: { id: parseInt(labId, 10), clinicId } });
      if (!lab) throw new NotFoundError('المختبر غير موجود');
      data.labId = parseInt(labId, 10);
    }

    // Items replacement — only for DRAFT orders
    let order;
    if (items !== undefined) {
      if (existing.status !== 'DRAFT')
        throw new ValidationError('لا يمكن تعديل عناصر طلب تم إرساله للمختبر');
      if (!Array.isArray(items) || items.length === 0)
        throw new ValidationError('يجب إضافة عنصر واحد على الأقل');

      order = await prisma.$transaction(async (tx) => {
        await tx.labOrderItem.deleteMany({ where: { labOrderId: id } });
        const updated = await tx.labOrder.update({
          where: { id },
          data: {
            ...data,
            totalCost: items.reduce((s: number, i: any) => s + (parseFloat(i.cost) || 0), 0),
          },
        });
        // Insert items via raw SQL (workaround for Prisma v7 WASM nested-create issue)
        for (const item of items as any[]) {
          const teeth = (item.toothNumbers as number[]).map(Number).join(',');
          await tx.$executeRawUnsafe(
            `INSERT INTO "LabOrderItem" ("labOrderId","category","workType","toothNumbers","material","shade","stumpShade","notes","cost")
             VALUES ($1, $2::"WorkCategory", $3::"WorkType", ARRAY[${teeth}]::integer[], $4::"DentalMaterial", $5, $6, $7, $8)`,
            updated.id, item.category, item.workType, item.material ?? null,
            item.shade ?? null, item.stumpShade ?? null, item.notes ?? null, parseFloat(item.cost) || 0,
          );
        }
        if (patientPrice !== undefined)
          await tx.$executeRaw`UPDATE "LabOrder" SET "patientPrice" = ${parseFloat(patientPrice)} WHERE id = ${id}`;
        return tx.labOrder.findUniqueOrThrow({
          where:   { id },
          include: ORDER_INCLUDE,
        });
      });
    } else {
      order = await prisma.labOrder.update({
        where: { id },
        data,
        include: ORDER_INCLUDE,
      });
      if (patientPrice !== undefined)
        await prisma.$executeRaw`UPDATE "LabOrder" SET "patientPrice" = ${parseFloat(patientPrice)} WHERE id = ${id}`;
    }

    // Cancel payment if order is cancelled
    if (status === 'CANCELLED') {
      await prisma.payment.updateMany({
        where: { labOrderId: id, status: 'PENDING' } as any,
        data:  { status: 'CANCELLED' },
      });
    }

    // Create patient debt when order is received at clinic
    if (status === 'RECEIVED_AT_CLINIC') {
      // Fetch patientPrice via raw SQL (Prisma WASM doesn't return ALTER TABLE fields)
      const [priceRow] = await prisma.$queryRaw<{ patientPrice: number }[]>`
        SELECT "patientPrice" FROM "LabOrder" WHERE id = ${id}
      `;
      const patientPrice = Number(priceRow?.patientPrice ?? 0);
      if (patientPrice > 0) {
        // Get patient's userId
        const patient = await prisma.patient.findUnique({
          where: { id: order.patient.id },
          select: { userId: true },
        });
        if (patient?.userId) {
          // Check existing via raw SQL (labOrderId not recognized by Prisma WASM)
          const [existingRow] = await prisma.$queryRaw<{ id: string }[]>`
            SELECT id FROM "Payment" WHERE "labOrderId" = ${id} LIMIT 1
          `;
          if (!existingRow) {
            const desc = `طلب مختبر — ${order.lab.name} — ${order.patient.user.name}`;
            await prisma.$executeRaw`
              INSERT INTO "Payment" (id, "userId", amount, currency, method, status, "labOrderId", description, "transactionTime", "createdAt", "updatedAt")
              VALUES (gen_random_uuid()::text, ${patient.userId}, ${patientPrice}, 'ILS'::"Currency", 'CASH'::"PaymentMethod", 'PENDING'::"PaymentStatus", ${id}, ${desc}, NOW(), NOW(), NOW())
            `;
          }
        }
      }
    }

    // Notify doctor on status change
    if (status && order.doctor?.user) {
      const STATUS_NOTIF: Partial<Record<LabOrderStatus, string>> = {
        SENT_TO_LAB:        'تم إرسال طلب المختبر',
        UNDER_CONSTRUCTION: 'طلب المختبر قيد التصنيع',
        DELAYED:            'طلب المختبر متأخر',
        RECEIVED_AT_CLINIC: 'تم استلام الطلب من المختبر — جاهز للتركيب',
        COMPLETED_FITTED:   'تم تركيب طلب المختبر بنجاح',
        REJECTED:           'طلب المختبر مرفوض من المختبر',
      };
      const msg = STATUS_NOTIF[status as LabOrderStatus];
      if (msg) {
        const patientName = order.patient?.user?.name;
        await prisma.notification.create({
          data: {
            userId:     order.doctor.user.id,
            type:       'GENERAL',
            title:      'تحديث طلب المختبر',
            message:    patientName ? `${msg} — المريض: ${patientName}` : msg,
            targetRole: 'DOCTOR',
            link:       '/doctor/lab',
          },
        });
      }
    }

    return NextResponse.json({ success: true, data: await injectPatientPrice(order) });
  } catch (error) {
    return handleApiError(error);
  }
}

// ── DELETE /api/clinic/lab-orders/[id] ───────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const { clinicId, roles } = await resolveAccess(decoded.userId);

    if (!roles.includes('STAFF') && !roles.includes('CLINIC_OWNER'))
      throw new ForbiddenError('الحذف للستاف ومالك العيادة فقط');

    const { id } = await params;
    const order = await prisma.labOrder.findFirst({ where: { id, clinicId } });
    if (!order) throw new NotFoundError('الطلب غير موجود');

    // Only allow deleting DRAFT orders
    if (order.status !== 'DRAFT')
      throw new ValidationError('لا يمكن حذف طلب تم إرساله للمختبر');

    await prisma.labOrder.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
