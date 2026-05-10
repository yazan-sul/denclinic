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

    // Fetch all transactions for this patient in this clinic
    const transactions = await prisma.paymentTransaction.findMany({
      where: {
        payment: {
          appointment: { clinicId: v.clinicId, patientId: v.patientId },
        },
      },
      orderBy: { paidAt: 'asc' },
      select: {
        paidAmount:  true,
        paidCurrency: true,
        exchangeRate: true,
        amountInCost: true,
        method:      true,
        notes:       true,
        paidAt:      true,
        payment: {
          select: {
            amount:   true,
            currency: true,
            surplus:  true,
            appointment: {
              select: {
                service: { select: { name: true } },
                branch:  { select: { name: true } },
              },
            },
          },
        },
      },
    });

    // Calculate totals per currency
    const totalsMap = new Map<string, number>();
    for (const t of transactions) {
      const prev = totalsMap.get(t.paidCurrency) ?? 0;
      totalsMap.set(t.paidCurrency, Math.round((prev + t.paidAmount) * 100) / 100);
    }

    // Calculate remaining debt (sum of negative surplus across pending invoices)
    const pendingPayments = await prisma.payment.findMany({
      where: {
        appointment: { clinicId: v.clinicId, patientId: v.patientId },
        status: 'PENDING',
        surplus: { lt: -0.005 },
      },
      select: { surplus: true, currency: true },
    });

    const remainingDebt = pendingPayments.reduce(
      (sum, p) => Math.round((sum + Math.max(0, -(p.surplus ?? 0))) * 100) / 100,
      0,
    );
    const invoiceCurrency = pendingPayments[0]?.currency ?? 'ILS';

    const branchName = patient.appointments[0]?.branch?.name ?? null;
    const generatedAt = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });

    await sendTransactionsReportEmail({
      clinicName:   clinic.name,
      branchName:   branchName ?? '',
      patientName:  patient.user.name,
      patientEmail: patient.user.email,
      generatedAt,
      transactions: transactions.map(t => ({
        paidAt:      t.paidAt.toISOString(),
        paidAmount:  t.paidAmount,
        paidCurrency: String(t.paidCurrency),
        exchangeRate: t.exchangeRate,
        amountInCost: t.amountInCost,
        method:      String(t.method),
        notes:       t.notes,
        serviceName: t.payment.appointment?.service.name ?? '—',
        branchName:  t.payment.appointment?.branch?.name ?? null,
      })),
      totalByCurrency: Array.from(totalsMap.entries()).map(([currency, total]) => ({ currency, total })),
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
