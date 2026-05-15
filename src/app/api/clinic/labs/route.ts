import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';
import { UserRole } from '@prisma/client';

async function resolveClinicId(userId: number) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      doctorProfiles: { select: { clinicId: true } },
      staffProfiles:  { select: { clinicId: true } },
      clinicsOwned:   { select: { id: true } },
    },
  });
  if (!user) throw new UnauthorizedError('غير مصرح');
  const roles = user.roles as UserRole[];

  if (roles.includes('DOCTOR') && user.doctorProfiles.length > 0)
    return { clinicId: user.doctorProfiles[0].clinicId, roles };
  if (roles.includes('STAFF') && user.staffProfiles.length > 0)
    return { clinicId: user.staffProfiles[0].clinicId, roles };
  if (roles.includes('CLINIC_OWNER') && user.clinicsOwned?.id)
    return { clinicId: user.clinicsOwned.id, roles };
  throw new ForbiddenError('لا تملك صلاحية');
}

// GET /api/clinic/labs?includeInactive=true
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const { clinicId } = await resolveClinicId(decoded.userId);
    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';
    const search = searchParams.get('search')?.trim();

    const labs = await prisma.lab.findMany({
      where: {
        clinicId,
        ...(!includeInactive ? { isActive: true } : {}),
        ...(search ? {
          OR: [
            { name:          { contains: search, mode: 'insensitive' } },
            { contactPerson: { contains: search, mode: 'insensitive' } },
            { phones:        { has: search } },
          ],
        } : {}),
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ success: true, data: labs });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/clinic/labs
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const { clinicId, roles } = await resolveClinicId(decoded.userId);

    if (!roles.includes('STAFF') && !roles.includes('CLINIC_OWNER'))
      throw new ForbiddenError('صلاحية إضافة المختبرات للستاف ومالك العيادة فقط');

    const body = await request.json();
    const { name, phones, address, contactPerson, email, notes } = body;

    if (!name?.trim()) throw new ValidationError('اسم المختبر مطلوب');

    const cleanPhones = Array.isArray(phones)
      ? phones.map((p: string) => p.trim()).filter(Boolean)
      : [];

    const lab = await prisma.lab.create({
      data: {
        clinicId,
        name:          name.trim(),
        phones:        cleanPhones,
        address:       address?.trim()       || null,
        contactPerson: contactPerson?.trim() || null,
        email:         email?.trim()         || null,
        notes:         notes?.trim()         || null,
      },
    });

    return NextResponse.json({ success: true, data: lab }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
