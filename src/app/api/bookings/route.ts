import { NextResponse } from 'next/server';
import { MOCK_BOOKINGS, MOCK_CLINICS, MOCK_BRANCHES, MOCK_DOCTORS, MOCK_SERVICES, MOCK_USERS } from '@/lib/mockData';
import { handleApiError, ValidationError, ConflictError } from '@/lib/errors';
import { bookingSchema } from '@/lib/validators';
import { z } from 'zod';

let mockBookingsCounter = MOCK_BOOKINGS.length;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate input with Zod schema
    const validated = bookingSchema.parse(body);
    const {
      userId,
      clinicId,
      branchId,
      doctorId,
      serviceId,
      appointmentDate,
      appointmentTime,
      notes,
    } = validated;

    // Create booking from mock data
    const clinic = MOCK_CLINICS.find(c => c.id === clinicId);
    const branch = MOCK_BRANCHES.find(b => b.id === branchId);
    const doctor = MOCK_DOCTORS.find(d => d.id === doctorId);
    const doctorUser = MOCK_USERS.find(u => u.id === doctor?.userId);
    const service = MOCK_SERVICES.find(s => s.id === serviceId);

    const mockBooking = {
      id: ++mockBookingsCounter,
      userId: userId,
      clinicId: clinicId,
      branchId: branchId,
      doctorId: doctorId,
      serviceId: serviceId,
      appointmentDate: new Date(appointmentDate),
      appointmentTime: appointmentTime,
      notes: notes || null,
      status: 'PENDING',
      createdAt: new Date(),
      clinic: { name: clinic?.name || 'عيادة' },
      branch: { name: branch?.name || 'فرع رئيسي', address: branch?.address || 'القاهرة' },
      doctor: {
        id: doctorId,
        user: { name: doctorUser?.name || 'دكتور' },
      },
      service: { name: service?.name || 'خدمة' },
    };

    return NextResponse.json({ success: true, data: mockBooking }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues?.[0];
      const message = (firstError as any)?.message || 'بيانات غير صحيحة';
      return NextResponse.json(
        { success: false, message },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    // Return mock data
    return NextResponse.json({ success: true, data: MOCK_BOOKINGS });
  } catch (error) {
    return handleApiError(error);
  }
}
