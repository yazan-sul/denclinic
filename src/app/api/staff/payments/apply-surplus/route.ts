import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';
import { Currency, PaymentMethod, UserRole } from '@prisma/client';
import { z } from 'zod';

const schema = z.object({
  patientId: z.number().int().positive(),
  clinicId:  z.number().int().positive(),
});

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const v = schema.parse(body);

    const staffClinicIds = user.staffProfiles.map(p => p.clinicId);
    if (staffClinicIds.length > 0 && !staffClinicIds.includes(v.clinicId)) {
      throw new ForbiddenError('لا صلاحية على هذه العيادة');
    }

    // Fetch patient userId
    const patient = await prisma.patient.findUnique({
      where: { id: v.patientId },
      select: { userId: true },
    });
    if (!patient) throw new ValidationError('المريض غير موجود');

    // Fetch existing surplus payments
    const surplusPayments = await prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        surplus: { gt: 0.005 },
        appointment: { patientId: v.patientId, clinicId: v.clinicId },
      },
      select: { id: true, surplus: true, method: true },
      orderBy: { transactionTime: 'asc' },
    });

    const totalSurplus = Math.round(
      surplusPayments.reduce((s, p) => s + (p.surplus ?? 0), 0) * 100
    ) / 100;

    if (totalSurplus <= 0.005) throw new ValidationError('لا يوجد فائض لتطبيقه');

    // Fetch unpaid invoices oldest-first
    const unpaid = await prisma.appointment.findMany({
      where: {
        patientId: v.patientId,
        clinicId:  v.clinicId,
        status: { in: ['CONFIRMED', 'COMPLETED', 'RESCHEDULED'] },
        OR: [
          { payment: null },
          { payment: { status: 'PENDING' } },
        ],
      },
      select: {
        id: true,
        userId: true,
        service: { select: { name: true, basePrice: true } },
        payment: { select: { id: true, amount: true, status: true, surplus: true, method: true } },
      },
      orderBy: { appointmentDate: 'asc' },
    });

    if (unpaid.length === 0) throw new ValidationError('لا توجد فواتير معلقة');

    let remaining = totalSurplus;
    const settled: string[] = [];

    await prisma.$transaction(async (tx) => {
      // Apply surplus to invoices oldest-first
      for (const appt of unpaid) {
        if (remaining <= 0.005) break;

        const fullCost: number    = appt.payment?.amount ?? appt.service.basePrice ?? 0;
        const alreadyPaid: number = (appt.payment?.surplus && appt.payment.surplus < -0.005)
          ? Math.max(0, Math.round((fullCost + appt.payment.surplus) * 100) / 100)
          : 0;
        const stillOwed: number   = Math.max(0, Math.round((fullCost - alreadyPaid) * 100) / 100);

        if (stillOwed <= 0.005) continue;

        const apply       = Math.min(remaining, stillOwed);
        const isCompleted = apply >= stillOwed - 0.005;
        const newAllocated = Math.round((alreadyPaid + apply) * 100) / 100;
        const newSurplus   = isCompleted ? 0 : Math.round((newAllocated - fullCost) * 100) / 100;
        const method       = (appt.payment?.method ?? surplusPayments[0]?.method ?? 'CASH') as PaymentMethod;

        let paymentId: string;
        if (appt.payment) {
          await tx.payment.update({
            where: { id: appt.payment.id },
            data: {
              status:      isCompleted ? 'COMPLETED' : 'PENDING',
              paidAmount:  newAllocated,
              paidCurrency: 'ILS' as Currency,
              exchangeRate: 1,
              surplus:     newSurplus,
              method,
            },
          });
          paymentId = appt.payment.id;
        } else {
          const created = await tx.payment.create({
            data: {
              appointmentId:   appt.id,
              userId:          appt.userId,
              amount:          fullCost,
              originalAmount:  appt.service.basePrice ?? fullCost,
              currency:        'ILS' as Currency,
              paidAmount:      newAllocated,
              paidCurrency:    'ILS' as Currency,
              exchangeRate:    1,
              surplus:         newSurplus,
              method,
              status:          isCompleted ? 'COMPLETED' : 'PENDING',
              description:     `${appt.service.name} — تطبيق فائض`,
              transactionId:   `APPLY-SURPLUS-${decoded.userId}-${Date.now()}`,
              transactionTime: new Date(),
            },
            select: { id: true },
          });
          paymentId = created.id;
        }

        // Record the surplus application as a transaction on the invoice payment
        await tx.paymentTransaction.create({
          data: {
            paymentId,
            paidAmount:   apply,
            paidCurrency: 'ILS' as Currency,
            exchangeRate: 1,
            amountInCost: apply,
            method,
            notes:        'تطبيق فائض',
            paidAt:       new Date(),
          },
        });

        settled.push(appt.id);
        remaining = Math.round((remaining - apply) * 100) / 100;
      }

      // Deduct used surplus from surplus payments + record negative transactions
      const totalUsed = Math.round((totalSurplus - remaining) * 100) / 100;
      let toDeduct = totalUsed;
      for (const sp of surplusPayments) {
        if (toDeduct <= 0.005) break;
        const deduct = Math.min(toDeduct, sp.surplus ?? 0);
        await tx.payment.update({
          where: { id: sp.id },
          data:  { surplus: Math.round(((sp.surplus ?? 0) - deduct) * 100) / 100 },
        });
        await tx.paymentTransaction.create({
          data: {
            paymentId:    sp.id,
            paidAmount:   deduct,
            paidCurrency: 'ILS' as Currency,
            exchangeRate: 1,
            amountInCost: -deduct,
            method:       sp.method as PaymentMethod,
            notes:        'تطبيق فائض على دين',
            paidAt:       new Date(),
          },
        });
        toDeduct = Math.round((toDeduct - deduct) * 100) / 100;
      }
    });

    const netMsg = remaining > 0.005
      ? `يتبقى فائض ${remaining.toFixed(2)} ₪`
      : 'تم تصفية الدين بالكامل';

    return NextResponse.json({
      success: true,
      data: { settled, remainingSurplus: remaining },
      message: `تم تطبيق الفائض على ${settled.length} فاتورة — ${netMsg}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0]?.message ?? 'بيانات غير صحيحة' }, { status: 400 });
    }
    return handleApiError(error);
  }
}
