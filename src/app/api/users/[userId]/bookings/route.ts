import { NextResponse } from 'next/server';
import { MOCK_BOOKINGS, MOCK_CLINICS, MOCK_BRANCHES, MOCK_DOCTORS, MOCK_SERVICES, MOCK_USERS } from '@/lib/mockData';
import { handleApiError } from '@/lib/errors';
import { validateUserId } from '@/lib/validators';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId: userIdStr } = await params;
    const userId = validateUserId({ userId: userIdStr });

    // Use mock data with enrichment
    const mockUserBookings = MOCK_BOOKINGS.filter(b => b.userId === userId)
      .map(booking => {
        const clinic = MOCK_CLINICS.find(c => c.id === booking.clinicId);
        const branch = MOCK_BRANCHES.find(b => b.id === booking.branchId);
        const doctor = MOCK_DOCTORS.find(d => d.id === booking.doctorId);
        const doctorUser = MOCK_USERS.find(u => u.id === doctor?.userId);
        const service = MOCK_SERVICES.find(s => s.id === booking.serviceId);
        
        return {
          id: booking.id,
          userId: booking.userId,
          appointmentDate: booking.appointmentDate,
          appointmentTime: booking.appointmentTime,
          status: booking.status,
          clinic: { name: clinic?.name || 'عيادة' },
          branch: { name: branch?.name || 'فرع', address: branch?.address || 'القاهرة' },
          doctor: {
            id: booking.doctorId,
            user: { name: doctorUser?.name || 'دكتور' },
          },
          service: { name: service?.name || 'خدمة' },
        };
      })
      .sort((a, b) => new Date(b.appointmentDate).getTime() - new Date(a.appointmentDate).getTime());

    return NextResponse.json({ success: true, data: mockUserBookings });
  } catch (error) {
    return handleApiError(error);
  }
}
