import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, ConflictError, NotFoundError, UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';
import { evaluateAppointmentPolicy } from '@/lib/appointmentPolicy';
import { UserRole } from '@prisma/client';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> }
) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح أو منتهي الصلاحية');

    const actor = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        roles: true,
        staffProfiles: { select: { clinicId: true } },
      },
    });
    if (!actor) throw new UnauthorizedError('غير مصرح');

    const roles = actor.roles as UserRole[];
    const isStaff = roles.includes('STAFF') || roles.includes('ADMIN') || roles.includes('CLINIC_OWNER');

    const body = await request.json();
    const { slotId } = body as { slotId?: number };

    if (!slotId || !Number.isInteger(slotId) || slotId <= 0) {
      throw new ValidationError('slotId مطلوب وصحيح');
    }

    const { bookingId } = await params;

    const updatedAppointment = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: bookingId },
        select: {
          id: true,
          userId: true,
          status: true,
          clinicId: true,
          branchId: true,
          doctorId: true,
          appointmentDate: true,
          appointmentTime: true,
          slotId: true,
          patient: {
            select: {
              userId: true,
              user: { select: { name: true } },
            },
          },
          doctor: {
            select: {
              userId: true,
              user: { select: { name: true } },
            },
          },
          branch: { select: { name: true } },
          clinic: { select: { name: true } },
        },
      });

      if (!appointment) throw new NotFoundError('الحجز غير موجود');

      // Authorization
      if (isStaff) {
        const staffClinicIds = actor.staffProfiles.map(p => p.clinicId);
        if (staffClinicIds.length > 0 && !staffClinicIds.includes(appointment.clinicId)) {
          throw new ForbiddenError('لا يمكنك إعادة جدولة حجز خارج عيادتك');
        }
      } else {
        if (appointment.userId !== decoded.userId) {
          throw new UnauthorizedError('لا يمكنك إعادة جدولة هذا الحجز');
        }
      }

      if (!['PENDING', 'CONFIRMED', 'RESCHEDULED'].includes(appointment.status)) {
        throw new ConflictError('يمكن إعادة جدولة الحجوزات النشطة فقط');
      }

      const policy = evaluateAppointmentPolicy(appointment.appointmentDate, appointment.appointmentTime);
      if (!isStaff && !policy.canReschedule) {
        throw new ConflictError(`لا يمكن إعادة الجدولة قبل أقل من ${policy.refundWindowHours} ساعات من الموعد`);
      }

      // Verify the new slot belongs to the same doctor and branch
      const targetSlot = await tx.slot.findUnique({
        where: { id: slotId },
        select: {
          id: true,
          doctorId: true,
          branchId: true,
          slotDate: true,
          startTime: true,
          isAvailable: true,
        },
      });

      if (!targetSlot) throw new NotFoundError('الوقت المختار غير موجود');
      if (!targetSlot.isAvailable) throw new ConflictError('الوقت المختار محجوز بالفعل');
      if (targetSlot.doctorId !== appointment.doctorId) throw new ConflictError('الوقت المختار لا يخص نفس الطبيب');
      if (targetSlot.branchId !== appointment.branchId) throw new ConflictError('الوقت المختار لا يخص نفس الفرع');
      if (targetSlot.id === appointment.slotId) throw new ConflictError('هذا هو نفس الوقت الحالي');

      // Lock the new slot atomically
      const lockResult = await tx.slot.updateMany({
        where: { id: slotId, isAvailable: true },
        data: { isAvailable: false },
      });
      if (lockResult.count === 0) throw new ConflictError('الوقت المختار لم يعد متاحاً');

      // Release the old slot
      if (appointment.slotId) {
        await tx.slot.update({
          where: { id: appointment.slotId },
          data: { isAvailable: true },
        });
      }

      // Update the appointment
      const updated = await tx.appointment.update({
        where: { id: bookingId },
        data: {
          appointmentDate: targetSlot.slotDate,
          appointmentTime: targetSlot.startTime,
          slotId: targetSlot.id,
          status: 'RESCHEDULED',
          retryDeadline: null,
        },
        select: {
          id: true, status: true,
          appointmentDate: true, appointmentTime: true,
        },
      });

      const newDateStr = targetSlot.slotDate.toLocaleDateString('ar-EG', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });

      // Notify patient
      const patientUserId = appointment.patient?.userId;
      if (patientUserId) {
        await tx.notification.create({
          data: {
            userId: patientUserId,
            type: 'APPOINTMENT_UPDATED',
            title: 'تم تعديل موعدك',
            message: `تم إعادة جدولة موعدك في ${appointment.clinic.name} — ${appointment.branch.name} إلى ${newDateStr} الساعة ${targetSlot.startTime}.`,
            link: '/patient/bookings',
          },
        });
      }

      // Notify doctor
      const doctorUserId = appointment.doctor?.userId;
      if (doctorUserId) {
        await tx.notification.create({
          data: {
            userId: doctorUserId,
            type: 'APPOINTMENT_UPDATED',
            title: 'تم تعديل موعد مريض',
            message: `تم إعادة جدولة موعد المريض ${appointment.patient?.user.name ?? ''} في ${appointment.branch.name} إلى ${newDateStr} الساعة ${targetSlot.startTime}.`,
            link: '/doctor/appointments',
          },
        });
      }

      return updated;
    });

    return NextResponse.json({
      success: true,
      data: updatedAppointment,
      message: 'تمت إعادة جدولة الموعد بنجاح',
    });
  } catch (error) {
    return handleApiError(error);
  }
}
