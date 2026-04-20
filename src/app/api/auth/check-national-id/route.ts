import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const nationalId = request.nextUrl.searchParams.get('nationalId');

  if (!nationalId || typeof nationalId !== 'string') {
    return NextResponse.json({ available: false, message: 'رقم الهوية مطلوب' }, { status: 400 });
  }

  const existing = await prisma.patient.findFirst({
    where: { nationalId: nationalId.trim() },
    select: { id: true },
  });

  return NextResponse.json({ available: !existing });
}
