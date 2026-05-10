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
            user: { select: { id: true, name: true, phoneNumber: true } },
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
            paidAmount: true,
            paidCurrency: true,
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
      pendingInvoices: {
        appointmentId: string;
        serviceName: string;
        amount: number;
        currency: string;
        date: string;
        time: string;
        branchName: string;
        paymentId: string | null;
        paymentStatus: string | null;
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
          currency:      'ILS',
          date:          appt.appointmentDate.toISOString().split('T')[0],
          time:          appt.appointmentTime,
          branchName:    appt.branch.name,
          paymentId:     null,
          paymentStatus: null,
        });
        continue;
      }

      // Cash payment pending → staff hasn't confirmed receipt yet
      if (pay.status === 'PENDING') {
        entry.totalDebt += pay.amount;
        entry.pendingInvoices.push({
          appointmentId: appt.id,
          serviceName:   appt.service.name,
          amount:        pay.amount,
          currency:      String(pay.currency),
          date:          appt.appointmentDate.toISOString().split('T')[0],
          time:          appt.appointmentTime,
          branchName:    appt.branch.name,
          paymentId:     pay.id,
          paymentStatus: pay.status,
        });
        continue;
      }

      // Completed payment with surplus
      if (pay.status === 'COMPLETED' && pay.surplus && pay.surplus > 0) {
        entry.totalSurplus += pay.surplus;
      }
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
