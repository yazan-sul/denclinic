import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';
import { UserRole, TreatmentStatus } from '@prisma/client';

const ALLOWED_ROLES = ['DOCTOR', 'STAFF', 'CLINIC_OWNER', 'ADMIN'];

async function getDoctor(userId: number) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      doctorProfile: { select: { clinicId: true, id: true } },
      staffProfile:  { select: { clinicId: true } },
      clinicsOwned:  { select: { id: true } },
    },
  });
}

// GET /api/clinic/treatments?appointmentId=xxx
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const user = await getDoctor(decoded.userId);
    if (!user) throw new UnauthorizedError('غير مصرح');
    const roles = user.roles as UserRole[];
    if (!roles.some(r => ALLOWED_ROLES.includes(r))) throw new ForbiddenError('لا تملك صلاحية');

    const { searchParams } = new URL(request.url);
    const appointmentId = searchParams.get('appointmentId');
    if (!appointmentId) throw new ValidationError('appointmentId مطلوب');

    const treatments = await prisma.treatment.findMany({
      where: { appointmentId },
      include: {
        labCases: true,
        appointment: {
          select: {
            id: true,
            patient: { select: { id: true, user: { select: { name: true, phoneNumber: true } } } },
            service: { select: { name: true } },
            appointmentDate: true,
            appointmentTime: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, data: treatments });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/clinic/treatments
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const user = await getDoctor(decoded.userId);
    if (!user) throw new UnauthorizedError('غير مصرح');
    const roles = user.roles as UserRole[];
    if (!roles.some(r => ALLOWED_ROLES.includes(r))) throw new ForbiddenError('لا تملك صلاحية');

    const body = await request.json();
    const { appointmentId, diagnosis, notesPublic, notesInternal, cost, status } = body;

    if (!appointmentId) throw new ValidationError('appointmentId مطلوب');

    const treatment = await prisma.treatment.create({
      data: {
        appointmentId,
        diagnosis:     diagnosis     || null,
        notesPublic:   notesPublic   || null,
        notesInternal: notesInternal || null,
        cost:          cost ? Number(cost) : null,
        status:        (status as TreatmentStatus) || 'PLANNED',
      },
      include: { labCases: true },
    });

    return NextResponse.json({ success: true, data: treatment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}