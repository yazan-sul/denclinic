import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, UnauthorizedError, ConflictError, ValidationError } from '@/lib/errors';
import { bookingSchema } from '@/lib/validators';
import { verifyToken } from '@/lib/auth';
import { buildDbUnavailableResponse } from '@/lib/apiMode';
import { z } from 'zod';
import { expireFailedPayments } from '@/lib/appointments';

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
      const [branch, doctor, service] = await Promise.all([
        tx.branch.findUnique({
          where: { id: branchId },
          select: { id: true, clinicId: true },
        }),
        tx.doctor.findUnique({
          where: { id: doctorId },
          select: {
            id: true,
            clinicId: true,
            branchId: true,
            servicesOffered: {
              where: { id: serviceId },
              select: { id: true },
            },
          },
        }),
        tx.service.findUnique({
          where: { id: serviceId },
          select: { id: true, clinicId: true },
        }),
      ]);

      if (!branch || branch.clinicId !== clinicId) {
        throw new ValidationError('الفرع المحدد لا ينتمي للعيادة');
      }

      if (!doctor || doctor.branchId !== branchId || doctor.clinicId !== clinicId) {
        throw new ValidationError('الطبيب المحدد لا ينتمي للعيادة أو الفرع');
      }

      if (!service || service.clinicId !== clinicId) {
        throw new ValidationError('الخدمة المحددة لا تنتمي للعيادة');
      }

      if (doctor.servicesOffered.length === 0) {
        throw new ValidationError('الطبيب المحدد لا يقدم هذه الخدمة');
      }

      const existingAppointmentAtSameTime = await tx.appointment.findFirst({
        where: {
          userId: decoded.userId,
          appointmentTime,
          appointmentDate: {
            gte: appointmentDateObj,
            lt: endDate,
          },
          status: {
            in: ['PENDING', 'CONFIRMED'],
          },
        },
        select: {
          id: true,
          clinic: {
            select: {
              name: true,
            },
          },
        },
      });

      if (existingAppointmentAtSameTime) {
        throw new ConflictError(
          `لديك حجز آخر في نفس الوقت${existingAppointmentAtSameTime.clinic?.name ? ` في ${existingAppointmentAtSameTime.clinic.name}` : ''}`
        );
      }

      const priorEligibleVisitsCount = await tx.appointment.count({
        where: {
          userId: decoded.userId,
          clinicId,
          branchId,
          OR: [
            {
              status: {
                in: ['CONFIRMED', 'COMPLETED', 'NO_SHOW', 'RESCHEDULED'],
              },
            },
            {
              payment: {
                is: {
                  status: {
                    in: ['PENDING', 'COMPLETED'],
                  },
                },
              },
            },
          ],
        },
      });

      const isFirstTimeAtScope = priorEligibleVisitsCount === 0;

      const patient = await tx.patient.upsert({
        where: { userId: decoded.userId },
        update: {},
        create: {
          userId: decoded.userId,
        },
        select: { id: true },
      });

      const existingSameTimeAppointment = await tx.appointment.findFirst({
        where: {
          userId: decoded.userId,
          appointmentTime,
          appointmentDate: {
            gte: appointmentDateObj,
            lt: endDate,
          },
          status: {
            in: ['PENDING', 'CONFIRMED', 'RESCHEDULED', 'PAYMENT_FAILED'],
          },
        },
        select: { id: true },
      });

      if (existingSameTimeAppointment) {
        throw new ConflictError('لا يمكن حجز أكثر من موعد نشط بنفس التاريخ والوقت، حتى لو كان في فرع مختلف');
      }
      
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

      const createdAppointment = await tx.appointment.create({
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

      return {
        appointment: createdAppointment,
        paymentPolicy: {
          isFirstTimeAtScope,
          requiresPrepayment: isFirstTimeAtScope,
          allowedMethods: isFirstTimeAtScope ? ['CARD'] : ['CARD', 'CASH'],
        },
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: appointment.appointment,
        payment: {
          amount: appointment.appointment.service?.basePrice ?? 50,
          currency: 'LYD',
        },
        paymentPolicy: appointment.paymentPolicy,
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
    // Check and release expired slots
    await expireFailedPayments();

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
