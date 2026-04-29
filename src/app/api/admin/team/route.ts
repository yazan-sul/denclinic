import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminScope } from '@/lib/adminScope';
import { ConflictError, ForbiddenError, ValidationError, handleApiError } from '@/lib/errors';
import { hashPassword } from '@/lib/auth';

function normalizeDate(date: Date) {
  return date.toISOString().split('T')[0];
}

function formatDoctorMember(doctor: {
  userId: number;
  specialization: string;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: Date;
  branch: { id: number; name: string };
  user: { name: string; phoneNumber: string; email: string | null };
}) {
  return {
    id: doctor.userId,
    name: doctor.user.name,
    phone: doctor.user.phoneNumber,
    email: doctor.user.email ?? '',
    role: 'DOCTOR' as const,
    specialization: doctor.specialization,
    branchId: doctor.branch.id,
    branch: doctor.branch.name,
    status: doctor.status === 'ACTIVE' ? 'active' as const : 'suspended' as const,
    joinedAt: normalizeDate(doctor.createdAt),
  };
}

function formatStaffMember(staff: {
  userId: number;
  title: string | null;
  status: 'ACTIVE' | 'SUSPENDED';
  createdAt: Date;
  branch: { id: number; name: string };
  user: { name: string; phoneNumber: string; email: string | null };
}) {
  return {
    id: staff.userId,
    name: staff.user.name,
    phone: staff.user.phoneNumber,
    email: staff.user.email ?? '',
    role: 'STAFF' as const,
    specialization: staff.title ?? '',
    branchId: staff.branch.id,
    branch: staff.branch.name,
    status: staff.status === 'ACTIVE' ? 'active' as const : 'suspended' as const,
    joinedAt: normalizeDate(staff.createdAt),
  };
}

async function getAllowedBranch(branchId: number, scope: Awaited<ReturnType<typeof getAdminScope>>) {
  return prisma.branch.findFirst({
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
  });
}

export async function GET() {
  try {
    const scope = await getAdminScope();

    const branchWhere = scope.branchIds
      ? { id: { in: scope.branchIds } }
      : scope.clinicIds
        ? { clinicId: { in: scope.clinicIds } }
        : {};

    const memberWhere = scope.branchIds
      ? { branchId: { in: scope.branchIds } }
      : scope.clinicIds
        ? { clinicId: { in: scope.clinicIds } }
        : {};

    const [branches, doctors, staffMembers] = await Promise.all([
      prisma.branch.findMany({
        where: branchWhere,
        select: {
          id: true,
          name: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.doctor.findMany({
        where: memberWhere,
        select: {
          userId: true,
          specialization: true,
          status: true,
          createdAt: true,
          branch: { select: { id: true, name: true } },
          user: { select: { name: true, phoneNumber: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.staff.findMany({
        where: memberWhere,
        select: {
          userId: true,
          title: true,
          status: true,
          createdAt: true,
          branch: { select: { id: true, name: true } },
          user: { select: { name: true, phoneNumber: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        branches,
        members: [
          ...doctors.map(formatDoctorMember),
          ...staffMembers.map(formatStaffMember),
        ],
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const scope = await getAdminScope();
    const body = await request.json();

    const role = body.role === 'STAFF' ? 'STAFF' : 'DOCTOR';
    const branchId = typeof body.branchId === 'number' ? body.branchId : NaN;
    const branch = await getAllowedBranch(branchId, scope);

    if (!branch) {
      throw new ForbiddenError('You cannot assign this member to the selected branch');
    }

    const existingUserId = typeof body.existingUserId === 'number' ? body.existingUserId : null;
    const specialization = typeof body.specialization === 'string' ? body.specialization.trim() : '';

    let userId = existingUserId;

    if (!userId) {
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim() : '';

      if (!name || !phone) {
        throw new ValidationError('Name and phone are required');
      }

      const existingByPhone = await prisma.user.findUnique({ where: { phoneNumber: phone } });
      if (existingByPhone) {
        throw new ConflictError('A user already exists with this phone number');
      }

      if (email) {
        const existingByEmail = await prisma.user.findUnique({ where: { email } });
        if (existingByEmail) {
          throw new ConflictError('A user already exists with this email');
        }
      }

      const user = await prisma.user.create({
        data: {
          name,
          phoneNumber: phone,
          email: email || null,
          password: hashPassword('demo123456'),
          role,
          emailVerified: true,
        },
        select: { id: true },
      });

      userId = user.id;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        email: true,
        doctorProfile: { select: { id: true } },
        staffProfile: { select: { id: true } },
      },
    });

    if (!user) {
      throw new ValidationError('User not found');
    }

    if (user.doctorProfile || user.staffProfile) {
      throw new ConflictError('This user is already assigned to the team');
    }

    if (role === 'DOCTOR') {
      const doctor = await prisma.doctor.create({
        data: {
          userId: user.id,
          clinicId: branch.clinicId,
          branchId: branch.id,
          specialization: specialization || 'طبيب عام',
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

      await prisma.user.update({
        where: { id: user.id },
        data: { role: 'DOCTOR' },
      });

      return NextResponse.json({
        success: true,
        data: formatDoctorMember(doctor),
      });
    }

    const staff = await prisma.staff.create({
      data: {
        userId: user.id,
        clinicId: branch.clinicId,
        branchId: branch.id,
        title: specialization || null,
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

    await prisma.user.update({
      where: { id: user.id },
      data: { role: 'STAFF' },
    });

    return NextResponse.json({
      success: true,
      data: formatStaffMember(staff),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
