import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { MOCK_BOOKINGS, MOCK_CLINICS, MOCK_BRANCHES, MOCK_DOCTORS, MOCK_SERVICES, MOCK_USERS } from '@/lib/mockData';
import { handleApiError, UnauthorizedError, ValidationError } from '@/lib/errors';
import { bookingSchema } from '@/lib/validators';
import { verifyToken } from '@/lib/auth';
import { z } from 'zod';

let mockBookingsCounter = MOCK_BOOKINGS.length;

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) {
      throw new UnauthorizedError('غير مصرح');
    }

    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      throw new UnauthorizedError('رمز غير صالح أو منتهي الصلاحية');
    }

    const body = await request.json();
    
    // Validate input with Zod schema
    const validated = bookingSchema.parse(body);
    const {
      clinicId,
      branchId,
      doctorId,
      serviceId,
      appointmentDate,
      appointmentTime,
      notes,
    } = validated;

    const patient = await prisma.patient.upsert({
      where: { userId: decoded.userId },
      update: {},
      create: {
        userId: decoded.userId,
      },
      select: { id: true },
    });

    const appointment = await prisma.appointment.create({
      data: {
        userId: decoded.userId,
        patientId: patient.id,
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
            user: { select: { name: true } },
          },
        },
        service: { select: { name: true, basePrice: true } },
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: appointment,
        payment: {
          amount: appointment.service?.basePrice ?? 50,
          currency: 'LYD',
        },
      },
      { status: 201 }
    );
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
