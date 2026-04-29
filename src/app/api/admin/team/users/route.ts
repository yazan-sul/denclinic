import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminScope } from '@/lib/adminScope';
import { handleApiError } from '@/lib/errors';

export async function GET(request: NextRequest) {
  try {
    await getAdminScope();

    const query = request.nextUrl.searchParams.get('query')?.trim() ?? '';
    if (!query) {
      return NextResponse.json({ success: true, data: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { phoneNumber: { contains: query } },
          { email: { contains: query, mode: 'insensitive' } },
          { name: { contains: query, mode: 'insensitive' } },
        ],
        doctorProfile: null,
        staffProfile: null,
      },
      select: {
        id: true,
        name: true,
        phoneNumber: true,
        email: true,
        role: true,
      },
      take: 8,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: users.map((user) => ({
        id: user.id,
        name: user.name,
        phone: user.phoneNumber,
        email: user.email ?? '',
        currentRole: user.role,
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
