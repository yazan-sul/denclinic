import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import {
  handleApiError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '@/lib/errors';
import { AppointmentStatus, UserRole } from '@prisma/client';
import { createNotification, createPatientNotification } from '@/lib/notifications';
import { z } from 'zod';

const updateRecordSchema = z
  .object({
    status: z.nativeEnum(AppointmentStatus).optional(),
    reasonForVisit: z.string().trim().max(1000, 'سبب الزيارة طويل جداً').optional(),
    notes: z.string().trim().max(2000, 'الملاحظات طويلة جداً').optional(),
  })
  .refine((data) => data.status || data.reasonForVisit !== undefined || data.notes !== undefined, {
    message: 'لا توجد بيانات للتحديث',
  });

async function resolveClinicScope(userId: number, requestedClinicId: number | null) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      doctorProfiles: { select: { clinicId: true } },
      staffProfiles: { select: { clinicId: true } },
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

  if (roles.includes('DOCTOR') && user.doctorProfiles.length > 0) {
    const profile = requestedClinicId
      ? user.doctorProfiles.find(p => p.clinicId === requestedClinicId) ?? user.doctorProfiles[0]
      : user.doctorProfiles[0];
    return profile.clinicId;
  }

  if (roles.includes('STAFF') && user.staffProfiles.length > 0) {
    const profile = requestedClinicId
      ? user.staffProfiles.find(p => p.clinicId === requestedClinicId) ?? user.staffProfiles[0]
      : user.staffProfiles[0];
    return profile.clinicId;
  }

  if (roles.includes('CLINIC_OWNER') && user.clinicsOwned?.id) {
    return user.clinicsOwned.id;
  }

  throw new ForbiddenError('ليست لديك صلاحية تعديل سجلات العيادة');
}

export async function PATCH(
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

    const body = await request.json();
    const parsedBody = updateRecordSchema.parse(body);
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

    const existing = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { id: true, clinicId: true },
    });

    if (!existing || existing.clinicId !== clinicId) {
      throw new NotFoundError('السجل غير موجود');
    }

    const updated = await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        ...(parsedBody.status ? { status: parsedBody.status } : {}),
        ...(parsedBody.reasonForVisit !== undefined
          ? { reasonForVisit: parsedBody.reasonForVisit || null }
          : {}),
        ...(parsedBody.notes !== undefined ? { notes: parsedBody.notes || null } : {}),
      },
      include: {
        clinic: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
        patient: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                name: true,
                phoneNumber: true,
                email: true,
              },
            },
          },
        },
        doctor: {
          select: {
            id: true,
            user: { select: { id: true, name: true } },
          },
        },
        service: { select: { id: true, name: true } },
      },
    });

    // إشعارات تغيير الحالة
    if (parsedBody.status === 'NO_SHOW') {
      const patientUserId = updated.patient?.user.id;
      const doctorUserId  = updated.doctor?.user.id;
      const branchName    = updated.branch?.name ?? 'العيادة';

      if (patientUserId) {
        await createPatientNotification(patientUserId, {
          type: 'APPOINTMENT_UPDATED',
          title: 'غياب عن الموعد',
          message: `تم تسجيل غيابك عن موعدك في ${branchName}. للاستفسار تواصل مع العيادة.`,
          link: '/patient/bookings',
        });
      }
      if (doctorUserId) {
        await createNotification({
          userId: doctorUserId, type: 'APPOINTMENT_UPDATED',
          title: 'مريض لم يحضر',
          message: `المريض ${updated.patient?.user.name ?? ''} لم يحضر إلى الموعد في ${branchName}.`,
          link: '/doctor/appointments', targetRole: 'DOCTOR',
        });
      }
    }

    if (parsedBody.status === 'COMPLETED') {
      const patientUserId = updated.patient?.user.id;
      if (patientUserId) {
        await createPatientNotification(patientUserId, {
          type: 'APPOINTMENT_UPDATED',
          title: 'تمت زيارتك بنجاح',
          message: `شكراً لزيارتك ${updated.clinic?.name ?? 'عيادتنا'}. نتمنى لك دوام الصحة والعافية.`,
          link: '/patient/bookings',
        });
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.issues[0]?.message || 'بيانات غير صحيحة';
      return NextResponse.json(
        {
          success: false,
          error: { message, code: 'VALIDATION_ERROR' },
        },
        { status: 400 }
      );
    }

    return handleApiError(error);
  }
}
