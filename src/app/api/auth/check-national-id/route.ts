import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const nationalId = request.nextUrl.searchParams.get('nationalId');

  if (!nationalId) {
    return NextResponse.json({ exists: false });
  }

  const patient = await prisma.patient.findFirst({
    where: { nationalId: nationalId.trim() },
  });

  return NextResponse.json({ exists: !!patient });
}
