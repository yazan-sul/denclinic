import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminScope } from '@/lib/adminScope';
import { ForbiddenError, ValidationError, handleApiError } from '@/lib/errors';
import { allPermissions, defaultPermissionsByRole, type PermissionRole } from '@/lib/adminPermissions';

async function ensureDefaults() {
  const entries = Object.entries(defaultPermissionsByRole) as Array<[PermissionRole, Record<string, boolean>]>;

  for (const [role, permissions] of entries) {
    for (const [permissionKey, allowed] of Object.entries(permissions)) {
      await prisma.rolePermissionDefault.upsert({
        where: {
          role_permissionKey: {
            role,
            permissionKey,
          },
        },
        update: { allowed },
        create: {
          role,
          permissionKey,
          allowed,
        },
      });
    }
  }
}

export async function GET() {
  try {
    const scope = await getAdminScope();
    await ensureDefaults();

    const teamWhere = scope.branchIds
      ? { branchId: { in: scope.branchIds } }
      : scope.clinicIds
        ? { clinicId: { in: scope.clinicIds } }
        : {};

    const [roleDefaults, doctors, staffMembers] = await Promise.all([
      prisma.rolePermissionDefault.findMany({
        orderBy: [{ role: 'asc' }, { permissionKey: 'asc' }],
      }),
      prisma.doctor.findMany({
        where: teamWhere,
        select: {
          userId: true,
          branch: { select: { name: true } },
          user: {
            select: {
              name: true,
              permissionOverrides: {
                select: {
                  permissionKey: true,
                  allowed: true,
                },
              },
            },
          },
        },
      }),
      prisma.staff.findMany({
        where: teamWhere,
        select: {
          userId: true,
          branch: { select: { name: true } },
          user: {
            select: {
              name: true,
              permissionOverrides: {
                select: {
                  permissionKey: true,
                  allowed: true,
                },
              },
            },
          },
        },
      }),
    ]);

    const roles = (Object.keys(defaultPermissionsByRole) as PermissionRole[]).map((role) => ({
      role,
      permissions: Object.fromEntries(
        roleDefaults
          .filter((item) => item.role === role)
          .map((item) => [item.permissionKey, item.allowed]),
      ),
    }));

    const memberOverrides = [
      ...doctors.map((doctor) => ({
        memberId: doctor.userId,
        name: doctor.user.name,
        role: 'DOCTOR' as const,
        branch: doctor.branch.name,
        overrides: Object.fromEntries(
          doctor.user.permissionOverrides.map((item) => [item.permissionKey, item.allowed]),
        ),
      })),
      ...staffMembers.map((staff) => ({
        memberId: staff.userId,
        name: staff.user.name,
        role: 'STAFF' as const,
        branch: staff.branch.name,
        overrides: Object.fromEntries(
          staff.user.permissionOverrides.map((item) => [item.permissionKey, item.allowed]),
        ),
      })),
    ];

    return NextResponse.json({
      success: true,
      data: {
        permissions: allPermissions,
        roles,
        memberOverrides,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const scope = await getAdminScope();
    if (scope.role === 'BRANCH_MANAGER') {
      throw new ForbiddenError('Branch managers cannot modify permissions');
    }

    const body = await request.json();

    if (body.type === 'role') {
      const role = body.role as PermissionRole;
      const permissions = body.permissions as Record<string, boolean>;

      if (!role || !permissions) {
        throw new ValidationError('Role permissions payload is invalid');
      }

      await prisma.$transaction(
        Object.entries(permissions).map(([permissionKey, allowed]) =>
          prisma.rolePermissionDefault.upsert({
            where: {
              role_permissionKey: {
                role,
                permissionKey,
              },
            },
            update: { allowed },
            create: { role, permissionKey, allowed },
          }),
        ),
      );

      return NextResponse.json({ success: true });
    }

    if (body.type === 'member') {
      const memberId = typeof body.memberId === 'number' ? body.memberId : NaN;
      const overrides = body.overrides as Record<string, boolean | null>;

      if (!Number.isInteger(memberId) || !overrides) {
        throw new ValidationError('Member overrides payload is invalid');
      }

      await prisma.$transaction(async (tx) => {
        const doctor = await tx.doctor.findFirst({
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

        const staff = doctor
          ? null
          : await tx.staff.findFirst({
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

        if (!doctor && !staff) {
          throw new ForbiddenError('You cannot modify this member');
        }

        await tx.userPermissionOverride.deleteMany({
          where: { userId: memberId },
        });

        const createRows = Object.entries(overrides)
          .filter(([, allowed]) => typeof allowed === 'boolean')
          .map(([permissionKey, allowed]) => ({
            userId: memberId,
            permissionKey,
            allowed: allowed as boolean,
          }));

        if (createRows.length > 0) {
          await tx.userPermissionOverride.createMany({
            data: createRows,
          });
        }
      });

      return NextResponse.json({ success: true });
    }

    throw new ValidationError('Unsupported permissions update type');
  } catch (error) {
    return handleApiError(error);
  }
}
