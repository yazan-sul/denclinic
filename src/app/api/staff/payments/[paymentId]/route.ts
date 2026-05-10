import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, ValidationError } from '@/lib/errors';
import { UserRole } from '@prisma/client';
import { z } from 'zod';

const editSchema = z.object({
  originalAmount: z.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  currency:       z.enum(['ILS', 'USD', 'JOD', 'EUR']).optional(),
  discountType:   z.enum(['NONE', 'PERCENTAGE', 'FIXED']).default('NONE'),
  discountValue:  z.number().min(0).default(0),
  notes:          z.string().max(500).optional(),
});

export async function PATCH(
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
    if (!roles.some(r => ['STAFF', 'ADMIN', 'CLINIC_OWNER'].includes(r))) {
      throw new ForbiddenError('يجب أن تكون من طاقم العمل');
    }

    const { paymentId } = await params;
    const body = await request.json();
    const v = editSchema.parse(body);

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        id: true, status: true, currency: true,
        appointment: { select: { clinicId: true, service: { select: { name: true } } } },
      },
    });

    if (!payment) throw new NotFoundError('الدفعة غير موجودة');
    if (payment.status !== 'PENDING') throw new ConflictError('يمكن تعديل الفواتير المعلقة فقط');

    const staffClinicIds = user.staffProfiles.map(p => p.clinicId);
    if (payment.appointment && staffClinicIds.length > 0 && !staffClinicIds.includes(payment.appointment.clinicId)) {
      throw new ForbiddenError('لا صلاحية على هذه الدفعة');
    }

    if (v.discountType === 'PERCENTAGE' && v.discountValue > 100) {
      throw new ValidationError('نسبة الخصم يجب أن تكون بين 0 و 100');
    }

    const finalAmount = v.discountType === 'PERCENTAGE'
      ? v.originalAmount * (1 - v.discountValue / 100)
      : v.discountType === 'FIXED'
        ? Math.max(0, v.originalAmount - v.discountValue)
        : v.originalAmount;

    const rounded = Math.round(finalAmount * 100) / 100;

    if (v.discountType === 'FIXED' && v.discountValue > v.originalAmount) {
      throw new ValidationError('قيمة الخصم أكبر من المبلغ الأصلي');
    }

    const discountDesc = v.discountType === 'PERCENTAGE' ? ` (خصم ${v.discountValue}%)`
      : v.discountType === 'FIXED' ? ` (خصم ثابت ${v.discountValue})`
      : '';

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        amount:        rounded,
        originalAmount: v.originalAmount,
        ...(v.currency ? { currency: v.currency } : {}),
        discountType:  v.discountType,
        discountValue: v.discountValue,
        description:   `${payment.appointment?.service.name ?? ''}${discountDesc}${v.notes ? ' — ' + v.notes : ''}`,
      },
      select: { id: true, amount: true, status: true },
    });

    return NextResponse.json({
      success: true,
      data:    updated,
      message: 'تم تعديل الفاتورة',
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0]?.message }, { status: 400 });
    }
    return handleApiError(error);
  }
}
