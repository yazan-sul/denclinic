import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const nationalId = request.nextUrl.searchParams.get('nationalId');

  if (!nationalId || typeof nationalId !== 'string') {
    return NextResponse.json({ available: false, message: 'رقم الهوية مطلوب' }, { status: 400 });
  }

  const existing = await prisma.patient.findFirst({
    where: { nationalId: nationalId.trim() },
    select: { user: { select: { password: true } } },
  });

  if (!existing) return NextResponse.json({ available: true });

  if (existing.user.password) {
    return NextResponse.json({
      available: false,
      message: 'يبدو أن لديك حساباً مسبقاً، الرجاء تسجيل الدخول',
    });
  }

  // Patient file exists but no account yet — allow signup, will link during registration
  return NextResponse.json({ available: true });
}
