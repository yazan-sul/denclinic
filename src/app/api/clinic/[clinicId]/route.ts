import { prisma } from '@/lib/prisma';
import { MOCK_CLINICS, MOCK_BRANCHES, MOCK_SERVICES } from '@/lib/mockData';
import { NextResponse } from 'next/server';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { validateClinicId } from '@/lib/validators';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clinicId: string }> }
) {
  try {
    const { clinicId: clinicIdStr } = await params;
    const clinicId = validateClinicId({ clinicId: clinicIdStr });

    // Try database first
    try {
      const clinic = await prisma.clinic.findUnique({
        where: { id: clinicId },
        include: {
          branches: {
            select: {
              id: true,
              name: true,
              address: true,
              phone: true,
              latitude: true,
              longitude: true,
            },
          },
          services: {
            select: {
              id: true,
              name: true,
              description: true,
              icon: true,
            },
          },
          ratings: {
            select: {
              rating: true,
              comment: true,
              createdAt: true,
              user: {
                select: {
                  name: true,
                },
              },
            },
            take: 5,
          },
        },
      });

      if (clinic) {
        return NextResponse.json({ success: true, data: clinic });
      }
    } catch (dbError) {
      console.log('Database unavailable, using mock data');
    }

    // Use mock data
    const mockClinic = MOCK_CLINICS.find(c => c.id === clinicId);
    if (!mockClinic) {
      throw new NotFoundError('Clinic not found');
    }

    const clinicBranches = MOCK_BRANCHES.filter(b => b.clinicId === clinicId);
    const clinicServices = MOCK_SERVICES.filter(s => s.clinicId === clinicId);

    const result = {
      ...mockClinic,
      branches: clinicBranches,
      services: clinicServices,
      ratings: [],
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
