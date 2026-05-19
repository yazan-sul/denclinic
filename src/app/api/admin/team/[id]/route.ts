import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';
import { UserRole } from '@prisma/client';

function parseTeamId(raw: string): { role: 'DOCTOR' | 'STAFF'; profileId: number } {
  const sep = raw.indexOf('_');
  const role = raw.slice(0, sep) as 'DOCTOR' | 'STAFF';
  const profileId = parseInt(raw.slice(sep + 1), 10);
  if ((role !== 'DOCTOR' && role !== 'STAFF') || isNaN(profileId)) {
    throw new Error('invalid-id');
  }
  return { role, profileId };
}

async function getClinicId(request: NextRequest): Promise<number> {
  const token = request.cookies.get('authToken')?.value;
  if (!token) throw new UnauthorizedError('غير مصرح');

  const decoded = verifyToken(token);
  if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { roles: true, clinicsOwned: { select: { id: true } } },
  });

  if (!user) throw new UnauthorizedError('المستخدم غير موجود');
  if (!user.roles.includes('CLINIC_OWNER') && !user.roles.includes('ADMIN')) {
    throw new ForbiddenError('غير مصرح بالوصول');
  }

  const clinicId = user.clinicsOwned?.id;
  if (!clinicId) throw new ForbiddenError('لا توجد عيادة مرتبطة بهذا الحساب');
  return clinicId;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId(request);
    const { id } = await params;

    let parsed: { role: 'DOCTOR' | 'STAFF'; profileId: number };
    try { parsed = parseTeamId(id); } catch { throw new ValidationError('معرّف غير صالح'); }
    const { role, profileId } = parsed;

    const body = await request.json() as {
      name?: string;
      phone?: string;
      specialization?: string;
      branchName?: string;
    };

    const { name, phone, specialization, branchName } = body;

    // Resolve branch if provided
    let branchId: number | undefined;
    if (branchName) {
      const branch = await prisma.branch.findFirst({
        where: { clinicId, name: branchName },
        select: { id: true },
      });
      if (!branch) throw new ValidationError('الفرع غير موجود');
      branchId = branch.id;
    }

    if (role === 'DOCTOR') {
      const doctor = await prisma.doctor.findFirst({
        where: { id: profileId, clinicId },
        select: { userId: true, branchId: true },
      });
      if (!doctor) throw new ValidationError('الطبيب غير موجود');

      if (name?.trim() || phone?.trim()) {
        await prisma.user.update({
          where: { id: doctor.userId },
          data: {
            ...(name?.trim() && { name: name.trim() }),
            ...(phone?.trim() && { phoneNumber: phone.trim() }),
          },
        });
      }

      if (branchId && branchId !== doctor.branchId) {
        const conflict = await prisma.doctor.findUnique({
          where: { userId_branchId: { userId: doctor.userId, branchId } },
        });
        if (conflict) throw new ValidationError('هذا الطبيب موجود في الفرع المحدد بالفعل');
      }

      await prisma.doctor.update({
        where: { id: profileId },
        data: {
          ...(specialization?.trim() && { specialization: specialization.trim() }),
          ...(branchId && branchId !== doctor.branchId && { branchId }),
        },
      });
    } else {
      const staffProfile = await prisma.staff.findFirst({
        where: { id: profileId, clinicId },
        select: { userId: true, branchId: true },
      });
      if (!staffProfile) throw new ValidationError('الموظف غير موجود');

      if (name?.trim() || phone?.trim()) {
        await prisma.user.update({
          where: { id: staffProfile.userId },
          data: {
            ...(name?.trim() && { name: name.trim() }),
            ...(phone?.trim() && { phoneNumber: phone.trim() }),
          },
        });
      }

      if (branchId && branchId !== staffProfile.branchId) {
        const conflict = await prisma.staff.findUnique({
          where: { userId_branchId: { userId: staffProfile.userId, branchId } },
        });
        if (conflict) throw new ValidationError('هذا الموظف موجود في الفرع المحدد بالفعل');
      }

      await prisma.staff.update({
        where: { id: profileId },
        data: {
          ...(specialization?.trim() && { position: specialization.trim() }),
          ...(branchId && branchId !== staffProfile.branchId && { branchId }),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const clinicId = await getClinicId(request);
    const { id } = await params;

    let role: 'DOCTOR' | 'STAFF', profileId: number;
    try { ({ role, profileId } = parseTeamId(id)); } catch { throw new ValidationError('معرّف غير صالح'); }

    if (role === 'DOCTOR') {
      const doctor = await prisma.doctor.findFirst({
        where: { id: profileId, clinicId },
        select: { userId: true },
      });
      if (!doctor) throw new ValidationError('الطبيب غير موجود');

      await prisma.doctor.delete({ where: { id: profileId } });

      // Remove DOCTOR role if user has no other doctor profiles
      const remaining = await prisma.doctor.count({ where: { userId: doctor.userId } });
      if (remaining === 0) {
        const user = await prisma.user.findUnique({
          where: { id: doctor.userId },
          select: { roles: true },
        });
        if (user) {
          await prisma.user.update({
            where: { id: doctor.userId },
            data: { roles: user.roles.filter((r) => r !== ('DOCTOR' as UserRole)) },
          });
        }
      }
    } else {
      const staffProfile = await prisma.staff.findFirst({
        where: { id: profileId, clinicId },
        select: { userId: true },
      });
      if (!staffProfile) throw new ValidationError('الموظف غير موجود');

      await prisma.staff.delete({ where: { id: profileId } });

      const remaining = await prisma.staff.count({ where: { userId: staffProfile.userId } });
      if (remaining === 0) {
        const user = await prisma.user.findUnique({
          where: { id: staffProfile.userId },
          select: { roles: true },
        });
        if (user) {
          await prisma.user.update({
            where: { id: staffProfile.userId },
            data: { roles: user.roles.filter((r) => r !== ('STAFF' as UserRole)) },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
