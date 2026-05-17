import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError, ConflictError } from '@/lib/errors';
import { UserRole } from '@prisma/client';
import { rejectIfDoctorMode } from '@/lib/roleGuard';
import { sendPushToUser } from '@/lib/web-push';

// POST /api/clinic/staff-bookings
// Staff books an appointment on behalf of a patient using an available slot
export async function POST(request: NextRequest) {
  try {
    rejectIfDoctorMode(request);

    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const staffUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { roles: true, staffProfiles: { select: { clinicId: true, branchId: true } } },
    });

    if (!staffUser) throw new UnauthorizedError('غير مصرح');

    const roles = staffUser.roles as UserRole[];
    if (!roles.includes('STAFF') && !roles.includes('CLINIC_OWNER') && !roles.includes('ADMIN')) {
      throw new ForbiddenError('لا تملك صلاحية الحجز بالنيابة عن المرضى');
    }

    const body = await request.json();
    const { patientId, slotId, serviceId, notes } = body;

    if (!patientId) throw new ValidationError('معرّف المريض مطلوب');
    if (!slotId)    throw new ValidationError('الموعد المطلوب مطلوب');
    if (!serviceId) throw new ValidationError('الخدمة مطلوبة');

    const result = await prisma.$transaction(async (tx) => {
      // Load the slot with all needed info
      const slot = await tx.slot.findUnique({
        where: { id: Number(slotId) },
        include: {
          doctor: { select: { id: true, clinicId: true, branchId: true } },
          branch: { select: { id: true, clinicId: true } },
        },
      });

      if (!slot) throw new ValidationError('الموعد غير موجود');
      if (!slot.isAvailable) throw new ConflictError('الموعد محجوز بالفعل');

      // Verify patient exists
      const patient = await tx.patient.findUnique({
        where: { id: Number(patientId) },
        select: { id: true, userId: true },
      });
      if (!patient) throw new ValidationError('المريض غير موجود في النظام');

      // Verify service belongs to clinic
      const service = await tx.service.findUnique({
        where: { id: Number(serviceId) },
        select: { id: true, clinicId: true },
      });
      if (!service || service.clinicId !== slot.doctor.clinicId) {
        throw new ValidationError('الخدمة لا تنتمي لهذه العيادة');
      }

      // Check patient double-booking at same date/time
      const slotDateStart = new Date(slot.slotDate);
      const slotDateEnd   = new Date(slotDateStart);
      slotDateEnd.setDate(slotDateEnd.getDate() + 1);

      const conflict = await tx.appointment.findFirst({
        where: {
          patientId: patient.id,
          appointmentTime: slot.startTime,
          appointmentDate: { gte: slotDateStart, lt: slotDateEnd },
          status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED'] },
        },
      });
      if (conflict) throw new ConflictError('المريض لديه موعد في نفس الوقت');

      // Lock the slot
      const locked = await tx.slot.updateMany({
        where: { id: slot.id, isAvailable: true },
        data:  { isAvailable: false },
      });
      if (locked.count === 0) throw new ConflictError('الموعد محجوز بالفعل');

      // Create appointment
      const appointment = await tx.appointment.create({
        data: {
          userId:          decoded.userId,   // staff who created it
          patientId:       patient.id,
          clinicId:        slot.doctor.clinicId,
          branchId:        slot.doctor.branchId,
          doctorId:        slot.doctor.id,
          serviceId:       service.id,
          slotId:          slot.id,
          appointmentDate: slot.slotDate,
          appointmentTime: slot.startTime,
          notes:           notes || null,
          status:          'CONFIRMED',
        },
        include: {
          clinic:   { select: { name: true } },
          branch:   { select: { name: true } },
          doctor:   { select: { id: true, user: { select: { id: true, name: true } } } },
          service:  { select: { name: true } },
          patient:  { select: { id: true, userId: true, user: { select: { name: true, phoneNumber: true } } } },
        },
      });

      const clinicName = appointment.clinic?.name ?? 'العيادة';
      const dateStr = slot.slotDate.toLocaleDateString('ar-EG', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      });

      // إشعار المريض
      await tx.notification.create({
        data: {
          userId:     patient.userId,
          type:       'APPOINTMENT_REMINDER',
          title:      'تم حجز موعد لك',
          message:    `تم تسجيل موعد لك في ${clinicName} بتاريخ ${dateStr} الساعة ${slot.startTime}`,
          link:       '/patient/appointments',
          targetRole: 'PATIENT',
        },
      });

      // إشعار الطبيب
      await tx.notification.create({
        data: {
          userId:  appointment.doctor.user.id,
          type:    'APPOINTMENT_REMINDER',
          title:   'موعد جديد',
          message: `تم تسجيل موعد جديد للمريض ${appointment.patient.user.name} بتاريخ ${dateStr} الساعة ${slot.startTime}`,
          link:    '/doctor/appointments',
        },
      });

      return appointment;
    });

    sendPushToUser(result.patient.userId, {
      title: 'تم حجز موعد لك',
      body: `موعدك في ${result.clinic?.name ?? 'العيادة'} الساعة ${result.appointmentTime}`,
      url: '/patient/appointments',
    }).catch(() => {});

    sendPushToUser(result.doctor.user.id, {
      title: 'موعد جديد',
      body: `موعد جديد للمريض ${result.patient.user.name} الساعة ${result.appointmentTime}`,
      url: '/doctor/appointments',
    }).catch(() => {});

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
