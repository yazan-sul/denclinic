import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, UnauthorizedError, ConflictError, ValidationError } from '@/lib/errors';
import { bookingSchema } from '@/lib/validators';
import { verifyToken } from '@/lib/auth';
import { buildDbUnavailableResponse } from '@/lib/apiMode';
import { z } from 'zod';

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

    const appointmentDateObj = new Date(appointmentDate);
    if (Number.isNaN(appointmentDateObj.getTime())) {
      throw new ValidationError('تاريخ الموعد غير صحيح');
    }

    const endDate = new Date(appointmentDateObj);
    endDate.setDate(endDate.getDate() + 1);

    const appointment = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.upsert({
        where: { userId: decoded.userId },
        update: {},
        create: {
          userId: decoded.userId,
        },
        select: { id: true },
      });

      const slot = await tx.slot.findFirst({
        where: {
          branchId,
          doctorId,
          startTime: appointmentTime,
          slotDate: {
            gte: appointmentDateObj,
            lt: endDate,
          },
          isAvailable: true,
        },
        select: { id: true },
      });

      if (!slot) {
        throw new ConflictError('الموعد غير متاح أو تم حجزه بالفعل');
      }

      const lockResult = await tx.slot.updateMany({
        where: {
          id: slot.id,
          isAvailable: true,
        },
        data: {
          isAvailable: false,
        },
      });

      if (lockResult.count === 0) {
        throw new ConflictError('الموعد غير متاح أو تم حجزه بالفعل');
      }

      return tx.appointment.create({
        data: {
          userId: decoded.userId,
          patientId: patient.id,
          clinicId,
          branchId,
          doctorId,
          serviceId,
          slotId: slot.id,
          appointmentDate: appointmentDateObj,
          appointmentTime,
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

      return NextResponse.json({ success: true, data: appointments });
    } catch (dbError) {
      console.log('Database read failed:', dbError);
      return buildDbUnavailableResponse('خدمة الحجوزات', dbError);
    }
  } catch (error) {
    return handleApiError(error);
  }
}
