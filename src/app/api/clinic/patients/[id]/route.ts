import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors';
import { UserRole } from '@prisma/client';

async function resolveAccess(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      doctorProfile: { select: { clinicId: true, id: true } },
      staffProfile:  { select: { clinicId: true } },
      clinicsOwned:  { select: { id: true } },
    },
  });
  if (!user) throw new UnauthorizedError('غير مصرح');
  const roles = user.roles as UserRole[];

  if (roles.includes('DOCTOR') && user.doctorProfile?.clinicId)
    return { clinicId: user.doctorProfile.clinicId, doctorId: user.doctorProfile.id };
  if (roles.includes('STAFF') && user.staffProfile?.clinicId)
    return { clinicId: user.staffProfile.clinicId, doctorId: null };
  if (roles.includes('CLINIC_OWNER') && user.clinicsOwned?.id)
    return { clinicId: user.clinicsOwned.id, doctorId: null };
  throw new ForbiddenError('لا تملك صلاحية');
}

// GET /api/clinic/patients/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const { clinicId, doctorId } = await resolveAccess(decoded.userId);
    const { id } = await params;
    const patientId = parseInt(id, 10);
    if (isNaN(patientId)) throw new NotFoundError('مريض غير موجود');

    // Verify patient has at least one appointment in this clinic (clinic-level access)
    const accessCheck = await prisma.appointment.findFirst({
      where: { patientId, clinicId },
      select: { id: true },
    });
    if (!accessCheck) throw new ForbiddenError('لا تملك صلاحية الوصول لهذا المريض');

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        user: {
          select: { id: true, name: true, phoneNumber: true, email: true },
        },
        appointments: {
          where: { clinicId },
          orderBy: { appointmentDate: 'desc' },
          include: {
            service:  { select: { name: true } },
            doctor:   { select: { id: true, user: { select: { name: true } } } },
            branch:   { select: { id: true, name: true } },
            treatments: {
              orderBy: { createdAt: 'desc' },
              include: {
                labCases: {
                  orderBy: { createdAt: 'desc' },
                },
              },
            },
          },
        },
      },
    });

    if (!patient) throw new NotFoundError('مريض غير موجود');

    return NextResponse.json({ success: true, data: patient });
  } catch (error) {
    return handleApiError(error);
  }
}