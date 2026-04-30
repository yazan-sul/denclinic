import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env') });

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import pg from 'pg';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

const LAB_NAMES   = ['مختبر الأمل للأسنان', 'مختبر النخبة', 'مختبر الشفاء', 'مختبر الوفاء'];
const CASE_TYPES  = ['تاج', 'جسر', 'طقم كامل', 'تلبيس', 'تقويم', 'زرعة'];
const DIAGNOSES   = ['تسوس متقدم', 'كسر في السن', 'التهاب عصب', 'فقدان سن', 'اعوجاج أسنان'];

const STATUSES = [
  'PENDING', 'SENT', 'IN_PROGRESS', 'READY', 'DELIVERED',
] as const;

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

async function main() {
  // Fetch existing completed/confirmed appointments without treatments
  const appointments = await prisma.appointment.findMany({
    where: {
      status: { in: ['COMPLETED', 'CONFIRMED'] },
      treatments: { none: {} },
    },
    include: {
      patient: { select: { user: { select: { name: true } } } },
    },
    take: 12,
    orderBy: { appointmentDate: 'desc' },
  });

  if (appointments.length === 0) {
    console.log('❌ لا توجد مواعيد مناسبة. سيتم استخدام أي مواعيد موجودة...');
    const allApts = await prisma.appointment.findMany({
      take: 8,
      orderBy: { appointmentDate: 'desc' },
    });
    if (allApts.length === 0) {
      console.log('❌ لا توجد مواعيد في قاعدة البيانات.');
      return;
    }
    appointments.push(...(allApts as any));
  }

  console.log(`✅ وُجد ${appointments.length} موعد — جاري إضافة البيانات التجريبية...`);

  let treatmentCount = 0;
  let labCaseCount   = 0;

  for (const apt of appointments) {
    // Create 1-2 treatments per appointment
    const numTreatments = Math.floor(Math.random() * 2) + 1;

    for (let t = 0; t < numTreatments; t++) {
      const treatment = await prisma.treatment.create({
        data: {
          appointmentId: apt.id,
          status:        pick(['PLANNED', 'ONGOING', 'COMPLETED'] as const),
          diagnosis:     pick(DIAGNOSES),
          notesPublic:   'تم الفحص والتشخيص بشكل كامل',
          notesInternal: 'ملاحظات داخلية للطاقم الطبي',
          cost:          Math.floor(Math.random() * 300 + 100),
        },
      });
      treatmentCount++;

      // Create 1-3 lab cases per treatment
      const numCases = Math.floor(Math.random() * 3) + 1;

      for (let c = 0; c < numCases; c++) {
        const statusIdx    = Math.floor(Math.random() * STATUSES.length);
        const status       = STATUSES[statusIdx];
        const sentDate     = statusIdx >= 1 ? addDays(new Date(apt.appointmentDate), 1) : null;
        const deliveryDate = addDays(new Date(apt.appointmentDate), 7 + c * 3);

        await prisma.labCase.create({
          data: {
            treatmentId:   treatment.id,
            labName:       pick(LAB_NAMES),
            caseType:      pick(CASE_TYPES),
            status,
            cost:          Math.floor(Math.random() * 500 + 150),
            sentDate,
            deliveryDate,
            notesPublic:   status === 'READY' ? 'الحالة جاهزة للاستلام' : null,
            notesInternal: 'تم الإرسال بتاريخ المحدد',
          },
        });
        labCaseCount++;
      }
    }

    console.log(`  ✓ ${(apt as any).patient?.user?.name ?? apt.id} — ${numTreatments} تريتمنت`);
  }

  console.log(`\n🎉 تم بنجاح:`);
  console.log(`   - ${treatmentCount} سجل علاج`);
  console.log(`   - ${labCaseCount} حالة مختبر`);

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });