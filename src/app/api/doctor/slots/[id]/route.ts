import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';

// DELETE /api/doctor/slots/[id]
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const doctor = await prisma.doctor.findUnique({ where: { userId: decoded.userId } });
    if (!doctor) throw new ForbiddenError('الطبيب غير موجود');

    const { id } = await params;
    const slotId = parseInt(id, 10);

    const slot = await prisma.slot.findUnique({
      where: { id: slotId },
      select: { id: true, doctorId: true, appointment: { select: { id: true } } },
    });

    if (!slot || slot.doctorId !== doctor.id) throw new ForbiddenError('الموعد غير موجود أو لا تملك صلاحية حذفه');
    if (slot.appointment) throw new ValidationError('لا يمكن حذف موعد محجوز');

    await prisma.slot.delete({ where: { id: slotId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}