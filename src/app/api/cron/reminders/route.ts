import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPatientNotification } from '@/lib/notifications';

export async function GET(request: NextRequest) {
  // حماية الـ endpoint — Vercel يرسل هذا الـ header تلقائياً
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ success: false, message: 'غير مصرح' }, { status: 401 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  // جيب كل مواعيد اليوم التي لم يُرسَل لها تذكير بعد
  const appointments = await prisma.appointment.findMany({
    where: {
      appointmentDate: { gte: todayStart, lte: todayEnd },
      status: { in: ['CONFIRMED', 'RESCHEDULED', 'PENDING'] },
      reminderSentAt: null,
    },
    select: {
      id: true,
      appointmentTime: true,
      patient: { select: { userId: true } },
      clinic:  { select: { name: true } },
      branch:  { select: { name: true } },
      doctor:  { select: { user: { select: { name: true } } } },
    },
  });

  let sent = 0;

  for (const apt of appointments) {
    const patientUserId = apt.patient?.userId;
    if (!patientUserId) continue;

    await createPatientNotification(patientUserId, {
      type: 'APPOINTMENT_REMINDER',
      title: 'تذكير بموعدك اليوم',
      message: `لديك موعد اليوم الساعة ${apt.appointmentTime} في ${apt.clinic?.name ?? 'العيادة'}${apt.branch?.name ? ` — ${apt.branch.name}` : ''}. لا تنسَ!`,
      link: '/patient/bookings',
    });

    await prisma.appointment.update({
      where: { id: apt.id },
      data: { reminderSentAt: new Date() },
    });

    sent++;
  }

  return NextResponse.json({
    success: true,
    message: `تم إرسال ${sent} تذكير`,
    sent,
  });
}
