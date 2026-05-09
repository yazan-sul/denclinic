import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError } from '@/lib/errors';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const refundSchema = z.object({
  reason: z.string().min(1, 'سبب الاسترداد مطلوب').max(500),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');
    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { roles: true, staffProfiles: { select: { clinicId: true } } },
    });
    if (!user) throw new UnauthorizedError('غير مصرح');

    const roles = user.roles as UserRole[];
    const isStaff = roles.some(r => ['STAFF', 'ADMIN', 'CLINIC_OWNER'].includes(r));
    if (!isStaff) throw new ForbiddenError('يجب أن تكون من طاقم العمل');

    const body = await request.json();
    const { reason } = refundSchema.parse(body);
    const { paymentId } = await params;

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
        userId: true,
        appointment: {
          select: {
            clinicId: true,
            patient: { select: { userId: true, user: { select: { name: true } } } },
            service:  { select: { name: true } },
            branch:   { select: { name: true } },
          },
        },
      },
    });

    if (!payment) throw new NotFoundError('الدفعة غير موجودة');

    // Verify payment belongs to staff's clinic
    if (payment.appointment) {
      const staffClinicIds = user.staffProfiles.map(p => p.clinicId);
      if (staffClinicIds.length > 0 && !staffClinicIds.includes(payment.appointment.clinicId)) {
        throw new ForbiddenError('لا صلاحية على هذه الدفعة');
      }
    }

    if (payment.status !== 'COMPLETED') {
      throw new ConflictError('يمكن استرداد الدفعات المكتملة فقط');
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: paymentId },
        data: {
          status:      'REFUNDED',
          description: payment.appointment
            ? `${payment.appointment.service.name} — استرداد: ${reason}`
            : `استرداد: ${reason}`,
        },
      });

      // Notify patient
      const patientUserId = payment.appointment?.patient?.userId ?? payment.userId;
      if (patientUserId) {
        await tx.notification.create({
          data: {
            userId:  patientUserId,
            type:    'APPOINTMENT_UPDATED',
            title:   'تم استرداد دفعتك',
            message: `تم استرداد مبلغ ${payment.amount.toFixed(2)} ${payment.currency}. السبب: ${reason}`,
            link:    '/patient/bookings',
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      data:    { paymentId, status: 'REFUNDED' },
      message: 'تم الاسترداد بنجاح',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0]?.message }, { status: 400 });
    }
    return handleApiError(error);
  }
}
