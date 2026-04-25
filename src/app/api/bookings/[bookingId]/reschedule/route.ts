import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, ConflictError, NotFoundError, UnauthorizedError, ValidationError } from '@/lib/errors';
import { bookingRescheduleSchema } from '@/lib/validators';
import { evaluateAppointmentPolicy } from '@/lib/appointmentPolicy';
import { z } from 'zod';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) {
      throw new UnauthorizedError('غير مصرح');
    }

    const decoded = verifyToken(token);
    if (!decoded?.userId) {
      throw new UnauthorizedError('رمز غير صالح أو منتهي الصلاحية');
    }

    const { bookingId } = await params;
    const body = await request.json();
    const validated = bookingRescheduleSchema.parse(body);

    const appointmentDateObj = new Date(validated.appointmentDate);
    if (Number.isNaN(appointmentDateObj.getTime())) {
      throw new ValidationError('تاريخ الموعد غير صحيح');
    }

    const endDate = new Date(appointmentDateObj);
    endDate.setDate(endDate.getDate() + 1);

    const updatedAppointment = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          userId: true,
          status: true,
          branchId: true,
          doctorId: true,
          appointmentDate: true,
          appointmentTime: true,
          slotId: true,
        },
      });

      if (!appointment) {
        throw new NotFoundError('الحجز غير موجود');
      }

      if (appointment.userId !== decoded.userId) {
        throw new UnauthorizedError('لا يمكنك إعادة جدولة هذا الحجز');
      }

      if (appointment.status !== 'CONFIRMED' && appointment.status !== 'PENDING') {
        throw new ConflictError('يمكن إعادة جدولة الحجوزات المؤكدة أو المعلقة فقط');
      }

      const policy = evaluateAppointmentPolicy(appointment.appointmentDate, appointment.appointmentTime);
      if (!policy.canReschedule) {
        throw new ConflictError(`لا يمكن إعادة الجدولة قبل أقل من ${policy.refundWindowHours} ساعات من الموعد`);
      }

      const existingSameTimeAppointment = await tx.appointment.findFirst({
        where: {
          userId: decoded.userId,
          id: { not: bookingId },
          appointmentTime: validated.appointmentTime,
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
        throw new ConflictError('لا يمكن جدولة أكثر من موعد نشط بنفس التاريخ والوقت، حتى لو كان في فرع مختلف');
      }

      const targetSlot = await tx.slot.findFirst({
        where: {
          branchId: appointment.branchId,
          doctorId: appointment.doctorId,
          startTime: validated.appointmentTime,
          slotDate: {
            gte: appointmentDateObj,
            lt: endDate,
          },
          isAvailable: true,
        },
        select: { id: true },
      });

      if (!targetSlot) {
        throw new ConflictError('الوقت الجديد غير متاح أو تم حجزه بالفعل');
      }

      const lockResult = await tx.slot.updateMany({
        where: {
          id: targetSlot.id,
          isAvailable: true,
        },
        data: {
          isAvailable: false,
        },
      });

      if (lockResult.count === 0) {
        throw new ConflictError('الوقت الجديد غير متاح أو تم حجزه بالفعل');
      }

      if (appointment.slotId) {
        await tx.slot.update({
          where: { id: appointment.slotId },
          data: { isAvailable: true },
        });
      }

      return tx.appointment.update({
        where: { id: bookingId },
        data: {
          appointmentDate: appointmentDateObj,
          appointmentTime: validated.appointmentTime,
          slotId: targetSlot.id,
          status: 'RESCHEDULED',
          retryDeadline: null,
        },
        select: {
          id: true,
          status: true,
          appointmentDate: true,
          appointmentTime: true,
        },
      });
    });

    return NextResponse.json({
      success: true,
      data: updatedAppointment,
      message: 'تمت إعادة جدولة الموعد بنجاح',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.issues?.[0];
      const message = (firstError as { message?: string })?.message || 'بيانات غير صحيحة';
      return NextResponse.json(
        { success: false, message },
        { status: 400 }
      );
    }
    return handleApiError(error);
  }
}
