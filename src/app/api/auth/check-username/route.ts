import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');

  if (!username) {
    return NextResponse.json({ exists: false });
  }

  const user = await prisma.user.findUnique({
    where: { username: username.trim() },
  });

  return NextResponse.json({ exists: !!user });
}
