import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';
import { UserRole } from '@prisma/client';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح أو منتهي الصلاحية');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        doctorProfiles: { select: { clinicId: true } },
        staffProfiles:  { select: { clinicId: true } },
        clinicsOwned:   { select: { id: true } },
      },
    });

    if (!user) throw new UnauthorizedError('غير مصرح');

    const roles = user.roles as UserRole[];

    const requestedClinicId = parseInt(request.nextUrl.searchParams.get('clinicId') || '0', 10) || null;

    let clinicId: number | null = null;
    if (roles.includes('DOCTOR') && user.doctorProfiles.length > 0) {
      const profile = requestedClinicId
        ? user.doctorProfiles.find(p => p.clinicId === requestedClinicId) ?? user.doctorProfiles[0]
        : user.doctorProfiles[0];
      clinicId = profile.clinicId;
    } else if (roles.includes('STAFF') && user.staffProfiles.length > 0) {
      const profile = requestedClinicId
        ? user.staffProfiles.find(p => p.clinicId === requestedClinicId) ?? user.staffProfiles[0]
        : user.staffProfiles[0];
      clinicId = profile.clinicId;
    } else if (roles.includes('CLINIC_OWNER') && user.clinicsOwned?.id) {
      clinicId = user.clinicsOwned.id;
    } else if (roles.includes('ADMIN')) {
      clinicId = requestedClinicId;
    }

    if (!clinicId) throw new ForbiddenError('لا يمكن تحديد العيادة');

    const doctors = await prisma.doctor.findMany({
      where: { clinicId },
      select: {
        id: true,
        specialization: true,
        user: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { user: { name: 'asc' } },
    });

    return NextResponse.json({ success: true, data: doctors });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/clinic/doctors — add a doctor to a clinic (CLINIC_OWNER or ADMIN only)
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const actor = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { clinicsOwned: { select: { id: true, name: true } } },
    });
    if (!actor) throw new UnauthorizedError('غير مصرح');

    const roles = actor.roles as UserRole[];
    if (!roles.includes('CLINIC_OWNER') && !roles.includes('ADMIN')) {
      throw new ForbiddenError('لا تملك صلاحية إضافة أطباء');
    }

    const body = await request.json();
    const { doctorUserId, branchId, specialization, bio, yearsOfExperience, qualifications } = body;

    if (!doctorUserId || !branchId || !specialization) {
      throw new ValidationError('doctorUserId و branchId و specialization مطلوبة');
    }

    const branch = await prisma.branch.findUnique({
      where: { id: Number(branchId) },
      select: { id: true, clinicId: true, name: true, clinic: { select: { id: true, name: true } } },
    });
    if (!branch) throw new ValidationError('الفرع غير موجود');

    // Verify actor owns this clinic (or is admin)
    if (roles.includes('CLINIC_OWNER') && actor.clinicsOwned?.id !== branch.clinicId) {
      throw new ForbiddenError('لا تملك صلاحية على هذه العيادة');
    }

    const doctorUser = await prisma.user.findUnique({ where: { id: Number(doctorUserId) } });
    if (!doctorUser) throw new ValidationError('المستخدم غير موجود');

    const doctor = await prisma.doctor.create({
      data: {
        userId: doctorUser.id,
        clinicId: branch.clinicId,
        branchId: branch.id,
        specialization,
        bio: bio || null,
        yearsOfExperience: yearsOfExperience ? Number(yearsOfExperience) : null,
        qualifications: qualifications || null,
      },
    });

    // Add DOCTOR role to the user if not already set
    if (!(doctorUser.roles as UserRole[]).includes('DOCTOR')) {
      await prisma.user.update({
        where: { id: doctorUser.id },
        data: { roles: { push: 'DOCTOR' } },
      });
    }

    // Send notification to the doctor
    await prisma.notification.create({
      data: {
        userId: doctorUser.id,
        type: 'CLINIC_ASSIGNMENT',
        title: 'تمت إضافتك إلى عيادة',
        message: `تمت إضافتك كطبيب في عيادة "${branch.clinic.name}" — فرع "${branch.name}". يمكنك الآن الوصول إلى لوحة التحكم الخاصة بك.`,
        link: '/doctor',
      },
    });

    return NextResponse.json({ success: true, data: doctor }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
