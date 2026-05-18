import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { verifyToken, hashPassword } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';
import { passwordResetTokens } from '@/lib/tokenStorage';
import { sendInviteEmail } from '@/lib/email';
import { UserRole } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح أو منتهي الصلاحية');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        roles: true,
        clinicsOwned: { select: { id: true } },
      },
    });

    if (!user) throw new UnauthorizedError('المستخدم غير موجود');

    const isClinicOwner = user.roles.includes('CLINIC_OWNER');

    if (!isClinicOwner) {
      throw new ForbiddenError('غير مصرح بالوصول');
    }

    const clinicId = isClinicOwner ? user.clinicsOwned?.id : null;
    if (!clinicId) {
      return NextResponse.json({ success: true, data: [] });
    }

    const [doctors, staff] = await Promise.all([
      prisma.doctor.findMany({
        where: { clinicId },
        select: {
          id: true,
          specialization: true,
          createdAt: true,
          user: { select: { name: true, phoneNumber: true, email: true } },
          branch: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.staff.findMany({
        where: { clinicId },
        select: {
          id: true,
          position: true,
          createdAt: true,
          user: { select: { name: true, phoneNumber: true, email: true } },
          branch: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    // Staff IDs are offset to avoid collision with doctor IDs in the UI list
    const STAFF_ID_OFFSET = 100_000;

    const data = [
      ...doctors.map((d) => ({
        id: `DOCTOR_${d.id}`,
        name: d.user.name,
        phone: d.user.phoneNumber,
        email: d.user.email ?? '',
        role: 'DOCTOR' as const,
        specialization: d.specialization,
        branch: d.branch.name,
        status: 'active' as const,
        joinedAt: d.createdAt.toISOString().split('T')[0],
      })),
      ...staff.map((s) => ({
        id: `STAFF_${s.id}`,
        name: s.user.name,
        phone: s.user.phoneNumber,
        email: s.user.email ?? '',
        role: 'STAFF' as const,
        specialization: s.position,
        branch: s.branch.name,
        status: 'active' as const,
        joinedAt: s.createdAt.toISOString().split('T')[0],
      })),
    ];

    return NextResponse.json({ success: true, data });
  } catch (error) {
    return handleApiError(error);
  }
}

// ── Shared auth helper ────────────────────────────────────────────────────────
async function getClinicId(request: NextRequest): Promise<number> {
  const token = request.cookies.get('authToken')?.value;
  if (!token) throw new UnauthorizedError('غير مصرح');

  const decoded = verifyToken(token);
  if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { roles: true, clinicsOwned: { select: { id: true, name: true } } },
  });

  if (!user) throw new UnauthorizedError('المستخدم غير موجود');
  if (!user.roles.includes('CLINIC_OWNER') && !user.roles.includes('ADMIN')) {
    throw new ForbiddenError('غير مصرح بالوصول');
  }

  const clinicId = user.clinicsOwned?.id;
  if (!clinicId) throw new ForbiddenError('لا توجد عيادة مرتبطة بهذا الحساب');
  return clinicId;
}

export async function POST(request: NextRequest) {
  try {
    const clinicId = await getClinicId(request);

    const clinic = await prisma.clinic.findUnique({
      where: { id: clinicId },
      select: { name: true },
    });

    const body = await request.json();
    const { type, role, branchName, specialization } = body as {
      type: 'existing' | 'new';
      role: 'DOCTOR' | 'STAFF';
      branchName: string;
      specialization?: string;
      // existing
      userId?: number;
      // new
      name?: string;
      phone?: string;
      email?: string;
    };

    if (!role || !branchName) throw new ValidationError('الدور والفرع مطلوبان');

    const branch = await prisma.branch.findFirst({
      where: { clinicId, name: branchName },
      select: { id: true },
    });
    if (!branch) throw new ValidationError('الفرع غير موجود');

    let memberId: string;
    let targetUserId: number;
    let memberData: { name: string; phone: string; email: string };

    if (type === 'existing') {
      const { userId } = body as { userId: number };
      if (!userId) throw new ValidationError('معرّف المستخدم مطلوب');

      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, phoneNumber: true, email: true, roles: true },
      });
      if (!targetUser) throw new ValidationError('المستخدم غير موجود');

      // Check not already assigned in this branch for this role
      if (role === 'DOCTOR') {
        const dup = await prisma.doctor.findUnique({
          where: { userId_branchId: { userId, branchId: branch.id } },
        });
        if (dup) throw new ValidationError('هذا الشخص لديه بروفايل طبيب في هذا الفرع بالفعل — اختر فرعاً مختلفاً أو دوراً مختلفاً');

        const created = await prisma.doctor.create({
          data: {
            userId,
            clinicId,
            branchId: branch.id,
            specialization: specialization ?? 'عام',
          },
        });
        memberId = `DOCTOR_${created.id}`;
      } else {
        const dup = await prisma.staff.findUnique({
          where: { userId_branchId: { userId, branchId: branch.id } },
        });
        if (dup) throw new ValidationError('هذا الشخص لديه بروفايل موظف في هذا الفرع بالفعل — اختر فرعاً مختلفاً أو دوراً مختلفاً');

        const created = await prisma.staff.create({
          data: {
            userId,
            clinicId,
            branchId: branch.id,
            position: specialization ?? 'موظف',
          },
        });
        memberId = `STAFF_${created.id}`;
      }

      // Put the newly assigned role FIRST so it becomes the default active role on next login.
      // De-duplicate in case it already existed.
      const newRoles = [role as UserRole, ...targetUser.roles.filter((r) => r !== role)];
      await prisma.user.update({
        where: { id: userId },
        data: { roles: newRoles },
      });

      targetUserId = userId;
      memberData = {
        name: targetUser.name,
        phone: targetUser.phoneNumber,
        email: targetUser.email ?? '',
      };
    } else {
      // Create new user
      const { name, phone, email } = body as { name: string; phone: string; email?: string };
      if (!name?.trim() || !phone?.trim()) throw new ValidationError('الاسم ورقم الهاتف مطلوبان');

      const normalizedEmail = email?.trim().toLowerCase() || undefined;
      if (normalizedEmail) {
        const emailTaken = await prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (emailTaken) throw new ValidationError('البريد الإلكتروني مستخدم بالفعل');
      }

      const tempPassword = hashPassword(crypto.randomBytes(12).toString('base64'));

      const newUser = await prisma.user.create({
        data: {
          name: name.trim(),
          phoneNumber: phone.trim(),
          email: normalizedEmail,
          password: tempPassword,
          roles: [role as UserRole],
        },
      });

      targetUserId = newUser.id;

      if (role === 'DOCTOR') {
        const created = await prisma.doctor.create({
          data: {
            userId: newUser.id,
            clinicId,
            branchId: branch.id,
            specialization: specialization ?? 'عام',
          },
        });
        memberId = `DOCTOR_${created.id}`;
      } else {
        const created = await prisma.staff.create({
          data: {
            userId: newUser.id,
            clinicId,
            branchId: branch.id,
            position: specialization ?? 'موظف',
          },
        });
        memberId = `STAFF_${created.id}`;
      }

      // Send invite email if email provided
      if (normalizedEmail) {
        const inviteToken = crypto.randomBytes(20).toString('hex');
        passwordResetTokens[inviteToken] = {
          userId: newUser.id,
          email: normalizedEmail,
          expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
        };
        const setPasswordUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password/${inviteToken}`;
        const roleLabel = role === 'DOCTOR' ? 'طبيب' : 'موظف';
        await sendInviteEmail({
          to: normalizedEmail,
          name: name.trim(),
          clinicName: clinic!.name,
          roleLabel,
          setPasswordUrl,
        });
      }

      memberData = {
        name: name.trim(),
        phone: phone.trim(),
        email: normalizedEmail ?? '',
      };
    }

    const now = new Date().toISOString().split('T')[0];
    return NextResponse.json({
      success: true,
      data: {
        id: memberId!,
        name: memberData.name,
        phone: memberData.phone,
        email: memberData.email,
        role,
        specialization: specialization ?? (role === 'DOCTOR' ? 'عام' : undefined),
        branch: branchName,
        status: 'active' as const,
        joinedAt: now,
      },
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
