import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const username = request.nextUrl.searchParams.get('username');

  if (!username || typeof username !== 'string') {
    return NextResponse.json({ available: false, message: 'اسم المستخدم مطلوب' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { username: username.trim() },
    select: { id: true },
  });

  return NextResponse.json({ available: !existing });
}
