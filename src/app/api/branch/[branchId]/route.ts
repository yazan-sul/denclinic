import { prisma } from '@/lib/prisma';
import { MOCK_BRANCHES, MOCK_CLINICS, MOCK_DOCTORS, MOCK_TIME_SLOTS } from '@/lib/mockData';
import { NextResponse } from 'next/server';
import { handleApiError, NotFoundError } from '@/lib/errors';
import { validateBranchId } from '@/lib/validators';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ branchId: string }> }
) {
  try {
    const { branchId: branchIdStr } = await params;
    const branchId = validateBranchId({ branchId: branchIdStr });

    // Try database first
    try {
      const branch = await prisma.branch.findUnique({
        where: { id: branchId },
        include: {
          clinic: {
            select: {
              id: true,
              name: true,
              specialty: true,
            },
          },
          doctors: {
            select: {
              id: true,
              specialization: true,
              experience: true,
              bio: true,
              avatar: true,
              user: {
                select: {
                  name: true,
                },
              },
              servicesOffered: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          timeSlots: {
            where: {
              date: {
                gte: new Date(),
              },
            },
            select: {
              id: true,
              date: true,
              time: true,
              available: true,
            },
            orderBy: {
              date: 'asc',
            },
          },
        },
      });

      if (branch) {
        return NextResponse.json({ success: true, data: branch });
      }
    } catch (dbError) {
      console.log('Database unavailable, using mock data');
    }

    // Use mock data
    const mockBranch = MOCK_BRANCHES.find(b => b.id === branchId);
    if (!mockBranch) {
      throw new NotFoundError('Branch not found');
    }

    const clinic = MOCK_CLINICS.find(c => c.id === mockBranch.clinicId);
    const doctors = MOCK_DOCTORS.filter(d => d.branchId === branchId);
    const timeSlots = MOCK_TIME_SLOTS.filter(t => t.branchId === branchId && new Date(t.date) >= new Date());

    const result = {
      ...mockBranch,
      clinic: {
        id: clinic?.id || mockBranch.clinicId,
        name: clinic?.name || 'عيادة',
        specialty: clinic?.specialty || 'طب أسنان',
      },
      doctors: doctors.map(d => ({
        id: d.id,
        specialization: d.specialization,
        experience: d.yearsOfExperience,
        bio: 'طبيب متخصص',
        avatar: null,
        user: d.user,
        servicesOffered: [],
      })),
      timeSlots: timeSlots.map(t => ({
        id: t.id,
        date: t.date,
        time: t.time,
        available: t.available,
      })),
    };

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
