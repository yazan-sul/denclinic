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
        payment: { select: { id: true, amount: true, status: true } },
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

    await prisma.$transaction(async (tx) => {
      for (const appt of unpaid) {
        if (remainingInCostCurrency <= 0) break;

        const costAmount = appt.payment?.amount ?? appt.service.basePrice;

        if (remainingInCostCurrency >= costAmount) {
          // Full payment for this invoice
          if (appt.payment) {
            await tx.payment.update({
              where: { id: appt.payment.id },
              data: {
                status: 'COMPLETED',
                paidAmount: v.paidAmount,
                paidCurrency: v.currency as Currency,
                exchangeRate: v.exchangeRate,
                surplus: Math.round((remainingInCostCurrency - costAmount) * 100) / 100,
              },
            });
          } else {
            await tx.payment.create({
              data: {
                appointmentId: appt.id,
                userId: appt.userId,
                amount: costAmount,
                originalAmount: costAmount,
                currency: v.currency as Currency,
                paidAmount: v.paidAmount,
                paidCurrency: v.currency as Currency,
                exchangeRate: v.exchangeRate,
                surplus: 0,
                method: v.method as PaymentMethod,
                status: 'COMPLETED',
                description: appt.service.name,
                transactionId: `SETTLE-${decoded.userId}-${Date.now()}`,
                transactionTime: new Date(),
              },
            });
          }
          remainingInCostCurrency = Math.round((remainingInCostCurrency - costAmount) * 100) / 100;
          settled.push(appt.id);
        } else {
          // Partial payment — record what's paid and leave the rest as debt
          if (appt.payment) {
            await tx.payment.update({
              where: { id: appt.payment.id },
              data: {
                amount: remainingInCostCurrency,
                paidAmount: v.paidAmount,
                paidCurrency: v.currency as Currency,
                exchangeRate: v.exchangeRate,
                surplus: 0,
                status: 'COMPLETED',
              },
            });
          } else {
            await tx.payment.create({
              data: {
                appointmentId: appt.id,
                userId: appt.userId,
                amount: remainingInCostCurrency,
                originalAmount: costAmount,
                currency: v.currency as Currency,
                paidAmount: v.paidAmount,
                paidCurrency: v.currency as Currency,
                exchangeRate: v.exchangeRate,
                surplus: 0,
                method: v.method as PaymentMethod,
                status: 'COMPLETED',
                description: `${appt.service.name} (جزئي)`,
                transactionId: `SETTLE-${decoded.userId}-${Date.now()}`,
                transactionTime: new Date(),
              },
            });
          }
          settled.push(appt.id);
          remainingInCostCurrency = 0;
        }
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
