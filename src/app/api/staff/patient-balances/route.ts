import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';
import { UserRole } from '@prisma/client';

const INVALID_PAYMENT_STATUSES = new Set(['CANCELLED', 'REFUNDED', 'FAILED']);

function parsePositiveInt(v: string | null, fallback: number) {
  if (!v) return fallback;
  const n = Number.parseInt(v, 10);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const requestedClinicId = parsePositiveInt(searchParams.get('clinicId'), 0);
    const requestedBranchId = parsePositiveInt(searchParams.get('branchId'), 0) || null;
    const search = searchParams.get('search')?.trim() || '';

    let clinicId: number;
    if (user.staffProfiles.length > 0) {
      const p = requestedClinicId
        ? user.staffProfiles.find(s => s.clinicId === requestedClinicId) ?? user.staffProfiles[0]
        : user.staffProfiles[0];
      clinicId = p.clinicId;
    } else if (roles.includes('ADMIN') || roles.includes('CLINIC_OWNER')) {
      if (!requestedClinicId) throw new ValidationError('clinicId مطلوب');
      clinicId = requestedClinicId;
    } else {
      throw new ForbiddenError('لا يوجد ملف طاقم عمل');
    }

    // Fetch appointments that are CONFIRMED/COMPLETED with their payments
    const appointments = await prisma.appointment.findMany({
      where: {
        clinicId,
        ...(requestedBranchId ? { branchId: requestedBranchId } : {}),
        status: { in: ['CONFIRMED', 'COMPLETED', 'RESCHEDULED'] },
        ...(search ? {
          patient: { user: { OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phoneNumber: { contains: search } },
          ]}}
        } : {}),
      },
      take: 500,
      select: {
        id: true,
        appointmentDate: true,
        appointmentTime: true,
        patientId: true,
        patient: {
          select: {
            id: true,
            user: { select: { id: true, name: true, phoneNumber: true, email: true } },
          },
        },
        service: { select: { name: true, basePrice: true } },
        branch:  { select: { name: true } },
        payment: {
          select: {
            id: true,
            amount: true,
            originalAmount: true,
            currency: true,
            discountType: true,
            discountValue: true,
            description: true,
            paidAmount: true,
            paidCurrency: true,
            exchangeRate: true,
            surplus: true,
            status: true,
            method: true,
            transactionTime: true,
          },
        },
      },
      orderBy: { appointmentDate: 'asc' },
    });

    // Group by patient and calculate balances
    const patientMap = new Map<number, {
      patientId: number;
      patientName: string;
      patientPhone: string;
      patientEmail: string | null;
      pendingInvoices: {
        appointmentId: string;
        serviceName: string;
        amount: number;
        originalAmount: number | null;
        currency: string;
        discountType: string | null;
        discountValue: number | null;
        description: string | null;
        paidAmount: number | null;
        paidCurrency: string | null;
        exchangeRate: number | null;
        surplus: number | null;
        date: string;
        time: string;
        branchName: string;
        paymentId: string | null;
        paymentStatus: string | null;
        method: string | null;
      }[];
      totalDebt: number;
      totalSurplus: number;
    }>();

    for (const appt of appointments) {
      const pid = appt.patientId;
      if (!patientMap.has(pid)) {
        patientMap.set(pid, {
          patientId:    pid,
          patientName:  appt.patient.user.name,
          patientPhone: appt.patient.user.phoneNumber,
          patientEmail: appt.patient.user.email ?? null,
          pendingInvoices: [],
          totalDebt:    0,
          totalSurplus: 0,
        });
      }

      const entry = patientMap.get(pid)!;
      const pay   = appt.payment;

      if (pay && INVALID_PAYMENT_STATUSES.has(pay.status)) {
        continue;
      }

      // No payment recorded → full service cost is debt
      if (!pay) {
        const cost: number = appt.service.basePrice ?? 0;
        entry.totalDebt += cost;
        entry.pendingInvoices.push({
          appointmentId: appt.id,
          serviceName:   appt.service.name,
          amount:        cost,
          originalAmount: null,
          currency:      'ILS',
          discountType:  null,
          discountValue: null,
          description:   null,
          paidAmount:    null,
          paidCurrency:  null,
          exchangeRate:  null,
          surplus:       null,
          date:          appt.appointmentDate.toISOString().split('T')[0],
          time:          appt.appointmentTime,
          branchName:    appt.branch.name,
          paymentId:     null,
          paymentStatus: null,
          method:        null,
        });
        continue;
      }

      // Cash payment pending → staff hasn't confirmed receipt yet
      if (pay.status === 'PENDING') {
        // surplus < 0 means partial payment made: remaining = -surplus
        // surplus === null or >= 0 means no partial payment: remaining = full amount
        const remaining = (pay.surplus !== null && pay.surplus < -0.005)
          ? Math.max(0, Math.round(-pay.surplus * 100) / 100)
          : pay.amount;
        entry.totalDebt += remaining;
        entry.pendingInvoices.push({
          appointmentId: appt.id,
          serviceName:   appt.service.name,
          amount:        pay.amount,
          originalAmount: pay.originalAmount,
          currency:      String(pay.currency),
          discountType:  pay.discountType,
          discountValue: pay.discountValue,
          description:   pay.description,
          paidAmount:    pay.paidAmount,
          paidCurrency:  pay.paidCurrency ? String(pay.paidCurrency) : null,
          exchangeRate:  pay.exchangeRate,
          surplus:       pay.surplus,
          date:          appt.appointmentDate.toISOString().split('T')[0],
          time:          appt.appointmentTime,
          branchName:    appt.branch.name,
          paymentId:     pay.id,
          paymentStatus: pay.status,
          method:        String(pay.method),
        });
        continue;
      }

      // Completed payment with surplus
      if (pay.status === 'COMPLETED' && pay.surplus && pay.surplus > 0) {
        entry.totalSurplus += pay.surplus;
      }
    }

    // Fetch pending lab order payments via raw SQL (Prisma v7 WASM doesn't support labOrder relation)
    type LabPayRow = {
      pay_id: string; amount: number; paid_amount: number | null; surplus: number | null;
      description: string | null; status: string; method: string;
      lo_id: string; received_date: Date | null; lab_name: string;
      patient_id: number; patient_name: string; patient_phone: string; patient_email: string | null;
    };

    const branchFilter = requestedBranchId ? `AND lo."branchId" = ${requestedBranchId}` : '';
    const labPayments = await prisma.$queryRawUnsafe<LabPayRow[]>(`
      SELECT p.id AS pay_id, p.amount, p."paidAmount" AS paid_amount, p.surplus,
             p.description, p.status, p.method,
             lo.id AS lo_id, lo."receivedDate" AS received_date,
             l.name AS lab_name,
             pt.id AS patient_id, u.name AS patient_name,
             u."phoneNumber" AS patient_phone, u.email AS patient_email
      FROM "Payment" p
      JOIN "LabOrder" lo ON lo.id = p."labOrderId"
      JOIN "Lab" l ON l.id = lo."labId"
      JOIN "Patient" pt ON pt.id = lo."patientId"
      JOIN "User" u ON u.id = pt."userId"
      WHERE p.status = 'PENDING'
        AND lo."clinicId" = $1
        ${branchFilter}
    `, clinicId);

    for (const pay of labPayments) {
      const pid = Number(pay.patient_id);
      if (!patientMap.has(pid)) {
        patientMap.set(pid, {
          patientId:    pid,
          patientName:  pay.patient_name,
          patientPhone: pay.patient_phone,
          patientEmail: pay.patient_email,
          pendingInvoices: [],
          totalDebt:    0,
          totalSurplus: 0,
        });
      }
      const entry = patientMap.get(pid)!;
      const amt = Number(pay.amount);
      const surplus = pay.surplus !== null ? Number(pay.surplus) : null;
      const remaining = (surplus !== null && surplus < -0.005)
        ? Math.max(0, Math.round(-surplus * 100) / 100)
        : amt;
      entry.totalDebt += remaining;
      entry.pendingInvoices.push({
        appointmentId: `lab:${pay.lo_id}`,
        serviceName:   `مختبر: ${pay.lab_name}`,
        amount:        amt,
        originalAmount: null,
        currency:      'ILS',
        discountType:  null,
        discountValue: null,
        description:   pay.description,
        paidAmount:    pay.paid_amount !== null ? Number(pay.paid_amount) : null,
        paidCurrency:  null,
        exchangeRate:  null,
        surplus,
        date:          pay.received_date ? new Date(pay.received_date).toISOString().split('T')[0] : '',
        time:          '',
        branchName:    '',
        paymentId:     pay.pay_id,
        paymentStatus: pay.status,
        method:        pay.method ?? null,
      });
    }

    // Build result — skip patients with no debt/surplus (all settled)
    const result = Array.from(patientMap.values()).map(p => ({
      ...p,
      status: p.totalDebt > 0 ? 'DEBT' : p.totalSurplus > 0 ? 'SURPLUS' : 'CLEAR',
    })).sort((a, b) => b.totalDebt - a.totalDebt);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return handleApiError(error);
  }
}
