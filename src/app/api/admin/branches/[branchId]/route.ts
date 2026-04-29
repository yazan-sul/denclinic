import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminScope } from '@/lib/adminScope';
import { ForbiddenError, NotFoundError, ValidationError, handleApiError } from '@/lib/errors';

type RouteContext = {
  params: Promise<{ branchId: string }>;
};

function normalizeDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function parseBranchId(value: string) {
  const branchId = Number(value);
  if (!Number.isInteger(branchId) || branchId <= 0) {
    throw new ValidationError('Invalid branch id');
  }
  return branchId;
}

async function getScopedBranch(branchId: number, scope: Awaited<ReturnType<typeof getAdminScope>>) {
  return prisma.branch.findFirst({
    where: {
      id: branchId,
      ...(scope.branchIds
        ? { id: { in: scope.branchIds } }
        : scope.clinicIds
          ? { clinicId: { in: scope.clinicIds } }
          : {}),
    },
    include: {
      doctors: { select: { id: true } },
      staffMembers: { select: { id: true } },
      manager: { select: { id: true, name: true } },
    },
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const scope = await getAdminScope();
    if (scope.role === 'BRANCH_MANAGER') {
      throw new ForbiddenError('Branch managers cannot edit branches');
    }

    const { branchId: branchIdParam } = await context.params;
    const branchId = parseBranchId(branchIdParam);
    const existing = await getScopedBranch(branchId, scope);

    if (!existing) {
      throw new NotFoundError('Branch not found');
    }

    const body = await request.json();
    const updated = await prisma.branch.update({
      where: { id: branchId },
      data: {
        ...(typeof body.name === 'string' ? { name: body.name.trim() } : {}),
        ...(typeof body.city === 'string' ? { city: body.city.trim() } : {}),
        ...(typeof body.address === 'string' ? { address: body.address.trim() } : {}),
        ...(typeof body.phone === 'string' ? { phone: body.phone.trim() } : {}),
        ...(typeof body.email === 'string' ? { email: body.email.trim() } : {}),
        ...(typeof body.status === 'string'
          ? { status: body.status === 'inactive' ? 'INACTIVE' : 'ACTIVE' }
          : {}),
        ...(typeof body.workingDays === 'string' ? { workingDays: body.workingDays.trim() } : {}),
        ...(typeof body.openTime === 'string' ? { openTime: body.openTime } : {}),
        ...(typeof body.closeTime === 'string' ? { closeTime: body.closeTime } : {}),
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
        id: updated.id,
        clinicId: updated.clinicId,
        name: updated.name,
        city: updated.city ?? '',
        address: updated.address,
        phone: updated.phone ?? '',
        email: updated.email ?? '',
        managerId: updated.manager?.id ?? null,
        managerName: updated.manager?.name ?? null,
        status: updated.status === 'ACTIVE' ? 'active' : 'inactive',
        doctorsCount: updated.doctors.length,
        staffCount: updated.staffMembers.length,
        workingHours: {
          open: updated.openTime ?? '08:00',
          close: updated.closeTime ?? '17:00',
          days: updated.workingDays ?? 'الأحد - الخميس',
        },
        createdAt: normalizeDate(updated.createdAt),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const scope = await getAdminScope();
    if (scope.role === 'BRANCH_MANAGER') {
      throw new ForbiddenError('Branch managers cannot delete branches');
    }

    const { branchId: branchIdParam } = await context.params;
    const branchId = parseBranchId(branchIdParam);
    const existing = await getScopedBranch(branchId, scope);

    if (!existing) {
      throw new NotFoundError('Branch not found');
    }

    await prisma.branch.delete({
      where: { id: branchId },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
