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
            take: 1,
          },
        },
      });
      
      if (clinics.length > 0) {
        // Transform clinics to include first branch location
        const transformedClinics = clinics.map(clinic => {
          const firstBranch = clinic.branches[0];
          return {
            id: clinic.id,
            name: clinic.name,
            description: clinic.description,
            specialty: clinic.specialty,
            phone: clinic.phone,
            email: clinic.email,
            website: clinic.website,
            logo: clinic.logo,
            rating: clinic.rating,
            reviewCount: clinic.reviewCount,
            // Add location from first branch
            latitude: firstBranch?.latitude ?? 30.0444,
            longitude: firstBranch?.longitude ?? 31.2357,
            address: firstBranch?.address ?? 'Cairo, Egypt',
            branches: clinic.branches,
          };
        });
        
        return NextResponse.json({ success: true, data: transformedClinics });
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
