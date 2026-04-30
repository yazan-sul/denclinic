import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { UserRole, LabCaseStatus } from '@prisma/client';

// PATCH /api/clinic/lab-cases/[id]
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { roles: true } });
    if (!user) throw new UnauthorizedError('غير مصرح');
    const roles = user.roles as UserRole[];
    if (!roles.some(r => ['DOCTOR','STAFF','CLINIC_OWNER','ADMIN'].includes(r))) throw new ForbiddenError('لا تملك صلاحية');

    const { id } = await params;
    const body = await request.json();
    const { labName, caseType, status, cost, sentDate, deliveryDate, notesPublic, notesInternal } = body;

    const updated = await prisma.labCase.update({
      where: { id: parseInt(id, 10) },
      data: {
        ...(labName       !== undefined && { labName }),
        ...(caseType      !== undefined && { caseType }),
        ...(status        !== undefined && { status: status as LabCaseStatus }),
        ...(cost          !== undefined && { cost: cost ? Number(cost) : null }),
        ...(sentDate      !== undefined && { sentDate: sentDate ? new Date(sentDate) : null }),
        ...(deliveryDate  !== undefined && { deliveryDate: deliveryDate ? new Date(deliveryDate) : null }),
        ...(notesPublic   !== undefined && { notesPublic }),
        ...(notesInternal !== undefined && { notesInternal }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/clinic/lab-cases/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { roles: true } });
    if (!user) throw new UnauthorizedError('غير مصرح');
    const roles = user.roles as UserRole[];
    if (!roles.some(r => ['DOCTOR','STAFF','CLINIC_OWNER','ADMIN'].includes(r))) throw new ForbiddenError('لا تملك صلاحية');

    const { id } = await params;
    await prisma.labCase.delete({ where: { id: parseInt(id, 10) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}