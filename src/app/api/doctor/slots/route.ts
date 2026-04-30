import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/auth';
import { handleApiError, UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors';
import { UserRole } from '@prisma/client';

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`;
}

function generateSlotTimes(
  periodStart: string,
  periodEnd: string,
  durationMins: number
): { startTime: string; endTime: string }[] {
  const slots: { startTime: string; endTime: string }[] = [];
  let current = periodStart;
  while (true) {
    const next = addMinutes(current, durationMins);
    if (next > periodEnd) break;
    slots.push({ startTime: current, endTime: next });
    current = next;
  }
  return slots;
}

function getDatesBetween(from: string, to: string, weekdays: number[] | null): string[] {
  const dates: string[] = [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const cursor = new Date(start);
  while (cursor <= end) {
    const dateStr = cursor.toISOString().split('T')[0];
    const day = cursor.getUTCDay();
    if (!weekdays || weekdays.includes(day)) {
      dates.push(dateStr);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

// GET /api/doctor/slots — list slots for current doctor
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const doctor = await prisma.doctor.findUnique({ where: { userId: decoded.userId } });
    if (!doctor) throw new ForbiddenError('الطبيب غير موجود');

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const where: any = { doctorId: doctor.id };
    if (from || to) {
      where.slotDate = {};
      if (from) where.slotDate.gte = new Date(`${from}T00:00:00Z`);
      if (to) {
        const toDate = new Date(`${to}T00:00:00Z`);
        toDate.setUTCHours(23, 59, 59, 999);
        where.slotDate.lte = toDate;
      }
    }

    const slots = await prisma.slot.findMany({
      where,
      include: {
        branch: { select: { id: true, name: true, clinic: { select: { id: true, name: true } } } },
        appointment: { select: { id: true, status: true } },
      },
      orderBy: [{ slotDate: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json({ success: true, data: slots });
  } catch (error) {
    return handleApiError(error);
  }
}

// POST /api/doctor/slots — create slots
export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const user = await prisma.user.findUnique({ where: { id: decoded.userId }, select: { roles: true } });
    if (!user || !(user.roles as UserRole[]).includes('DOCTOR')) {
      throw new ForbiddenError('لا تملك صلاحية إضافة مواعيد');
    }

    const doctor = await prisma.doctor.findUnique({
      where: { userId: decoded.userId },
      select: { id: true, clinicId: true },
    });
    if (!doctor) throw new ForbiddenError('الطبيب غير موجود');

    const body = await request.json();
    const {
      branchId,
      mode,       // 'single' | 'range' | 'weekly'
      startDate,  // required always
      endDate,    // required for range/weekly
      weekdays,   // number[] (0=Sun) for weekly mode
      periods,    // [{ startTime: 'HH:MM', endTime: 'HH:MM' }]
      appointmentDuration, // minutes per slot
    } = body;

    if (!branchId) throw new ValidationError('الفرع مطلوب');
    if (!startDate) throw new ValidationError('تاريخ البداية مطلوب');
    if (!periods?.length) throw new ValidationError('يجب تحديد فترة عمل واحدة على الأقل');
    if (!appointmentDuration || appointmentDuration < 5) throw new ValidationError('مدة الموعد يجب أن تكون 5 دقائق على الأقل');

    // Verify doctor owns this branch (security)
    const branch = await prisma.branch.findUnique({ where: { id: Number(branchId) } });
    if (!branch || branch.clinicId !== doctor.clinicId) throw new ForbiddenError('الفرع لا ينتمي لعيادتك');

    // Determine target dates
    let targetDates: string[];
    if (mode === 'single') {
      targetDates = [startDate];
    } else if (mode === 'range') {
      if (!endDate) throw new ValidationError('تاريخ النهاية مطلوب');
      targetDates = getDatesBetween(startDate, endDate, null);
    } else if (mode === 'weekly') {
      if (!endDate) throw new ValidationError('تاريخ النهاية مطلوب');
      if (!weekdays?.length) throw new ValidationError('اختر أيام الأسبوع');
      targetDates = getDatesBetween(startDate, endDate, weekdays);
    } else {
      throw new ValidationError('نوع الجدول غير صحيح');
    }

    if (targetDates.length === 0) throw new ValidationError('لا توجد أيام مطابقة');
    if (targetDates.length > 366) throw new ValidationError('النطاق الزمني كبير جداً (الحد الأقصى سنة)');

    // Generate all slot entries
    const slotsToCreate: { doctorId: number; branchId: number; slotDate: Date; startTime: string; endTime: string }[] = [];

    for (const dateStr of targetDates) {
      for (const period of periods) {
        const generated = generateSlotTimes(period.startTime, period.endTime, Number(appointmentDuration));
        for (const slot of generated) {
          slotsToCreate.push({
            doctorId: doctor.id,
            branchId: Number(branchId),
            slotDate: new Date(`${dateStr}T00:00:00Z`),
            startTime: slot.startTime,
            endTime: slot.endTime,
          });
        }
      }
    }

    if (slotsToCreate.length === 0) throw new ValidationError('لا يمكن توليد مواعيد من الفترات المحددة');

    // Before creating, count how many already exist for accurate conflict reporting
    const existing = await prisma.slot.findMany({
      where: {
        doctorId: doctor.id,
        OR: slotsToCreate.map(s => ({
          slotDate: s.slotDate,
          startTime: s.startTime,
        })),
      },
      select: { slotDate: true, startTime: true },
    });

    const existingKeys = new Set(
      existing.map(s => `${s.slotDate.toISOString().split('T')[0]}_${s.startTime}`)
    );
    const newSlots = slotsToCreate.filter(
      s => !existingKeys.has(`${s.slotDate.toISOString().split('T')[0]}_${s.startTime}`)
    );
    const conflictCount = slotsToCreate.length - newSlots.length;

    let created = 0;
    if (newSlots.length > 0) {
      const result = await prisma.slot.createMany({ data: newSlots, skipDuplicates: true });
      created = result.count;
    }

    return NextResponse.json({
      success: true,
      created,
      skipped: conflictCount,
      total: slotsToCreate.length,
      message: conflictCount > 0
        ? `تم إنشاء ${created} موعد جديد. تم تجاهل ${conflictCount} موعد موجود مسبقاً (تعارض).`
        : `تم إنشاء ${created} موعد بنجاح.`,
    }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE /api/doctor/slots — bulk cancel unbooked slots in a time range for a date
export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('authToken')?.value;
    if (!token) throw new UnauthorizedError('غير مصرح');

    const decoded = verifyToken(token);
    if (!decoded?.userId) throw new UnauthorizedError('رمز غير صالح');

    const doctor = await prisma.doctor.findUnique({ where: { userId: decoded.userId } });
    if (!doctor) throw new ForbiddenError('الطبيب غير موجود');

    const body = await request.json();
    const { date, fromTime, toTime } = body;

    if (!date) throw new ValidationError('التاريخ مطلوب');

    const slotDate = new Date(`${date}T00:00:00Z`);
    const slotDateEnd = new Date(slotDate);
    slotDateEnd.setUTCHours(23, 59, 59, 999);

    const where: any = {
      doctorId: doctor.id,
      slotDate: { gte: slotDate, lte: slotDateEnd },
      appointment: { is: null }, // only unbooked slots
    };

    if (fromTime) where.startTime = { gte: fromTime };
    if (toTime)   where.startTime = { ...where.startTime, lt: toTime };

    const result = await prisma.slot.deleteMany({ where });

    return NextResponse.json({
      success: true,
      deleted: result.count,
      message: `تم إلغاء ${result.count} موعد متاح.`,
    });
  } catch (error) {
    return handleApiError(error);
  }
}