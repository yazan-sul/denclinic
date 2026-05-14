import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { sendTransactionsReportEmail } from '@/lib/email';

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

    // Fetch clinic + patient info in parallel
    const [clinic, patient] = await Promise.all([
      prisma.clinic.findUnique({
        where: { id: v.clinicId },
        select: { name: true },
      }),
      prisma.patient.findUnique({
        where: { id: v.patientId },
        select: {
          user: { select: { name: true, email: true } },
          appointments: {
            where: { clinicId: v.clinicId },
            select: { branch: { select: { name: true } } },
            take: 1,
          },
        },
      }),
    ]);

    if (!clinic) throw new ValidationError('العيادة غير موجودة');
    if (!patient) throw new ValidationError('المريض غير موجود');
    if (!patient.user.email) throw new ValidationError('المريض ليس لديه بريد إلكتروني مسجّل');

    // Fetch invoices and transactions in parallel
    const [invoices, transactions] = await Promise.all([
      prisma.payment.findMany({
        where: { appointment: { clinicId: v.clinicId, patientId: v.patientId } },
        orderBy: { transactionTime: 'asc' },
        select: {
          amount:         true,
          originalAmount: true,
          currency:       true,
          status:         true,
          surplus:        true,
          discountType:   true,
          discountValue:  true,
          appointment: {
            select: {
              appointmentDate: true,
              service: { select: { name: true } },
            },
          },
        },
      }),
      prisma.paymentTransaction.findMany({
        where: {
          payment: { appointment: { clinicId: v.clinicId, patientId: v.patientId } },
        },
        orderBy: { paidAt: 'asc' },
        select: {
          paidAmount:   true,
          paidCurrency: true,
          exchangeRate: true,
          amountInCost: true,
          method:       true,
          notes:        true,
          paidAt:       true,
          payment: {
            select: {
              currency: true,
              appointment: { select: { service: { select: { name: true } } } },
            },
          },
        },
      }),
    ]);

    // Calculate totals per currency — separate refunds (amountInCost < 0) from payments
    const totalsMap   = new Map<string, number>();
    const refundsMap  = new Map<string, number>();
    for (const t of transactions) {
      if (t.amountInCost < 0) {
        const prev = refundsMap.get(String(t.paidCurrency)) ?? 0;
        refundsMap.set(String(t.paidCurrency), Math.round((prev + t.paidAmount) * 100) / 100);
      } else {
        const prev = totalsMap.get(String(t.paidCurrency)) ?? 0;
        totalsMap.set(String(t.paidCurrency), Math.round((prev + t.paidAmount) * 100) / 100);
      }
    }

    // Remaining debt from pending invoices with deficit
    const pendingWithDebt = invoices.filter(p => p.status === 'PENDING' && (p.surplus ?? 0) < -0.005);
    const remainingDebt = pendingWithDebt.reduce(
      (sum, p) => Math.round((sum + Math.max(0, -(p.surplus ?? 0))) * 100) / 100,
      0,
    );
    const invoiceCurrency = String(invoices[0]?.currency ?? 'ILS');

    const branchName = patient.appointments[0]?.branch?.name ?? null;
    const generatedAt = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

    await sendTransactionsReportEmail({
      clinicName:   clinic.name,
      branchName:   branchName ?? '',
      patientName:  patient.user.name,
      patientEmail: patient.user.email,
      generatedAt,
      invoices: invoices.map(inv => ({
        serviceName:    inv.appointment?.service.name ?? '—',
        appointmentDate: inv.appointment?.appointmentDate?.toISOString() ?? '',
        amount:         inv.amount,
        currency:       String(inv.currency),
        status:         String(inv.status),
        surplus:        inv.surplus,
        discountType:   inv.discountType,
        discountValue:  inv.discountValue,
        originalAmount: inv.originalAmount,
      })),
      transactions: transactions.map(t => ({
        paidAt:       t.paidAt.toISOString(),
        paidAmount:   t.paidAmount,
        paidCurrency: String(t.paidCurrency),
        exchangeRate: t.exchangeRate,
        amountInCost: t.amountInCost,
        method:       String(t.method),
        notes:        t.notes,
        serviceName:  t.payment.appointment?.service.name ?? '—',
      })),
      totalByCurrency: Array.from(totalsMap.entries()).map(([currency, total]) => ({ currency, total })),
      totalRefunded:   Array.from(refundsMap.entries()).map(([currency, total]) => ({ currency, total })),
      remainingDebt,
      invoiceCurrency: String(invoiceCurrency),
    });

    return NextResponse.json({ success: true, message: `تم إرسال التقرير إلى ${patient.user.email}` });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ success: false, message: error.issues[0]?.message }, { status: 400 });
    }
    return handleApiError(error);
  }
}
