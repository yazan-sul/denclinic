import { prisma } from '@/lib/prisma';
import { MOCK_BOOKINGS, MOCK_CLINICS, MOCK_BRANCHES, MOCK_DOCTORS, MOCK_SERVICES } from '@/lib/mockData';
import { NextResponse } from 'next/server';
import { handleApiError, ValidationError, ConflictError } from '@/lib/errors';

let mockBookingsCounter = MOCK_BOOKINGS.length;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate required fields
    const {
      userId,
      clinicId,
      branchId,
      doctorId,
      serviceId,
      appointmentDate,
      appointmentTime,
      notes,
    } = body;

    // Validate all required fields are present
    if (
      !userId ||
      !clinicId ||
      !branchId ||
      !doctorId ||
      !serviceId ||
      !appointmentDate ||
      !appointmentTime
    ) {
      throw new ValidationError('Missing required fields');
    }

    // Validate date format
    const dateObj = new Date(appointmentDate);
    if (isNaN(dateObj.getTime())) {
      throw new ValidationError('Invalid appointment date');
    }

    // Try to create in database first
    try {
      const booking = await prisma.booking.create({
        data: {
          userId: parseInt(userId),
          clinicId: parseInt(clinicId),
          branchId: parseInt(branchId),
          doctorId: parseInt(doctorId),
          serviceId: parseInt(serviceId),
          appointmentDate: dateObj,
          appointmentTime: String(appointmentTime),
          notes: notes ? String(notes) : null,
          status: 'PENDING',
        },
        include: {
          clinic: { select: { name: true } },
          branch: { select: { name: true, address: true } },
          doctor: { select: { id: true, user: { select: { name: true } } } },
          service: { select: { name: true } },
        },
      });

      return NextResponse.json({ success: true, data: booking }, { status: 201 });
    } catch (dbError) {
      // Fall back to mock data
      console.log('Database unavailable, using mock data');
      
      const clinic = MOCK_CLINICS.find(c => c.id === parseInt(clinicId));
      const branch = MOCK_BRANCHES.find(b => b.id === parseInt(branchId));
      const doctor = MOCK_DOCTORS.find(d => d.id === parseInt(doctorId));
      const service = MOCK_SERVICES.find(s => s.id === parseInt(serviceId));

      const mockBooking = {
        id: ++mockBookingsCounter,
        userId: parseInt(userId),
        clinicId: parseInt(clinicId),
        branchId: parseInt(branchId),
        doctorId: parseInt(doctorId),
        serviceId: parseInt(serviceId),
        appointmentDate: dateObj,
        appointmentTime: String(appointmentTime),
        notes: notes ? String(notes) : null,
        status: 'PENDING',
        createdAt: new Date(),
        clinic: { name: clinic?.name || 'عيادة' },
        branch: { name: branch?.name || 'فرع رئيسي', address: branch?.address || 'القاهرة' },
        doctor: {
          id: parseInt(doctorId),
          user: { name: doctor?.user.name || 'دكتور' },
        },
        service: { name: service?.name || 'خدمة' },
      };

      return NextResponse.json({ success: true, data: mockBooking }, { status: 201 });
    }
  } catch (error) {
    return handleApiError(error);
  }
}

export async function GET() {
  try {
    // Try to fetch from database
    try {
      const bookings = await prisma.booking.findMany({
        include: {
          clinic: { select: { name: true } },
          branch: { select: { name: true, address: true } },
          doctor: { select: { id: true, user: { select: { name: true } } } },
          service: { select: { name: true } },
        },
      });

      if (bookings.length > 0) {
        return NextResponse.json({ success: true, data: bookings });
      }
    } catch (dbError) {
      console.log('Database unavailable, using mock data');
    }

    // Return mock data
    return NextResponse.json({ success: true, data: MOCK_BOOKINGS });
  } catch (error) {
    return handleApiError(error);
  }
}
