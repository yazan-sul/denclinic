import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';
import { Currency, PaymentMethod, UserRole } from '@prisma/client';
import { z } from 'zod';
import { createPatientNotification } from '@/lib/notifications';

const settleSchema = z.object({
  patientId:      z.number().int().positive(),
  clinicId:       z.number().int().positive(),
  branchId:       z.number().int().positive().optional(),
  method:         z.enum(['CASH', 'CARD', 'BANK_TRANSFER'] as const),
  currency:       z.enum(['ILS', 'USD', 'JOD', 'EUR'] as const).default('ILS'),
  paidAmount:     z.number().positive('المبلغ المدفوع يجب أن يكون أكبر من صفر'),
  exchangeRate:   z.number().positive().default(1),
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
    if (!roles.some(r => ['STAFF', 'ADMIN', 'CLINIC_OWNER'].includes(r))) {
      throw new ForbiddenError('يجب أن تكون من طاقم العمل');
    }

    const body = await request.json();
    const v = settleSchema.parse(body);

    // Fetch patient userId (needed for surplus lookup)
    const patient = await prisma.patient.findUnique({
      where: { id: v.patientId },
      select: { userId: true },
    });
    if (!patient) throw new ValidationError('المريض غير موجود');

    // Fetch pending invoices
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

    const unpaid = pendingAppts.filter(a => !a.payment || a.payment.status === 'PENDING');
    if (unpaid.length === 0) throw new ValidationError('لا توجد فواتير معلقة لهذا المريض');

    // Fetch existing surplus from completed payments for this patient/clinic
    const existingSurplusPayments = await prisma.payment.findMany({
      where: {
        status: 'COMPLETED',
        surplus: { gt: 0.005 },
        appointment: { patientId: v.patientId, clinicId: v.clinicId },
      },
      select: { id: true, surplus: true, method: true },
      orderBy: { transactionTime: 'asc' },
    });
    const existingSurplusTotal = Math.round(
      existingSurplusPayments.reduce((s, p) => s + (p.surplus ?? 0), 0) * 100
    ) / 100;

    // Total available = new payment + existing surplus
    const newMoneyInCost = Math.round(v.paidAmount * v.exchangeRate * 100) / 100;
    let remainingInCostCurrency = Math.round((newMoneyInCost + existingSurplusTotal) * 100) / 100;
    const settled: string[] = [];

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
        const created = await tx.payment.create({
          data: {
            appointmentId:   appt.id,
            userId:          appt.userId,
            originalAmount:  appt.service.basePrice ?? 0,
            currency:        'ILS' as Currency,
            method:          v.method as PaymentMethod,
            description:     label,
            transactionId:   `SETTLE-${decoded.userId}-${Date.now()}`,
            transactionTime: new Date(),
            ...commonData,
          },
          select: { id: true },
        });
        paymentId = created.id;
      }

      // Record this payment event (only the new money portion, not reused surplus)
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
        const alreadyPaid: number = (appt.payment?.surplus && appt.payment.surplus < -0.005)
          ? Math.max(0, Math.round((fullCost + appt.payment.surplus) * 100) / 100)
          : 0;
        const stillOwed: number   = Math.max(0, Math.round((fullCost - alreadyPaid) * 100) / 100);

        if (stillOwed <= 0) continue;

        if (remainingInCostCurrency >= stillOwed) {
          remainingInCostCurrency = Math.round((remainingInCostCurrency - stillOwed) * 100) / 100;
          lastSettledPaymentId = await upsertPayment(tx, appt, fullCost, 0, appt.service.name, 'COMPLETED', fullCost);
          settled.push(appt.id);
        } else {
          const totalAllocated = Math.round((alreadyPaid + remainingInCostCurrency) * 100) / 100;
          const deficit        = Math.round((totalAllocated - fullCost) * 100) / 100;
          lastSettledPaymentId = await upsertPayment(tx, appt, fullCost, deficit, `${appt.service.name} (جزئي)`, 'PENDING', totalAllocated);
          settled.push(appt.id);
          remainingInCostCurrency = 0;
        }
      }

      // Calculate how much existing surplus was consumed
      const afterLoop = Math.max(0, remainingInCostCurrency);
      const totalConsumed = Math.round((newMoneyInCost + existingSurplusTotal - afterLoop) * 100) / 100;
      const existingSurplusUsed = Math.min(
        existingSurplusTotal,
        Math.max(0, Math.round((totalConsumed - newMoneyInCost) * 100) / 100),
      );

      // Deduct used surplus from existing surplus payments + record as negative transactions
      if (existingSurplusUsed > 0.005) {
        let toDeduct = existingSurplusUsed;
        for (const sp of existingSurplusPayments) {
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
      }

      // Store net new surplus on last payment only if it exceeds what's already in existing payments
      const existingSurplusRemaining = Math.round((existingSurplusTotal - existingSurplusUsed) * 100) / 100;
      const newSurplusToStore = Math.max(0, Math.round((afterLoop - existingSurplusRemaining) * 100) / 100);
      if (newSurplusToStore > 0.005 && lastSettledPaymentId) {
        await tx.payment.update({
          where: { id: lastSettledPaymentId },
          data:  { surplus: newSurplusToStore },
        });
      }
    });

    if (settled.length > 0 && patient?.userId) {
      await createPatientNotification(patient.userId, {
        type: 'APPOINTMENT_UPDATED',
        title: 'تمت تسوية فواتيرك',
        message: `تم تسوية ${settled.length} فاتورة بمبلغ ${v.paidAmount.toFixed(2)} ${v.currency}.`,
        link: '/patient/bookings',
      });
    }

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
