import { MOCK_BRANCHES, MOCK_CLINICS, MOCK_DOCTORS, MOCK_TIME_SLOTS, MOCK_USERS } from '@/lib/mockData';
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
      doctors: doctors.map(d => {
        const user = MOCK_USERS.find(u => u.id === d.userId);
        return {
          id: d.id,
          specialization: d.specialization,
          experience: d.yearsOfExperience,
          bio: d.bio || 'طبيب متخصص',
          avatar: d.avatar || null,
          user: { name: user?.name || 'دكتور' },
          servicesOffered: d.servicesOffered || [],
        };
      }),
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
