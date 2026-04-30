/**
 * Adds rich test data to masalmahmouath@gmail.com account.
 * Run: npx tsx prisma/addData.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env') });

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole, AppointmentStatus } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PATIENT_PASSWORD = 'Password123!';

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function hashPw(pw: string) {
  return hash(pw, { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 });
}

async function main() {
  // ── Find Mouath's account ──────────────────────────────────────────────────
  const mouath = await prisma.user.findFirst({
    where: { email: 'masalmahmouath@gmail.com' },
    include: {
      doctorProfile: true,
      staffProfile: true,
      clinicsOwned: { include: { branches: true, services: true } },
      patient: true,
    },
  });
  if (!mouath?.doctorProfile || !mouath.clinicsOwned) {
    throw new Error('حساب معاذ ما بنشوفه — شغّل addUser.ts أول');
  }

  const clinic   = mouath.clinicsOwned;
  const branch   = clinic.branches[0];
  const doctor   = mouath.doctorProfile;
  const myPatient = mouath.patient!;

  console.log(`✓ Found: clinic=${clinic.id}, branch=${branch.id}, doctor=${doctor.id}`);

  // ── Clean old test data for this clinic (appointments, patients, services) ──
  console.log('🗑️  Clearing old test data for this clinic...');
  await prisma.appointment.deleteMany({ where: { clinicId: clinic.id } });
  await prisma.slot.deleteMany({ where: { branchId: branch.id } });
  await prisma.rating.deleteMany({ where: { clinicId: clinic.id } });

  // ── Services ──────────────────────────────────────────────────────────────
  console.log('🔧 Seeding services...');
  await prisma.service.deleteMany({ where: { clinicId: clinic.id } });

  const serviceData = [
    { name: 'فحص عام',         basePrice: 50,  estimatedDuration: 30 },
    { name: 'تنظيف الأسنان',   basePrice: 80,  estimatedDuration: 45 },
    { name: 'حشو عادي',        basePrice: 120, estimatedDuration: 45 },
    { name: 'حشو جمالي',       basePrice: 200, estimatedDuration: 60 },
    { name: 'تبييض أسنان',     basePrice: 350, estimatedDuration: 60 },
    { name: 'علاج عصب',        basePrice: 400, estimatedDuration: 90 },
    { name: 'خلع سن',          basePrice: 100, estimatedDuration: 30 },
    { name: 'تركيب تاج',       basePrice: 600, estimatedDuration: 60 },
    { name: 'تقويم معادن',     basePrice: 2500,estimatedDuration: 30 },
    { name: 'تقويم شفاف',      basePrice: 3500,estimatedDuration: 30 },
    { name: 'زراعة أسنان',     basePrice: 1500,estimatedDuration: 120 },
    { name: 'تركيب طقم أسنان', basePrice: 800, estimatedDuration: 60 },
  ];
  const services = await Promise.all(
    serviceData.map((s) => prisma.service.create({ data: { ...s, clinicId: clinic.id } }))
  );
  await prisma.doctor.update({
    where: { id: doctor.id },
    data: { servicesOffered: { set: services.map((s) => ({ id: s.id })) } },
  });
  console.log(`✓ Created ${services.length} services`);

  // ── Patients ───────────────────────────────────────────────────────────────
  console.log('👤 Seeding patients...');
  const patientData = [
    { name: 'أحمد خالد',     phone: '970591100001', dob: '1985-03-10', gender: 'Male',   blood: 'O+',  allergies: 'لا يوجد',   history: 'ضغط دم مرتفع' },
    { name: 'سمر عبدالله',   phone: '970591100002', dob: '1992-07-22', gender: 'Female', blood: 'A+',  allergies: 'بنسلين',    history: 'لا يوجد' },
    { name: 'عمر يوسف',      phone: '970591100003', dob: '1978-11-05', gender: 'Male',   blood: 'B+',  allergies: 'لا يوجد',   history: 'سكري نوع 2' },
    { name: 'ريم محمود',     phone: '970591100004', dob: '2000-01-30', gender: 'Female', blood: 'AB+', allergies: 'لا يوجد',   history: 'لا يوجد' },
    { name: 'كريم نادر',     phone: '970591100005', dob: '1995-09-15', gender: 'Male',   blood: 'O-',  allergies: 'إيبوبروفين', history: 'أمراض قلب' },
    { name: 'لينا سامي',     phone: '970591100006', dob: '1988-04-20', gender: 'Female', blood: 'A-',  allergies: 'لا يوجد',   history: 'تضخم اللثة' },
    { name: 'يوسف طارق',     phone: '970591100007', dob: '2010-06-08', gender: 'Male',   blood: 'B-',  allergies: 'لا يوجد',   history: 'طفل، صحة جيدة' },
    { name: 'منى حسين',      phone: '970591100008', dob: '1970-12-25', gender: 'Female', blood: 'O+',  allergies: 'سلفا',      history: 'هشاشة عظام' },
    { name: 'بلال إبراهيم',  phone: '970591100009', dob: '2003-08-14', gender: 'Male',   blood: 'A+',  allergies: 'لا يوجد',   history: 'لا يوجد' },
    { name: 'هند علي',       phone: '970591100010', dob: '1998-02-11', gender: 'Female', blood: 'AB-', allergies: 'لا يوجد',   history: 'تقويم سابق' },
  ];

  const createdPatients = await Promise.all(
    patientData.map(async (p, i) => {
      // upsert by phone to allow re-runs
      let userRec = await prisma.user.findFirst({ where: { phoneNumber: p.phone } });
      if (!userRec) {
        userRec = await prisma.user.create({
          data: {
            name: p.name,
            phoneNumber: p.phone,
            email: `testpatient${i + 1}@denclinic.test`,
            password: await hashPw(PATIENT_PASSWORD),
            roles: ['PATIENT'] as UserRole[],
          },
        });
      }
      let patientRec = await prisma.patient.findUnique({ where: { userId: userRec.id } });
      if (!patientRec) {
        patientRec = await prisma.patient.create({
          data: {
            userId: userRec.id,
            dateOfBirth: new Date(p.dob),
            gender: p.gender,
            bloodType: p.blood,
            allergies: p.allergies,
            medicalHistory: p.history,
          },
        });
      }
      return { user: userRec, patient: patientRec };
    })
  );
  console.log(`✓ Created ${createdPatients.length} patients`);

  // ── Appointments ───────────────────────────────────────────────────────────
  console.log('📅 Seeding appointments...');

  type AptDef = {
    patientIdx: number;
    serviceIdx: number;
    daysOffset: number;
    time: string;
    status: AppointmentStatus;
    notes?: string;
  };

  const aptDefs: AptDef[] = [
    // Upcoming (future)
    { patientIdx: 0, serviceIdx: 0, daysOffset: 1,  time: '09:00', status: 'CONFIRMED',  notes: 'مراجعة روتينية' },
    { patientIdx: 1, serviceIdx: 1, daysOffset: 1,  time: '10:00', status: 'CONFIRMED' },
    { patientIdx: 2, serviceIdx: 5, daysOffset: 2,  time: '11:00', status: 'PENDING',   notes: 'يعاني من ألم شديد' },
    { patientIdx: 3, serviceIdx: 4, daysOffset: 2,  time: '14:00', status: 'PENDING' },
    { patientIdx: 4, serviceIdx: 2, daysOffset: 3,  time: '09:30', status: 'CONFIRMED' },
    { patientIdx: 5, serviceIdx: 8, daysOffset: 4,  time: '10:30', status: 'CONFIRMED',  notes: 'استشارة تقويم' },
    { patientIdx: 6, serviceIdx: 0, daysOffset: 5,  time: '16:00', status: 'PENDING' },
    { patientIdx: 7, serviceIdx: 6, daysOffset: 6,  time: '11:00', status: 'CONFIRMED' },
    { patientIdx: 8, serviceIdx: 3, daysOffset: 7,  time: '13:00', status: 'PENDING' },
    { patientIdx: 9, serviceIdx: 9, daysOffset: 8,  time: '15:00', status: 'CONFIRMED',  notes: 'متابعة تقويم شفاف' },
    // Today
    { patientIdx: 0, serviceIdx: 1, daysOffset: 0,  time: '08:30', status: 'COMPLETED', notes: 'تم التنظيف بنجاح' },
    { patientIdx: 1, serviceIdx: 2, daysOffset: 0,  time: '10:00', status: 'COMPLETED' },
    { patientIdx: 2, serviceIdx: 0, daysOffset: 0,  time: '11:30', status: 'NO_SHOW' },
    { patientIdx: 3, serviceIdx: 5, daysOffset: 0,  time: '14:00', status: 'CONFIRMED' },
    { patientIdx: 4, serviceIdx: 6, daysOffset: 0,  time: '15:30', status: 'CONFIRMED' },
    // Past - last week
    { patientIdx: 5, serviceIdx: 1, daysOffset: -1, time: '09:00', status: 'COMPLETED' },
    { patientIdx: 6, serviceIdx: 2, daysOffset: -1, time: '10:30', status: 'COMPLETED' },
    { patientIdx: 7, serviceIdx: 4, daysOffset: -2, time: '11:00', status: 'COMPLETED', notes: 'تبييض جلسة أولى' },
    { patientIdx: 8, serviceIdx: 0, daysOffset: -2, time: '14:00', status: 'CANCELLED', notes: 'المريض ألغى' },
    { patientIdx: 9, serviceIdx: 7, daysOffset: -3, time: '09:30', status: 'COMPLETED' },
    { patientIdx: 0, serviceIdx: 5, daysOffset: -3, time: '11:00', status: 'COMPLETED', notes: 'علاج عصب ناجح' },
    { patientIdx: 1, serviceIdx: 8, daysOffset: -4, time: '10:00', status: 'COMPLETED' },
    { patientIdx: 2, serviceIdx: 3, daysOffset: -5, time: '13:00', status: 'COMPLETED' },
    { patientIdx: 3, serviceIdx: 1, daysOffset: -5, time: '15:00', status: 'NO_SHOW' },
    { patientIdx: 4, serviceIdx: 2, daysOffset: -6, time: '09:00', status: 'COMPLETED' },
    { patientIdx: 5, serviceIdx: 6, daysOffset: -7, time: '11:30', status: 'COMPLETED' },
    { patientIdx: 6, serviceIdx: 0, daysOffset: -7, time: '14:00', status: 'CANCELLED' },
    // Older - 2-4 weeks ago
    { patientIdx: 7, serviceIdx: 10,daysOffset:-10, time: '10:00', status: 'COMPLETED', notes: 'زراعة ضرس العقل' },
    { patientIdx: 8, serviceIdx: 4, daysOffset:-12, time: '11:00', status: 'COMPLETED' },
    { patientIdx: 9, serviceIdx: 1, daysOffset:-14, time: '09:30', status: 'COMPLETED' },
    { patientIdx: 0, serviceIdx: 2, daysOffset:-15, time: '14:00', status: 'COMPLETED' },
    { patientIdx: 1, serviceIdx: 0, daysOffset:-18, time: '10:00', status: 'CANCELLED' },
    { patientIdx: 2, serviceIdx: 5, daysOffset:-20, time: '11:00', status: 'COMPLETED', notes: 'جلسة علاج العصب الأولى' },
    { patientIdx: 3, serviceIdx: 7, daysOffset:-22, time: '13:00', status: 'COMPLETED' },
    { patientIdx: 4, serviceIdx: 9, daysOffset:-25, time: '15:00', status: 'COMPLETED', notes: 'بدأ العلاج بالإبالاين' },
    { patientIdx: 5, serviceIdx: 11,daysOffset:-28, time: '09:00', status: 'COMPLETED' },
    { patientIdx: 6, serviceIdx: 2, daysOffset:-30, time: '10:30', status: 'COMPLETED' },
  ];

  await Promise.all(
    aptDefs.map(({ patientIdx, serviceIdx, daysOffset, time, status, notes }) => {
      const { user: pUser, patient: pPatient } = createdPatients[patientIdx];
      const service = services[serviceIdx];
      return prisma.appointment.create({
        data: {
          patientId: pPatient.id,
          userId: pUser.id,
          clinicId: clinic.id,
          branchId: branch.id,
          doctorId: doctor.id,
          serviceId: service.id,
          appointmentDate: daysFromNow(daysOffset),
          appointmentTime: time,
          status,
          notes: notes ?? null,
        },
      });
    })
  );
  console.log(`✓ Created ${aptDefs.length} appointments`);

  // ── Slots ─────────────────────────────────────────────────────────────────
  console.log('⏰ Seeding slots...');
  const times = [
    { start: '08:30', end: '09:00' }, { start: '09:00', end: '09:30' },
    { start: '09:30', end: '10:00' }, { start: '10:00', end: '10:30' },
    { start: '10:30', end: '11:00' }, { start: '11:00', end: '11:30' },
    { start: '11:30', end: '12:00' }, { start: '14:00', end: '14:30' },
    { start: '14:30', end: '15:00' }, { start: '15:00', end: '15:30' },
    { start: '15:30', end: '16:00' }, { start: '16:00', end: '16:30' },
  ];
  const slotDates = Array.from({ length: 30 }, (_, i) => daysFromNow(i - 7));
  const slots = slotDates.flatMap((date) =>
    times.map((t) => ({
      doctorId: doctor.id,
      branchId: branch.id,
      slotDate: date,
      startTime: t.start,
      endTime: t.end,
      isAvailable: Math.random() > 0.25,
    }))
  );
  const created = await prisma.slot.createMany({ data: slots, skipDuplicates: true });
  console.log(`✓ Created ${created.count} slots`);

  // ── Ratings ───────────────────────────────────────────────────────────────
  console.log('⭐ Seeding ratings...');
  const ratingData = [
    { idx: 0, rating: 5.0, comment: 'دكتور ممتاز وعيادة نظيفة جداً' },
    { idx: 1, rating: 4.5, comment: 'خدمة رائعة وأسعار معقولة' },
    { idx: 2, rating: 5.0, comment: 'أفضل تجربة عند طبيب أسنان' },
    { idx: 3, rating: 4.0, comment: 'جيد، لكن الانتظار كان طويل' },
    { idx: 4, rating: 5.0, comment: 'معالجة احترافية وأريح من الألم' },
    { idx: 5, rating: 4.5, comment: 'طاقم متعاون وبيئة مريحة' },
    { idx: 6, rating: 5.0, comment: 'أنصح الجميع بهذه العيادة' },
  ];
  await Promise.all(
    ratingData.map(({ idx, rating, comment }) =>
      prisma.rating.create({
        data: {
          userId: createdPatients[idx].user.id,
          clinicId: clinic.id,
          rating,
          comment,
        },
      })
    )
  );
  console.log(`✓ Created ${ratingData.length} ratings`);

  // ── Update doctor rating ───────────────────────────────────────────────────
  await prisma.doctor.update({
    where: { id: doctor.id },
    data: { rating: 4.7, reviewCount: ratingData.length },
  });

  console.log('\n✅ Data seeded successfully!\n');
  console.log('📊 Summary for masalmahmouath@gmail.com:');
  console.log(`   Clinic:       ${clinic.name}`);
  console.log(`   Services:     ${services.length}`);
  console.log(`   Patients:     ${createdPatients.length}`);
  console.log(`   Appointments: ${aptDefs.length}`);
  console.log(`   Slots:        ${created.count}`);
  console.log(`   Ratings:      ${ratingData.length}`);
}

main()
  .catch((e) => { console.error('❌', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
