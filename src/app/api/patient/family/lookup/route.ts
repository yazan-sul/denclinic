import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, NotFoundError, ValidationError } from '@/lib/errors';

function maskPhone(phone: string): string {
  if (phone.length <= 5) return '***';
  const start = phone.slice(0, 5);
  const end = phone.slice(-2);
  const masked = '*'.repeat(Math.max(phone.length - 7, 3));
  return `${start}${masked}${end}`;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const nationalId = request.nextUrl.searchParams.get('nationalId')?.trim();
    if (!nationalId) throw new ValidationError('رقم الهوية مطلوب');

    const patient = await prisma.patient.findFirst({
      where: { nationalId },
      include: { user: { select: { id: true, name: true, phoneNumber: true } } },
    });

    if (!patient) throw new NotFoundError('لا يوجد مستخدم بهذا الرقم في النظام');
    if (patient.user.id === decoded.userId) throw new ValidationError('لا يمكنك إضافة نفسك');

    return NextResponse.json({
      success: true,
      data: {
        name: patient.user.name,
        phone: maskPhone(patient.user.phoneNumber),
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}