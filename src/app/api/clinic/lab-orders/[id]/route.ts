import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  handleApiError, UnauthorizedError, ForbiddenError,
  NotFoundError, ValidationError,
} from '@/lib/errors';
import { UserRole, LabOrderStatus } from '@prisma/client';

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
  doctor:  { select: { id: true, user: { select: { name: true } } } },
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

    return NextResponse.json({ success: true, data: order });
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
      status, notes, totalCost, expectedDate,
      fittingAppointmentId, labId,
    } = body;

    // Validate status if provided
    if (status && !Object.values(LabOrderStatus).includes(status as LabOrderStatus))
      throw new ValidationError('حالة غير صالحة');

    // Build update data
    const data: Record<string, unknown> = {};
    if (status !== undefined)               { data.status = status; Object.assign(data, statusDateUpdate(status as LabOrderStatus)); }
    if (notes !== undefined)                data.notes = notes || null;
    if (totalCost !== undefined)            data.totalCost = parseFloat(totalCost);
    if (expectedDate !== undefined)         data.expectedDate = expectedDate ? new Date(expectedDate) : null;
    if (fittingAppointmentId !== undefined) data.fittingAppointmentId = fittingAppointmentId || null;
    if (labId !== undefined) {
      const lab = await prisma.lab.findFirst({ where: { id: parseInt(labId, 10), clinicId } });
      if (!lab) throw new NotFoundError('المختبر غير موجود');
      data.labId = parseInt(labId, 10);
    }

    const order = await prisma.labOrder.update({
      where: { id },
      data,
      include: ORDER_INCLUDE,
    });

    return NextResponse.json({ success: true, data: order });
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
