import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { UserRole, TreatmentStatus } from '@prisma/client';

// PATCH /api/clinic/treatments/[id]
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
    const { diagnosis, notesPublic, notesInternal, cost, status } = body;

    const updated = await prisma.treatment.update({
      where: { id: parseInt(id, 10) },
      data: {
        ...(diagnosis     !== undefined && { diagnosis }),
        ...(notesPublic   !== undefined && { notesPublic }),
        ...(notesInternal !== undefined && { notesInternal }),
        ...(cost          !== undefined && { cost: cost ? Number(cost) : null }),
        ...(status        !== undefined && { status: status as TreatmentStatus }),
      },
      include: { labCases: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/clinic/treatments/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { roles: true } });
    if (!user) throw new UnauthorizedError('غير مصرح');
    const roles = user.roles as UserRole[];
    if (!roles.includes('DOCTOR' as UserRole) && !roles.includes('ADMIN' as UserRole)) throw new ForbiddenError('لا تملك صلاحية');

    const { id } = await params;
    await prisma.treatment.delete({ where: { id: parseInt(id, 10) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}