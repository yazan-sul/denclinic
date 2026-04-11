import { prisma } from '@/lib/prisma';
import { MOCK_CLINICS } from '@/lib/mockData';
import { NextResponse } from 'next/server';
import { handleApiError } from '@/lib/errors';

export async function GET() {
  try {
    // Try to fetch from database, fall back to mock data
    try {
      const clinics = await prisma.clinic.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          specialty: true,
          phone: true,
          email: true,
          website: true,
          logo: true,
          rating: true,
          reviewCount: true,
          branches: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
              latitude: true,
              longitude: true,
            },
            take: 1, // Get the first branch for location info
          },
        },
      });
      
      if (clinics.length > 0) {
        return NextResponse.json({ success: true, data: clinics });
      }
    } catch (dbError) {
      console.log('Database unavailable, using mock data');
    }

    // Return mock data as fallback
    return NextResponse.json({ success: true, data: MOCK_CLINICS });
  } catch (error) {
    return handleApiError(error);
  }
}
