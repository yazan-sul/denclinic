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
      forPatientId,
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

      // ── Determine effective patient early (needed for double-booking + first-time checks) ──
      let effectivePatientId: number;
      let dependentUserId: number | null = null;

      if (forPatientId) {
        const access = await tx.patientGuardian.findFirst({
          where: { guardianUserId: decoded.userId, patientId: forPatientId, status: 'APPROVED' },
          select: {
            patientId: true,
            dependentPatient: { select: { userId: true } },
          },
        });
        if (!access) throw new ValidationError('ليس لديك صلاحية الحجز لهذا الشخص');
        effectivePatientId = forPatientId;
        dependentUserId = access.dependentPatient.userId;
      } else {
        const selfPatient = await tx.patient.upsert({
          where: { userId: decoded.userId },
          update: {},
          create: { userId: decoded.userId },
          select: { id: true },
        });
        effectivePatientId = selfPatient.id;
      }

      // ── Bug fix 1: check double-booking against the actual patient being booked ──
      const patientConflict = await tx.appointment.findFirst({
        where: {
          patientId: effectivePatientId,
          appointmentTime,
          appointmentDate: { gte: appointmentDateObj, lt: endDate },
          status: { in: ['PENDING', 'CONFIRMED', 'RESCHEDULED', 'PAYMENT_FAILED'] },
        },
        select: {
          id: true,
          clinic: { select: { name: true } },
        },
      });

      if (patientConflict) {
        const who = forPatientId ? 'للشخص المحدد' : 'لك';
        throw new ConflictError(
          `يوجد حجز نشط ${who} في نفس الوقت${patientConflict.clinic?.name ? ` في ${patientConflict.clinic.name}` : ''}`
        );
      }

      // ── Bug fix 2: first-time status based on patient record, not booker ──
      const priorEligibleVisitsCount = await tx.appointment.count({
        where: {
          patientId: effectivePatientId,
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
          patientId: effectivePatientId,
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

      // ── Bug fix 3: notify dependent when guardian books for them ──
      if (dependentUserId) {
        const guardianUser = await tx.user.findUnique({
          where: { id: decoded.userId },
          select: { name: true },
        });
        await tx.notification.create({
          data: {
            userId: dependentUserId,
            type: 'APPOINTMENT_REMINDER',
            title: 'تم حجز موعد لك',
            message: `قام ${guardianUser?.name ?? 'ولي أمرك'} بحجز موعد لك في ${createdAppointment.clinic?.name ?? 'العيادة'} بتاريخ ${appointmentDate}`,
            link: '/patient/appointments',
          },
        });
      }

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
