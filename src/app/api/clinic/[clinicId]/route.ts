import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { validateClinicId } from '@/lib/validators';
import { buildDbUnavailableResponse } from '@/lib/apiMode';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ clinicId: string }> }
) {
  try {
    const { clinicId: clinicIdStr } = await params;
    const clinicId = validateClinicId({ clinicId: clinicIdStr });
    let clinic;
    try {
      clinic = await prisma.clinic.findUnique({
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
    } catch (dbError) {
      console.log('Clinic details DB failure:', dbError);
      return buildDbUnavailableResponse('خدمة بيانات العيادة', dbError);
    }

    if (!clinic) {
      throw new NotFoundError('Clinic not found');
    }

    return NextResponse.json({ success: true, data: clinic });
  } catch (error) {
    return handleApiError(error);
  }
}
