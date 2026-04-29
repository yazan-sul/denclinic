import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminScope } from '@/lib/adminScope';
import { ForbiddenError, NotFoundError, ValidationError, handleApiError } from '@/lib/errors';

type RouteContext = {
  params: Promise<{ memberId: string }>;
};

function parseMemberId(memberId: string) {
  const value = Number(memberId);
  if (!Number.isInteger(value) || value <= 0) {
    throw new ValidationError('Invalid member id');
  }
  return value;
}

function normalizeDate(date: Date) {
  return date.toISOString().split('T')[0];
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const scope = await getAdminScope();
    const { memberId: memberIdParam } = await context.params;
    const memberId = parseMemberId(memberIdParam);
    const body = await request.json();

    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const specialization = typeof body.specialization === 'string' ? body.specialization.trim() : '';
    const branchId = typeof body.branchId === 'number' ? body.branchId : undefined;
    const status = body.status === 'suspended' ? 'SUSPENDED' : 'ACTIVE';

    if (!name || !phone) {
      throw new ValidationError('Name and phone are required');
    }

    const branch = branchId
      ? await prisma.branch.findFirst({
          where: {
            id: branchId,
            ...(scope.branchIds
              ? { id: { in: scope.branchIds } }
              : scope.clinicIds
                ? { clinicId: { in: scope.clinicIds } }
                : {}),
          },
          select: {
            id: true,
            name: true,
            clinicId: true,
          },
        })
      : null;

    if (branchId && !branch) {
      throw new ForbiddenError('You cannot assign this member to the selected branch');
    }

    const doctor = await prisma.doctor.findFirst({
      where: {
        userId: memberId,
        ...(scope.branchIds
          ? { branchId: { in: scope.branchIds } }
          : scope.clinicIds
            ? { clinicId: { in: scope.clinicIds } }
            : {}),
      },
      select: { id: true },
    });

    if (doctor) {
      const updatedDoctor = await prisma.$transaction(async (tx) => {
        await tx.user.update({
          where: { id: memberId },
          data: {
            name,
            phoneNumber: phone,
            isActive: status === 'ACTIVE',
          },
        });

        return tx.doctor.update({
          where: { id: doctor.id },
          data: {
            specialization: specialization || 'طبيب عام',
            status,
            ...(branch ? { branchId: branch.id, clinicId: branch.clinicId } : {}),
          },
          select: {
            userId: true,
            specialization: true,
            status: true,
            createdAt: true,
            branch: { select: { id: true, name: true } },
            user: { select: { name: true, phoneNumber: true, email: true } },
          },
        });
      });

      return NextResponse.json({
        success: true,
        data: {
          id: updatedDoctor.userId,
          name: updatedDoctor.user.name,
          phone: updatedDoctor.user.phoneNumber,
          email: updatedDoctor.user.email ?? '',
          role: 'DOCTOR',
          specialization: updatedDoctor.specialization,
          branchId: updatedDoctor.branch.id,
          branch: updatedDoctor.branch.name,
          status: updatedDoctor.status === 'ACTIVE' ? 'active' : 'suspended',
          joinedAt: normalizeDate(updatedDoctor.createdAt),
        },
      });
    }

    const staff = await prisma.staff.findFirst({
      where: {
        userId: memberId,
        ...(scope.branchIds
          ? { branchId: { in: scope.branchIds } }
          : scope.clinicIds
            ? { clinicId: { in: scope.clinicIds } }
            : {}),
      },
      select: { id: true },
    });

    if (!staff) {
      throw new NotFoundError('Team member not found');
    }

    const updatedStaff = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: memberId },
        data: {
          name,
          phoneNumber: phone,
          isActive: status === 'ACTIVE',
        },
      });

      return tx.staff.update({
        where: { id: staff.id },
        data: {
          title: specialization || null,
          status,
          ...(branch ? { branchId: branch.id, clinicId: branch.clinicId } : {}),
        },
        select: {
          userId: true,
          title: true,
          status: true,
          createdAt: true,
          branch: { select: { id: true, name: true } },
          user: { select: { name: true, phoneNumber: true, email: true } },
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedStaff.userId,
        name: updatedStaff.user.name,
        phone: updatedStaff.user.phoneNumber,
        email: updatedStaff.user.email ?? '',
        role: 'STAFF',
        specialization: updatedStaff.title ?? '',
        branchId: updatedStaff.branch.id,
        branch: updatedStaff.branch.name,
        status: updatedStaff.status === 'ACTIVE' ? 'active' : 'suspended',
        joinedAt: normalizeDate(updatedStaff.createdAt),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const scope = await getAdminScope();
    const { memberId: memberIdParam } = await context.params;
    const memberId = parseMemberId(memberIdParam);

    const doctor = await prisma.doctor.findFirst({
      where: {
        userId: memberId,
        ...(scope.branchIds
          ? { branchId: { in: scope.branchIds } }
          : scope.clinicIds
            ? { clinicId: { in: scope.clinicIds } }
            : {}),
      },
      select: { id: true },
    });

    if (doctor) {
      await prisma.doctor.delete({
        where: { id: doctor.id },
      });

      return NextResponse.json({ success: true });
    }

    const staff = await prisma.staff.findFirst({
      where: {
        userId: memberId,
        ...(scope.branchIds
          ? { branchId: { in: scope.branchIds } }
          : scope.clinicIds
            ? { clinicId: { in: scope.clinicIds } }
            : {}),
      },
      select: { id: true },
    });

    if (!staff) {
      throw new NotFoundError('Team member not found');
    }

    await prisma.staff.delete({
      where: { id: staff.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
