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

    // Find all patients I'm an approved guardian of
    const myDependents = await prisma.patientGuardian.findMany({
      where: { guardianUserId: decoded.userId, status: 'APPROVED' },
      select: { patientId: true },
    });

    if (myDependents.length === 0) return NextResponse.json({ success: true, data: [] });

    const patientIds = myDependents.map((d) => d.patientId);

    // Find pending requests for those patients
    const pending = await prisma.patientGuardian.findMany({
      where: { patientId: { in: patientIds }, status: 'PENDING' },
      include: {
        guardianUser: { select: { name: true, avatar: true } },
        dependentPatient: {
          include: { user: { select: { name: true } } },
        },
      },
      orderBy: { id: 'desc' },
    });

    return NextResponse.json({ success: true, data: pending });
  } catch (error) {
    return handleApiError(error);
  }
}