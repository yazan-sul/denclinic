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
      select: { id: true },
    });

    if (!myPatient) return NextResponse.json({ success: true, data: [] });

    const guardians = await prisma.patientGuardian.findMany({
      where: { patientId: myPatient.id, status: 'APPROVED' },
      include: {
        guardianUser: { select: { name: true, avatar: true } },
      },
      orderBy: { id: 'asc' },
    });

    return NextResponse.json({ success: true, data: guardians });
  } catch (error) {
    return handleApiError(error);
  }
}