import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, NotFoundError, ForbiddenError, ValidationError } from '@/lib/errors';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const { patientId: pidStr } = await params;
    const patientId = parseInt(pidStr, 10);
    if (isNaN(patientId)) throw new ValidationError('معرف غير صحيح');

    // Verify guardian access
    const access = await prisma.patientGuardian.findFirst({
      where: { guardianUserId: decoded.userId, patientId, status: 'APPROVED' },
      select: { relationship: true },
    });
    if (!access) throw new ForbiddenError('ليس لديك صلاحية لعرض هذا السجل');

    const [patient, appointments] = await Promise.all([
      prisma.patient.findUnique({
        where: { id: patientId },
        include: {
          user: { select: { name: true, avatar: true } },
        },
      }),
      prisma.appointment.findMany({
        where: { patientId },
        include: {
          clinic: { select: { name: true } },
          doctor: { select: { user: { select: { name: true } } } },
          service: { select: { name: true } },
          treatments: { select: { diagnosis: true, notesPublic: true, status: true, cost: true } },
        },
        orderBy: { appointmentDate: 'desc' },
        take: 50,
      }),
    ]);

    if (!patient) throw new NotFoundError('الملف الطبي غير موجود');

    return NextResponse.json({
      success: true,
      data: { patient, appointments, relationship: access.relationship },
    });
  } catch (error) {
    return handleApiError(error);
  }
}