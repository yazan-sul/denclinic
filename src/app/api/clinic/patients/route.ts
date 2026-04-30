import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { UserRole } from '@prisma/client';

type SortField = 'name' | 'dateOfBirth' | 'lastAppointment';
type SortDir   = 'asc' | 'desc';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        doctorProfile: { select: { clinicId: true, id: true } },
        staffProfile:  { select: { clinicId: true } },
        clinicsOwned:  { select: { id: true } },
      },
    });

    if (!user) throw new UnauthorizedError('غير مصرح');

    const roles = user.roles as UserRole[];

    let defaultClinicId: number | null = null;
    let doctorId: number | null = null;

    if (roles.includes('DOCTOR') && user.doctorProfile?.clinicId) {
      defaultClinicId = user.doctorProfile.clinicId;
      doctorId = user.doctorProfile.id;
    } else if (roles.includes('STAFF') && user.staffProfile?.clinicId) {
      defaultClinicId = user.staffProfile.clinicId;
    } else if (roles.includes('CLINIC_OWNER') && user.clinicsOwned?.id) {
      defaultClinicId = user.clinicsOwned.id;
    } else if (roles.includes('ADMIN')) {
      // admin passes clinicId explicitly
    }

    const { searchParams } = new URL(request.url);

    // Clinic & branch filters
    const clinicIdParam  = searchParams.get('clinicId');
    const branchIdParam  = searchParams.get('branchId');
    const clinicId       = clinicIdParam ? parseInt(clinicIdParam, 10) : defaultClinicId;
    const branchId       = branchIdParam ? parseInt(branchIdParam, 10) : null;

    if (!clinicId) throw new ForbiddenError('لا يمكن تحديد العيادة');

    // Sorting
    const sortBy:  SortField = (searchParams.get('sortBy')  as SortField) || 'name';
    const sortDir: SortDir   = searchParams.get('sortDir') === 'desc' ? 'desc' : 'asc';

    // Search & pagination
    const search   = searchParams.get('search')?.trim() || '';
    const page     = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(50, parseInt(searchParams.get('pageSize') || '20', 10));

    const appointmentFilter: any = {
      clinicId,
      ...(doctorId  ? { doctorId }  : {}),
      ...(branchId  ? { branchId }  : {}),
    };

    const searchFilter = search
      ? {
          OR: [
            { user: { name:        { contains: search, mode: 'insensitive' as const } } },
            { user: { phoneNumber: { contains: search } } },
          ],
        }
      : {};

    const patientWhere = {
      appointments: { some: appointmentFilter },
      ...searchFilter,
    };

    // Build orderBy — lastAppointment requires post-sort in JS
    const prismaOrderBy: any =
      sortBy === 'name'
        ? { user: { name: sortDir } }
        : sortBy === 'dateOfBirth'
        ? { dateOfBirth: sortDir }
        : { user: { name: 'asc' } }; // lastAppointment: fetch all then sort in JS

    const needsJsSort = sortBy === 'lastAppointment';

    const [total, patients] = await Promise.all([
      prisma.patient.count({ where: patientWhere }),
      prisma.patient.findMany({
        where: patientWhere,
        select: {
          id:          true,
          dateOfBirth: true,
          gender:      true,
          user: {
            select: { id: true, name: true, phoneNumber: true, email: true },
          },
          appointments: {
            where:   appointmentFilter,
            orderBy: { appointmentDate: 'desc' },
            take:    1,
            select: {
              id:              true,
              appointmentDate: true,
              appointmentTime: true,
              status:          true,
              service:         { select: { name: true } },
            },
          },
        },
        orderBy: prismaOrderBy,
        // For JS sort, fetch all on this page range then sort; otherwise paginate normally
        skip: needsJsSort ? 0 : (page - 1) * pageSize,
        take: needsJsSort ? undefined : pageSize,
      }),
    ]);

    // JS sort for lastAppointment
    let result = patients;
    if (needsJsSort) {
      result = [...patients].sort((a, b) => {
        const da = a.appointments[0]?.appointmentDate ? new Date(a.appointments[0].appointmentDate).getTime() : 0;
        const db = b.appointments[0]?.appointmentDate ? new Date(b.appointments[0].appointmentDate).getTime() : 0;
        return sortDir === 'asc' ? da - db : db - da;
      });
      // Apply pagination after sort
      result = result.slice((page - 1) * pageSize, page * pageSize);
    }

    return NextResponse.json({
      success: true,
      data: result,
      pagination: {
        page,
        pageSize,
        total,
        pages: Math.max(1, Math.ceil(total / pageSize)),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}