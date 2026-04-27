import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const myPatient = await prisma.patient.findFirst({
      where: { userId: decoded.userId },
      select: { id: true, dateOfBirth: true },
    });

    if (!myPatient) return NextResponse.json({ success: true, data: [], myDateOfBirth: null });

    const [guardians, myGuardianships] = await Promise.all([
      prisma.patientGuardian.findMany({
        // APPROVED: confirmed guardians. PENDING+dependentInitiated: my outgoing guardian requests
        where: {
          patientId: myPatient.id,
          OR: [{ status: 'APPROVED' }, { status: 'PENDING', dependentInitiated: true }],
        },
        include: { guardianUser: { select: { name: true, avatar: true } } },
        orderBy: { id: 'asc' },
      }),
      prisma.patientGuardian.findMany({
        where: { guardianUserId: decoded.userId },
        select: { status: true, dependentPatient: { select: { userId: true } } },
      }),
    ]);

    const myDependentMap = new Map(
      myGuardianships.map((g) => [g.dependentPatient.userId, g.status])
    );

    const data = guardians.map((g) => ({
      ...g,
      reverseStatus: myDependentMap.get(g.guardianUserId) ?? null,
    }));

    // Send age-18 notification once if user just became an adult and has guardians
    if (myPatient.dateOfBirth && guardians.some((g) => g.status === 'APPROVED')) {
      const age = (Date.now() - new Date(myPatient.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (age >= 18) {
        const alreadyNotified = await prisma.notification.findFirst({
          where: { userId: decoded.userId, title: 'أصبحت بالغاً' },
          select: { id: true },
        });
        if (!alreadyNotified) {
          await prisma.notification.create({
            data: {
              userId: decoded.userId,
              type: 'GENERAL',
              title: 'أصبحت بالغاً',
              message: 'يمكنك الآن إدارة من يرى ملفك الطبي — توجه إلى صفحة العائلة لمراجعة قائمة المسؤولين عنك',
              link: '/patient/family',
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true, data, myDateOfBirth: myPatient.dateOfBirth });
  } catch (error) {
    return handleApiError(error);
  }
}