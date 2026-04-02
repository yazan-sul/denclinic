import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MOCK_BOOKINGS } from '@/lib/mockData';
import { handleApiError } from '@/lib/errors';
import { validateUserId } from '@/lib/validators';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: userIdStr } = await params;
    const userId = validateUserId({ userId: userIdStr });

    // Try database first
    try {
      const bookings = await prisma.booking.findMany({
        where: { userId },
        include: {
          clinic: { select: { name: true } },
          branch: { select: { name: true, address: true } },
          doctor: { select: { id: true, user: { select: { name: true } } } },
          service: { select: { name: true } },
        },
        orderBy: { appointmentDate: 'desc' },
      });

      if (bookings.length > 0) {
        return NextResponse.json({ success: true, data: bookings });
      }
    } catch (dbError) {
      console.log('Database unavailable, using mock data');
    }

    // Use mock data
    const mockUserBookings = MOCK_BOOKINGS.filter(b => b.userId === userId)
      .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());

    return NextResponse.json({ success: true, data: mockUserBookings });
  } catch (error) {
    return handleApiError(error);
  }
}
