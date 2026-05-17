import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { handleApiError, ConflictError, NotFoundError, UnauthorizedError, ForbiddenError } from '@/lib/errors';
import { verifyToken } from '@/lib/auth';
import { evaluateAppointmentPolicy } from '@/lib/appointmentPolicy';
import { UserRole } from '@prisma/client';
import { sendPushToUser } from '@/lib/web-push';
import { createPatientNotification } from '@/lib/notifications';

export async function POST(
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

    const { bookingId } = await params;

    const appointment = await prisma.appointment.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        userId: true,
        status: true,
        clinicId: true,
        branchId: true,
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
        service: { select: { name: true } },
        branch:  { select: { name: true } },
        clinic:  { select: { name: true } },
        payment: {
          select: { id: true, status: true },
        },
      },
    });

    if (!appointment) throw new NotFoundError('الحجز غير موجود');

    // Authorization: staff can cancel any appointment in their clinic, patient can cancel their own
    if (isStaff) {
      const staffClinicIds = actor.staffProfiles.map(p => p.clinicId);
      if (staffClinicIds.length > 0 && !staffClinicIds.includes(appointment.clinicId)) {
        throw new ForbiddenError('لا يمكنك إلغاء حجز خارج عيادتك');
      }
    } else {
      if (appointment.userId !== decoded.userId) {
        throw new UnauthorizedError('لا يمكنك إلغاء هذا الحجز');
      }
    }

    if (!['PENDING', 'CONFIRMED', 'RESCHEDULED'].includes(appointment.status)) {
      throw new ConflictError('يمكن إلغاء الحجوزات النشطة فقط');
    }

    const policy = evaluateAppointmentPolicy(appointment.appointmentDate, appointment.appointmentTime);
    if (!isStaff && policy.hasStarted) {
      throw new ConflictError('لا يمكن إلغاء موعد بدأ بالفعل');
    }

    const dateStr = appointment.appointmentDate.toLocaleDateString('ar-EG', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const staffUserIds = await prisma.$transaction(async (tx) => {
      // Release the slot
      if (appointment.slotId) {
        await tx.slot.update({
          where: { id: appointment.slotId },
          data: { isAvailable: true },
        });
      }

      // Update payment status (actual money transfer handled separately)
      // Staff can always refund — time policy only applies to patient-initiated cancellations
      if (appointment.payment) {
        let paymentStatus: 'REFUNDED' | 'CANCELLED' | null = null;
        if (appointment.payment.status === 'COMPLETED') {
          paymentStatus = (isStaff || policy.canRefund) ? 'REFUNDED' : 'CANCELLED';
        } else if (appointment.payment.status === 'PENDING') {
          paymentStatus = 'CANCELLED';
        }
        if (paymentStatus) {
          await tx.payment.update({
            where: { id: appointment.payment.id },
            data: { status: paymentStatus },
          });
        }
      }

      // Cancel the appointment
      await tx.appointment.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED', slotId: null, retryDeadline: null },
      });

      // patient notification handled after transaction via createPatientNotification

      // Notify the doctor
      const doctorUserId = appointment.doctor?.userId;
      if (doctorUserId) {
        await tx.notification.create({
          data: {
            userId: doctorUserId,
            type: 'APPOINTMENT_UPDATED',
            title: 'تم إلغاء موعد مريض',
            message: `تم إلغاء موعد المريض ${appointment.patient?.user.name ?? ''} بتاريخ ${dateStr} الساعة ${appointment.appointmentTime} في ${appointment.branch.name}.`,
            link: '/doctor/appointments',
            targetRole: 'DOCTOR',
          },
        });
      }

      // إشعار الستاف في الفرع
      const branchStaff = await tx.staff.findMany({
        where: { branchId: appointment.branchId ?? undefined },
        select: { userId: true },
      });
      for (const s of branchStaff) {
        await tx.notification.create({
          data: {
            userId: s.userId,
            type: 'APPOINTMENT_UPDATED',
            title: 'إلغاء موعد',
            message: `تم إلغاء موعد ${appointment.patient?.user.name ?? 'مريض'} بتاريخ ${dateStr} الساعة ${appointment.appointmentTime}.`,
            link: '/staff/appointments',
            targetRole: 'STAFF',
          },
        });
      }

      return branchStaff.map(s => s.userId);
    });

    const patientUserId = appointment.patient?.userId;
    const doctorUserId  = appointment.doctor?.userId;

    if (patientUserId) {
      await createPatientNotification(patientUserId, {
        type: 'APPOINTMENT_UPDATED',
        title: 'تم إلغاء موعدك',
        message: `تم إلغاء موعدك في ${appointment.clinic.name} — ${appointment.branch.name} بتاريخ ${dateStr} الساعة ${appointment.appointmentTime}. ${policy.canRefund ? 'سيتم استرداد المبلغ قريباً.' : ''}`,
        link: '/patient/bookings',
      });
    }
    if (doctorUserId) sendPushToUser(doctorUserId, { title: 'إلغاء موعد', body: `تم إلغاء موعد ${appointment.patient?.user.name ?? ''} بتاريخ ${dateStr}`, url: '/doctor/appointments' }).catch(() => {});
    for (const uid of staffUserIds) sendPushToUser(uid, { title: 'إلغاء موعد', body: `تم إلغاء موعد ${appointment.patient?.user.name ?? 'مريض'}`, url: '/staff/appointments' }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: { appointmentId: bookingId, status: 'CANCELLED' },
      message: (isStaff || policy.canRefund)
        ? 'تم إلغاء الموعد وسيتم استرداد المبلغ'
        : `تم إلغاء الموعد. لا يمكن استرداد المبلغ قبل أقل من ${policy.refundWindowHours} ساعات من الموعد`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
