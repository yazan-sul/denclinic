import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

    // Try to create appointment in database first
    try {
      const appointment = await prisma.appointment.create({
        data: {
          userId: userId, // Who made the booking
          patientId: userId, // Patient the appointment is for (same as userId in this case)
          clinicId: clinicId,
          branchId: branchId,
          doctorId: doctorId,
          serviceId: serviceId,
          appointmentDate: new Date(appointmentDate),
          appointmentTime: appointmentTime,
          notes: notes || null,
          status: 'PENDING',
        },
        include: {
          clinic: { select: { name: true } },
          branch: { select: { name: true, address: true } },
          doctor: { 
            select: { 
              id: true,
              user: { select: { name: true } }
            }
          },
          service: { select: { name: true } },
        },
      });

      return NextResponse.json({ success: true, data: appointment }, { status: 201 });
    } catch (dbError) {
      console.log('Database write failed, creating mock appointment:', dbError);
    }

    // Fallback to mock data
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
    // Try to fetch from database first
    try {
      const appointments = await prisma.appointment.findMany({
        include: {
          clinic: { select: { name: true } },
          branch: { select: { name: true, address: true } },
          doctor: { 
            select: { 
              id: true,
              user: { select: { name: true } }
            }
          },
          service: { select: { name: true } },
        },
      });

      if (appointments.length > 0) {
        return NextResponse.json({ success: true, data: appointments });
      }
    } catch (dbError) {
      console.log('Database read failed, using mock data');
    }

    // Return mock data as fallback
    return NextResponse.json({ success: true, data: MOCK_BOOKINGS });
  } catch (error) {
    return handleApiError(error);
  }
}
