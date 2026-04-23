import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';
import { UserRole, LabCaseStatus } from '@prisma/client';

async function resolveClinicId(userId: number) {
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
    return { clinicId: user.doctorProfile.clinicId, doctorId: user.doctorProfile.id, roles };
  if (roles.includes('STAFF') && user.staffProfile?.clinicId)
    return { clinicId: user.staffProfile.clinicId, doctorId: null, roles };
  if (roles.includes('CLINIC_OWNER') && user.clinicsOwned?.id)
    return { clinicId: user.clinicsOwned.id, doctorId: null, roles };
  throw new ForbiddenError('لا تملك صلاحية');
}

// GET /api/clinic/lab-cases?treatmentId=x OR ?clinicId=x&status=x&search=x
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const { clinicId, doctorId } = await resolveClinicId(decoded.userId);

    const { searchParams } = new URL(request.url);
    const treatmentId      = searchParams.get('treatmentId');
    const status           = searchParams.get('status');
    const caseType         = searchParams.get('caseType')?.trim();
    const labNameFilter    = searchParams.get('labName')?.trim();
    const search           = searchParams.get('search')?.trim();
    const branchIdParam    = searchParams.get('branchId');
    const overrideClinicId = searchParams.get('clinicId');
    const sortBy           = searchParams.get('sortBy')  || 'createdAt';
    const sortDir          = searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc';
    const page             = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize         = Math.min(50, parseInt(searchParams.get('pageSize') || '20', 10));

    // Allow clinic override (doctor can only filter within their own clinic)
    const effectiveClinicId = overrideClinicId ? parseInt(overrideClinicId, 10) : clinicId;

    const where: any = {
      treatment: {
        appointment: {
          clinicId: effectiveClinicId,
          ...(doctorId ? { doctorId } : {}),
          ...(branchIdParam ? { branchId: parseInt(branchIdParam, 10) } : {}),
        },
      },
      ...(treatmentId ? { treatmentId: parseInt(treatmentId, 10) } : {}),
      ...(status         && status         !== 'ALL' ? { status:   status as LabCaseStatus } : {}),
      ...(caseType       && caseType       !== 'ALL' ? { caseType: { contains: caseType,    mode: 'insensitive' as const } } : {}),
      ...(labNameFilter  && labNameFilter  !== 'ALL' ? { labName:  { contains: labNameFilter, mode: 'insensitive' as const } } : {}),
      ...(search ? {
        OR: [
          { labName:  { contains: search, mode: 'insensitive' } },
          { caseType: { contains: search, mode: 'insensitive' } },
          { treatment: { appointment: { patient: { user: { name: { contains: search, mode: 'insensitive' } } } } } },
        ],
      } : {}),
    };

    const [total, labCases, caseTypes, labNames] = await Promise.all([
      prisma.labCase.count({ where }),
      prisma.labCase.findMany({
        where,
        include: {
          treatment: {
            select: {
              id:        true,
              diagnosis: true,
              appointment: {
                select: {
                  id:              true,
                  appointmentDate: true,
                  appointmentTime: true,
                  patient: { select: { id: true, user: { select: { name: true, phoneNumber: true } } } },
                  doctor:  { select: { id: true, user: { select: { name: true } } } },
                  service: { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: sortBy === 'labName'      ? { labName:      sortDir }
               : sortBy === 'cost'         ? { cost:         sortDir }
               : sortBy === 'deliveryDate' ? { deliveryDate: sortDir }
               : { createdAt: sortDir },
        skip:    (page - 1) * pageSize,
        take:    pageSize,
      }),
      prisma.labCase.findMany({
        where: { treatment: { appointment: { clinicId: effectiveClinicId } } },
        select: { caseType: true },
        distinct: ['caseType'],
        orderBy: { caseType: 'asc' },
      }),
      prisma.labCase.findMany({
        where: { treatment: { appointment: { clinicId: effectiveClinicId } } },
        select: { labName: true },
        distinct: ['labName'],
        orderBy: { labName: 'asc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: labCases,
      caseTypes: caseTypes.map((c: any) => c.caseType),
      labNames:  labNames.map((l: any)  => l.labName),
      pagination: { page, pageSize, total, pages: Math.max(1, Math.ceil(total / pageSize)) },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/clinic/lab-cases
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    await resolveClinicId(decoded.userId);

    const body = await request.json();
    const { treatmentId, labName, caseType, cost, deliveryDate, notesPublic, notesInternal } = body;

    if (!treatmentId) throw new ValidationError('treatmentId مطلوب');
    if (!labName)     throw new ValidationError('اسم المختبر مطلوب');
    if (!caseType)    throw new ValidationError('نوع الحالة مطلوب');

    const labCase = await prisma.labCase.create({
      data: {
        treatmentId:   parseInt(treatmentId, 10),
        labName,
        caseType,
        cost:          cost          ? Number(cost)          : null,
        deliveryDate:  deliveryDate  ? new Date(deliveryDate) : null,
        notesPublic:   notesPublic   || null,
        notesInternal: notesInternal || null,
      },
    });

    return NextResponse.json({ success: true, data: labCase }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}