import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminScope } from '@/lib/adminScope';
import { ForbiddenError, ValidationError, handleApiError } from '@/lib/errors';

function normalizeDate(date: Date) {
  return date.toISOString().split('T')[0];
}

async function resolveClinicId(scope: Awaited<ReturnType<typeof getAdminScope>>, clinicId?: number) {
  if (clinicId) {
    if (scope.clinicIds && !scope.clinicIds.includes(clinicId)) {
      throw new ForbiddenError('You cannot create a branch for this clinic');
    }
    return clinicId;
  }

  if (scope.clinicIds?.length) {
    return scope.clinicIds[0];
  }

  const firstClinic = await prisma.clinic.findFirst({
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  if (!firstClinic) {
    throw new ValidationError('No clinic available to attach this branch');
  }

  return firstClinic.id;
}

export async function GET() {
  try {
    const scope = await getAdminScope();
    const branchWhere = scope.branchIds
      ? { id: { in: scope.branchIds } }
      : scope.clinicIds
        ? { clinicId: { in: scope.clinicIds } }
        : {};

    const branches = await prisma.branch.findMany({
      where: branchWhere,
      include: {
        doctors: { select: { id: true } },
        staffMembers: { select: { id: true } },
        manager: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: branches.map((branch) => ({
        id: branch.id,
        clinicId: branch.clinicId,
        name: branch.name,
        city: branch.city ?? '',
        address: branch.address,
        phone: branch.phone ?? '',
        email: branch.email ?? '',
        managerId: branch.manager?.id ?? null,
        managerName: branch.manager?.name ?? null,
        status: branch.status === 'ACTIVE' ? 'active' : 'inactive',
        doctorsCount: branch.doctors.length,
        staffCount: branch.staffMembers.length,
        workingHours: {
          open: branch.openTime ?? '08:00',
          close: branch.closeTime ?? '17:00',
          days: branch.workingDays ?? 'الأحد - الخميس',
        },
        createdAt: normalizeDate(branch.createdAt),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const scope = await getAdminScope();
    if (scope.role === 'BRANCH_MANAGER') {
      throw new ForbiddenError('Branch managers cannot create branches');
    }

    const body = await request.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const city = typeof body.city === 'string' ? body.city.trim() : '';

    if (!name || !city) {
      throw new ValidationError('Branch name and city are required');
    }

    const clinicId = await resolveClinicId(scope, typeof body.clinicId === 'number' ? body.clinicId : undefined);
    const created = await prisma.branch.create({
      data: {
        clinicId,
        name,
        city,
        address: typeof body.address === 'string' ? body.address.trim() : '',
        phone: typeof body.phone === 'string' ? body.phone.trim() : '',
        email: typeof body.email === 'string' ? body.email.trim() : '',
        latitude: typeof body.latitude === 'number' ? body.latitude : 0,
        longitude: typeof body.longitude === 'number' ? body.longitude : 0,
        workingDays: typeof body.workingDays === 'string' ? body.workingDays.trim() : 'الأحد - الخميس',
        openTime: typeof body.openTime === 'string' ? body.openTime : '08:00',
        closeTime: typeof body.closeTime === 'string' ? body.closeTime : '17:00',
      },
      include: {
        doctors: { select: { id: true } },
        staffMembers: { select: { id: true } },
        manager: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: created.id,
        clinicId: created.clinicId,
        name: created.name,
        city: created.city ?? '',
        address: created.address,
        phone: created.phone ?? '',
        email: created.email ?? '',
        managerId: created.manager?.id ?? null,
        managerName: created.manager?.name ?? null,
        status: created.status === 'ACTIVE' ? 'active' : 'inactive',
        doctorsCount: created.doctors.length,
        staffCount: created.staffMembers.length,
        workingHours: {
          open: created.openTime ?? '08:00',
          close: created.closeTime ?? '17:00',
          days: created.workingDays ?? 'الأحد - الخميس',
        },
        createdAt: normalizeDate(created.createdAt),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
