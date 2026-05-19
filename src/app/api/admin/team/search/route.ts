import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const me = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { roles: true, clinicsOwned: { select: { id: true } } },
    });

    if (!me) throw new UnauthorizedError('المستخدم غير موجود');
    if (!me.roles.includes('CLINIC_OWNER') && !me.roles.includes('ADMIN')) {
      throw new ForbiddenError('غير مصرح بالوصول');
    }

    const clinicId = me.clinicsOwned?.id ?? null;

    const q = request.nextUrl.searchParams.get('q')?.trim() ?? '';
    if (!q) return NextResponse.json({ success: true, data: null });

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { phoneNumber: { contains: q } },
          { email: { equals: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        email: true,
        roles: true,
      },
    });

    if (!user) return NextResponse.json({ success: true, data: null });

    // Fetch existing profiles in THIS clinic so the admin can see what they already have
    const [doctorProfiles, staffProfiles] = clinicId
      ? await Promise.all([
          prisma.doctor.findMany({
            where: { userId: user.id, clinicId },
            select: { branch: { select: { name: true } } },
          }),
          prisma.staff.findMany({
            where: { userId: user.id, clinicId },
            select: { branch: { select: { name: true } } },
          }),
        ])
      : [[], []];

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        phone: user.phoneNumber,
        email: user.email ?? '',
        currentRole: user.roles[0] ?? 'PATIENT',
        clinicRoles: [
          ...doctorProfiles.map((d) => ({ role: 'DOCTOR' as const, branch: d.branch.name })),
          ...staffProfiles.map((s) => ({ role: 'STAFF' as const, branch: s.branch.name })),
        ],
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
