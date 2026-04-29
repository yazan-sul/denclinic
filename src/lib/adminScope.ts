import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { ForbiddenError, UnauthorizedError } from '@/lib/errors';

const ADMIN_ROLES = ['ADMIN', 'CLINIC_OWNER', 'BRANCH_MANAGER'] as const;

export type AdminScope = {
  userId: number;
  role: (typeof ADMIN_ROLES)[number];
  clinicIds?: number[];
  branchIds?: number[];
};

export async function getAdminScope(): Promise<AdminScope> {
  const cookieStore = await cookies();
  const token = cookieStore.get('authToken')?.value;

  if (!token) {
    throw new UnauthorizedError('Authentication required');
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    throw new UnauthorizedError('Invalid authentication token');
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: {
      managedBranch: {
        select: {
          id: true,
          clinicId: true,
        },
      },
    },
  });

  if (!user || !ADMIN_ROLES.includes(user.role as (typeof ADMIN_ROLES)[number])) {
    throw new ForbiddenError('Admin access required');
  }

  if (user.role === 'CLINIC_OWNER') {
    const ownedClinics = await prisma.clinic.findMany({
      where: { ownerId: user.id },
      select: { id: true },
    });

    return {
      userId: user.id,
      role: 'CLINIC_OWNER',
      clinicIds: ownedClinics.map((clinic) => clinic.id),
    };
  }

  if (user.role === 'BRANCH_MANAGER') {
    if (!user.managedBranch) {
      throw new ForbiddenError('No managed branch is linked to this account');
    }

    return {
      userId: user.id,
      role: 'BRANCH_MANAGER',
      clinicIds: [user.managedBranch.clinicId],
      branchIds: [user.managedBranch.id],
    };
  }

  return {
    userId: user.id,
    role: 'ADMIN',
  };
}
