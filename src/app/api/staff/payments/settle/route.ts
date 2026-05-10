import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';
import { Currency, PaymentMethod, UserRole } from '@prisma/client';
import { z } from 'zod';

const settleSchema = z.object({
  patientId:   z.number().int().positive(),
  clinicId:    z.number().int().positive(),
  branchId:    z.number().int().positive().optional(),
  method:      z.enum(['CASH', 'CARD', 'BANK_TRANSFER'] as const),
  currency:    z.enum(['ILS', 'USD', 'JOD', 'EUR'] as const).default('ILS'),
  paidAmount:  z.number().positive('المبلغ المدفوع يجب أن يكون أكبر من صفر'),
  exchangeRate: z.number().positive().default(1),
  // Optional: specific invoices to settle. If empty → settle all pending oldest-first
  appointmentIds: z.array(z.string()).optional(),
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
    const isStaff = roles.some(r => ['STAFF', 'ADMIN', 'CLINIC_OWNER'].includes(r));
    if (!isStaff) throw new ForbiddenError('يجب أن تكون من طاقم العمل');

    const body = await request.json();
    const v = settleSchema.parse(body);

    // Get all pending invoices for this patient in this clinic
    const pendingAppts = await prisma.appointment.findMany({
      where: {
        patientId: v.patientId,
        clinicId:  v.clinicId,
        ...(v.branchId ? { branchId: v.branchId } : {}),
        status: { in: ['CONFIRMED', 'COMPLETED', 'RESCHEDULED'] },
        ...(v.appointmentIds?.length ? { id: { in: v.appointmentIds } } : {}),
      },
      select: {
        id: true,
        userId: true,
        appointmentDate: true,
        service: { select: { name: true, basePrice: true } },
        payment: { select: { id: true, amount: true, status: true, surplus: true } },
      },
      orderBy: { appointmentDate: 'asc' },
    });

    // Filter to only unpaid (no payment or PENDING)
    const unpaid = pendingAppts.filter(a =>
      !a.payment || a.payment.status === 'PENDING'
    );

    if (unpaid.length === 0) throw new ValidationError('لا توجد فواتير معلقة لهذا المريض');

    // Calculate what we need to cover in cost currency
    // paidAmount is in `currency`, need to convert to ILS (or keep same if ILS)
    let remainingInCostCurrency = Math.round(v.paidAmount * v.exchangeRate * 100) / 100;
    const settled: string[] = [];

    // allocatedInCost: how much of THIS invoice was covered (in ILS/cost currency)
    // Returns paymentId so caller can store leftover surplus after the loop
    const upsertPayment = async (
      tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
      appt: (typeof unpaid)[number],
      invoiceAmount: number,
      surplus: number,
      label: string,
      status: 'COMPLETED' | 'PENDING',
      allocatedInCost: number,
    ): Promise<string> => {
      const commonData = {
        status,
        amount:       invoiceAmount,
        paidAmount:   allocatedInCost,
        paidCurrency: 'ILS' as Currency,
        exchangeRate: 1,
        surplus,
      };

      let paymentId: string;
      if (appt.payment) {
        await tx.payment.update({ where: { id: appt.payment.id }, data: { ...commonData, method: v.method as PaymentMethod } });
        paymentId = appt.payment.id;
      } else {
        const basePrice: number = appt.service.basePrice ?? 0;
        const created = await tx.payment.create({
          data: {
            appointmentId:  appt.id,
            userId:         appt.userId,
            originalAmount: basePrice,
            currency:       'ILS' as Currency,
            method:         v.method as PaymentMethod,
            description:    label,
            transactionId:  `SETTLE-${decoded.userId}-${Date.now()}`,
            transactionTime: new Date(),
            ...commonData,
          },
          select: { id: true },
        });
        paymentId = created.id;
      }

      // Record individual payment event
      const alreadyPaidOnInvoice = (appt.payment?.surplus && appt.payment.surplus < -0.005)
        ? Math.max(0, Math.round((invoiceAmount + appt.payment.surplus) * 100) / 100)
        : 0;
      const thisEventAmount = Math.round((allocatedInCost - alreadyPaidOnInvoice) * 100) / 100;
      if (thisEventAmount > 0.005) {
        await tx.paymentTransaction.create({
          data: {
            paymentId,
            paidAmount:   Math.round(thisEventAmount / v.exchangeRate * 100) / 100,
            paidCurrency: v.currency as Currency,
            exchangeRate: v.exchangeRate,
            amountInCost: thisEventAmount,
            method:       v.method as PaymentMethod,
            paidAt:       new Date(),
          },
        });
      }

      return paymentId;
    };

    await prisma.$transaction(async (tx) => {
      let lastSettledPaymentId: string | null = null;

      for (const appt of unpaid) {
        if (remainingInCostCurrency <= 0) break;

        const fullCost: number    = appt.payment?.amount ?? appt.service.basePrice ?? 0;
        // alreadyPaid derived from surplus: surplus < 0 → deficit → alreadyPaid = fullCost + surplus
        const alreadyPaid: number = (appt.payment?.surplus && appt.payment.surplus < -0.005)
          ? Math.max(0, Math.round((fullCost + appt.payment.surplus) * 100) / 100)
          : 0;
        const stillOwed: number   = Math.max(0, Math.round((fullCost - alreadyPaid) * 100) / 100);

        if (stillOwed <= 0) continue; // already fully paid

        if (remainingInCostCurrency >= stillOwed) {
          // Cover remaining balance → mark COMPLETED
          remainingInCostCurrency = Math.round((remainingInCostCurrency - stillOwed) * 100) / 100;
          lastSettledPaymentId = await upsertPayment(tx, appt, fullCost, 0, appt.service.name, 'COMPLETED', fullCost);
          settled.push(appt.id);
        } else {
          // Partial — keep PENDING, store cumulative allocated amount
          const totalAllocated = Math.round((alreadyPaid + remainingInCostCurrency) * 100) / 100;
          const deficit        = Math.round((totalAllocated - fullCost) * 100) / 100; // negative
          lastSettledPaymentId = await upsertPayment(tx, appt, fullCost, deficit, `${appt.service.name} (جزئي)`, 'PENDING', totalAllocated);
          settled.push(appt.id);
          remainingInCostCurrency = 0;
        }
      }

      // Store leftover as positive surplus on the last settled payment
      // so the existing payout route can find and refund it
      if (remainingInCostCurrency > 0.005 && lastSettledPaymentId) {
        await tx.payment.update({
          where: { id: lastSettledPaymentId },
          data:  { surplus: Math.round(remainingInCostCurrency * 100) / 100 },
        });
      }
    });

    return NextResponse.json({
      success: true,
      data: { settled, remainingSurplus: Math.max(0, remainingInCostCurrency) },
      message: `تم تسوية ${settled.length} فاتورة`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0]?.message ?? 'بيانات غير صحيحة' }, { status: 400 });
    }
    return handleApiError(error);
  }
}
