import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors';
import { UserRole } from '@prisma/client';

async function resolveClinicId(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      doctorProfiles: { select: { clinicId: true } },
      staffProfiles:  { select: { clinicId: true } },
      clinicsOwned:   { select: { id: true } },
    },
  });
  if (!user) throw new UnauthorizedError('غير مصرح');
  const roles = user.roles as UserRole[];

  if (roles.includes('DOCTOR') && user.doctorProfiles.length > 0)
    return { clinicId: user.doctorProfiles[0].clinicId, roles };
  if (roles.includes('STAFF') && user.staffProfiles.length > 0)
    return { clinicId: user.staffProfiles[0].clinicId, roles };
  if (roles.includes('CLINIC_OWNER') && user.clinicsOwned?.id)
    return { clinicId: user.clinicsOwned.id, roles };
  throw new ForbiddenError('لا تملك صلاحية');
}

async function assertLabAccess(labId: number, clinicId: number) {
  const lab = await prisma.lab.findFirst({ where: { id: labId, clinicId } });
  if (!lab) throw new NotFoundError('المختبر غير موجود');
  return lab;
}

// PATCH /api/clinic/labs/[id]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const { clinicId, roles } = await resolveClinicId(decoded.userId);

    if (!roles.includes('STAFF') && !roles.includes('CLINIC_OWNER'))
      throw new ForbiddenError('صلاحية تعديل المختبرات للستاف ومالك العيادة فقط');

    const { id } = await params;
    const labId = parseInt(id, 10);
    if (isNaN(labId)) throw new NotFoundError('المختبر غير موجود');

    await assertLabAccess(labId, clinicId);

    const body = await request.json();
    const { name, phones, address, contactPerson, email, notes, isActive } = body;

    if (name !== undefined && !name?.trim())
      throw new ValidationError('اسم المختبر لا يمكن أن يكون فارغاً');

    const data: Record<string, unknown> = {};
    if (name          !== undefined) data.name          = name.trim();
    if (phones        !== undefined) data.phones        = Array.isArray(phones) ? phones.map((p: string) => p.trim()).filter(Boolean) : [];
    if (address       !== undefined) data.address       = address?.trim()       || null;
    if (contactPerson !== undefined) data.contactPerson = contactPerson?.trim() || null;
    if (email         !== undefined) data.email         = email?.trim()         || null;
    if (notes         !== undefined) data.notes         = notes?.trim()         || null;
    if (isActive      !== undefined) data.isActive      = Boolean(isActive);

    const lab = await prisma.lab.update({ where: { id: labId }, data });

    return NextResponse.json({ success: true, data: lab });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/clinic/labs/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const { clinicId, roles } = await resolveClinicId(decoded.userId);

    if (!roles.includes('STAFF') && !roles.includes('CLINIC_OWNER'))
      throw new ForbiddenError('صلاحية حذف المختبرات للستاف ومالك العيادة فقط');

    const { id } = await params;
    const labId = parseInt(id, 10);
    if (isNaN(labId)) throw new NotFoundError('المختبر غير موجود');

    await assertLabAccess(labId, clinicId);

    // إذا في طلبات مرتبطة → نوقف المختبر بدل حذفه
    const hasOrders = await prisma.labOrder.findFirst({ where: { labId } });
    if (hasOrders) {
      const lab = await prisma.lab.update({
        where: { id: labId },
        data: { isActive: false },
      });
      return NextResponse.json({ success: true, data: lab, deactivated: true });
    }

    await prisma.lab.delete({ where: { id: labId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
