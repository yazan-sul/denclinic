import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  handleApiError,
  ForbiddenError,
  UnauthorizedError,
  ValidationError,
  NotFoundError,
  ConflictError,
} from '@/lib/errors';
import { AppointmentStatus, PaymentMethod, PaymentStatus, UserRole } from '@prisma/client';

async function resolveClinicScope(userId: number, requestedClinicId: number | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      doctorProfile: { select: { clinicId: true } },
      staffProfile: { select: { clinicId: true } },
      clinicsOwned: { select: { id: true } },
    },
  });

  if (!user) {
    throw new UnauthorizedError('غير مصرح');
  }

  const roles = user.roles as UserRole[];

  if (roles.includes('ADMIN')) {
    if (!requestedClinicId) {
      throw new ValidationError('clinicId مطلوب لهذا المستخدم');
    }
    return requestedClinicId;
  }

  if (roles.includes('DOCTOR') && user.doctorProfile?.clinicId) {
    return user.doctorProfile.clinicId;
  }

  if (roles.includes('STAFF') && user.staffProfile?.clinicId) {
    return user.staffProfile.clinicId;
  }

  if (roles.includes('CLINIC_OWNER') && user.clinicsOwned?.id) {
    return user.clinicsOwned.id;
  }

  throw new ForbiddenError('ليست لديك صلاحية الوصول إلى سجلات العيادة');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ appointmentId: string }> }
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

    const { appointmentId } = await params;
    if (!appointmentId?.trim()) {
      throw new ValidationError('معرف الموعد غير صحيح');
    }

    const clinicIdQuery = request.nextUrl.searchParams.get('clinicId');
    const requestedClinicId = clinicIdQuery ? Number.parseInt(clinicIdQuery, 10) : null;
    if (clinicIdQuery && (!requestedClinicId || requestedClinicId <= 0)) {
      throw new ValidationError('clinicId غير صحيح');
    }

    const clinicId = await resolveClinicScope(decoded.userId, requestedClinicId);

    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.findUnique({
        where: { id: appointmentId },
        select: { id: true, clinicId: true, userId: true, status: true },
      });

      if (!appointment || appointment.clinicId !== clinicId) {
        throw new NotFoundError('السجل غير موجود');
      }

      if (
        appointment.status === AppointmentStatus.CANCELLED ||
        appointment.status === AppointmentStatus.NO_SHOW
      ) {
        throw new ValidationError('لا يمكن إنهاء موعد ملغي أو لم يحضر');
      }

      if (appointment.status === AppointmentStatus.COMPLETED) {
        throw new ConflictError('تم إنهاء الموعد بالفعل');
      }

      const existingPayment = await tx.payment.findUnique({
        where: { appointmentId },
        select: { id: true, status: true },
      });

      const treatmentTotals = await tx.treatment.aggregate({
        where: { appointmentId },
        _sum: { cost: true },
      });

      const amount = treatmentTotals._sum.cost ?? 0;

      let payment = null as null | { id: string; status: PaymentStatus };

      if (!existingPayment) {
        payment = await tx.payment.create({
          data: {
            appointmentId,
            userId: appointment.userId,
            amount,
            currency: 'EGP',
            method: PaymentMethod.CASH,
            status: PaymentStatus.PENDING,
            description: 'Appointment charges',
          },
          select: { id: true, status: true },
        });
      } else if (existingPayment.status === PaymentStatus.PENDING) {
        payment = await tx.payment.update({
          where: { id: existingPayment.id },
          data: { amount },
          select: { id: true, status: true },
        });
      } else if (
        existingPayment.status === PaymentStatus.FAILED ||
        existingPayment.status === PaymentStatus.CANCELLED
      ) {
        await tx.payment.update({
          where: { id: existingPayment.id },
          data: { appointmentId: null },
        });
        payment = await tx.payment.create({
          data: {
            appointmentId,
            userId: appointment.userId,
            amount,
            currency: 'EGP',
            method: PaymentMethod.CASH,
            status: PaymentStatus.PENDING,
            description: 'Appointment charges',
          },
          select: { id: true, status: true },
        });
      } else {
        payment = existingPayment;
      }

      const updatedAppointment = await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: AppointmentStatus.COMPLETED },
      });

      return { payment, appointment: updatedAppointment };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
