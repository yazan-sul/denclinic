// Load environment variables FIRST before any other imports
import { config } from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(__dirname, '../.env');
config({ path: envPath });

/**
 * Prisma Database Seeder
 *
 * Dependency order (critical):
 * 1. SubscriptionPlan (no deps)
 * 2. User (clinic owner)
 * 3. Clinic (fk→SubscriptionPlan, fk→User owner)
 * 4. Branch (fk→Clinic)
 * 5. Service (fk→Clinic)
 * 6. User (doctors) + Patient records for each
 * 7. Doctor (fk→User, Clinic, Branch)
 * 8. Slot (fk→Doctor, Branch)
 * 9. User (staff) + Patient records for each
 * 10. Staff (fk→User, Clinic, Branch)
 * 11. User (patients) + Patient records for each
 * 12. Rating (fk→User, Clinic)
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import { seedConfig } from './seeds/seedConfig';
import { subscriptionPlans, clinics, branches, services } from './seeds/seedClinicData';
import { doctorUsers, doctorProfiles, generateSlots } from './seeds/seedDoctorData';
import { patientUsers, patientProfiles, clinicOwnerUser, staffUsers, staffProfiles, ratings, TEST_PASSWORD } from './seeds/seedPatientData';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const adapter = new PrismaPg({ connectionString: databaseUrl });
const prisma = new PrismaClient({ adapter });

async function hashPassword(password: string): Promise<string> {
  return hash(password, { memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1 });
}

async function main() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Clear existing data (reverse FK order; cascade handles child records)
    console.log('🗑️  Clearing existing data...');
    await prisma.appointment.deleteMany();
    await prisma.slot.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.rating.deleteMany();
    await prisma.staff.deleteMany();
    await prisma.doctor.deleteMany();
    await prisma.service.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.patientGuardian.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.clinic.deleteMany();
    await prisma.user.deleteMany();
    console.log('✓ Data cleared\n');

    // Step 1: Subscription Plans
    console.log('📋 Seeding SubscriptionPlans...');
    const seedPlans = await Promise.all(
      subscriptionPlans.map((plan) =>
        prisma.subscriptionPlan.upsert({ where: { tier: plan.tier }, update: {}, create: plan })
      )
    );
    console.log(`✓ Created ${seedPlans.length} subscription plans\n`);

    // Step 2: Clinic Owner User + Patient record
    console.log('👔 Seeding Clinic Owner User...');
    const ownerUser = await prisma.user.create({
      data: {
        ...clinicOwnerUser,
        roles: [...clinicOwnerUser.roles] as UserRole[],
        password: await hashPassword(clinicOwnerUser.password),
        patient: { create: {} },
      },
    });
    console.log(`✓ Created clinic owner user\n`);

    // Step 3: Clinics
    console.log('🏥 Seeding Clinics...');
    const seedClinics = await Promise.all(
      clinics.map((clinic, index) =>
        prisma.clinic.create({
          data: {
            ...clinic,
            ownerId: index === 0 ? ownerUser.id : clinic.ownerId,
            subscription: clinic.currentSubscriber
              ? {
                  create: {
                    planId: seedConfig.SUBSCRIPTION_PLAN_IDS.PROFESSIONAL,
                    startDate: seedConfig.baseDate,
                    endDate: new Date(seedConfig.baseDate.getTime() + 365 * 24 * 60 * 60 * 1000),
                    renewalDate: new Date(seedConfig.baseDate.getTime() + 365 * 24 * 60 * 60 * 1000),
                    status: 'ACTIVE',
                    monthlyBilled: false,
                    autoRenew: true,
                  },
                }
              : undefined,
          },
          include: { subscription: true },
        })
      )
    );
    console.log(`✓ Created ${seedClinics.length} clinics\n`);

    const clinicIdMap: Record<number, number> = {};
    seedClinics.forEach((c, i) => { clinicIdMap[i + 1] = c.id; });

    // Step 4: Branches
    console.log('🏢 Seeding Branches...');
    const seedBranches = await Promise.all(
      branches.map((branch) =>
        prisma.branch.create({
          data: { ...branch, clinicId: clinicIdMap[branch.clinicId] || branch.clinicId },
        })
      )
    );
    console.log(`✓ Created ${seedBranches.length} branches\n`);

    const branchIdMap: Record<number, number> = {};
    seedBranches.forEach((b, i) => { branchIdMap[i + 1] = b.id; });

    // Step 5: Services
    console.log('🔧 Seeding Services...');
    const seedServices = await Promise.all(
      services.map((service) =>
        prisma.service.create({
          data: { ...service, clinicId: clinicIdMap[service.clinicId] || service.clinicId },
        })
      )
    );
    console.log(`✓ Created ${seedServices.length} services\n`);

    const serviceIdMap: Record<number, number> = {};
    seedServices.forEach((s, i) => { serviceIdMap[i + 1] = s.id; });

    // Step 6: Doctor Users + Patient records for each
    console.log('👨‍⚕️ Seeding Doctor Users...');
    const seedDoctorUsers = await Promise.all(
      doctorUsers.map(async (user) =>
        prisma.user.create({
          data: {
            ...user,
            roles: [...user.roles] as UserRole[],
            password: await hashPassword(user.password),
            patient: { create: {} },
          },
        })
      )
    );
    console.log(`✓ Created ${seedDoctorUsers.length} doctor users\n`);

    // Step 7: Doctor Profiles
    console.log('📚 Seeding Doctor Profiles...');
    const seedDoctorProfiles = await Promise.all(
      doctorProfiles.map(({ userIndex, clinicId, branchId, servicesOffered, ...profileData }) =>
        prisma.doctor.create({
          data: {
            ...profileData,
            userId: seedDoctorUsers[userIndex].id,
            clinicId: clinicIdMap[clinicId] || clinicId,
            branchId: branchIdMap[branchId] || branchId,
            servicesOffered: {
              connect: servicesOffered.map((id) => ({ id: serviceIdMap[id] || id })),
            },
          },
        })
      )
    );
    console.log(`✓ Created ${seedDoctorProfiles.length} doctor profiles\n`);

    // Step 8: Slots
    console.log('⏰ Seeding Appointment Slots...');
    const slotsData = generateSlots(
      seedDoctorProfiles.map((d) => d.id),
      seedBranches.map((b) => b.id),
    );
    const seedSlots = await prisma.slot.createMany({ data: slotsData, skipDuplicates: true });
    console.log(`✓ Created ${seedSlots.count} appointment slots\n`);

    // Step 9: Staff Users + Patient records for each
    console.log('🗂️  Seeding Staff Users...');
    const seedStaffUsers = await Promise.all(
      staffUsers.map(async (user) =>
        prisma.user.create({
          data: {
            ...user,
            roles: [...user.roles] as UserRole[],
            password: await hashPassword(user.password),
            patient: { create: {} },
          },
        })
      )
    );
    console.log(`✓ Created ${seedStaffUsers.length} staff users\n`);

    // Step 10: Staff Profiles
    console.log('🗂️  Seeding Staff Profiles...');
    const seedStaffProfiles = await Promise.all(
      staffProfiles.map(({ userIndex, clinicIndex, branchIndex, ...profileData }) =>
        prisma.staff.create({
          data: {
            ...profileData,
            userId: seedStaffUsers[userIndex].id,
            clinicId: seedClinics[clinicIndex].id,
            branchId: seedBranches[branchIndex].id,
          },
        })
      )
    );
    console.log(`✓ Created ${seedStaffProfiles.length} staff profiles\n`);

    // Step 10.5: Super-user setup for Mouath (all roles)
    const mouathUser = seedStaffUsers.find(u => u.email === 'masalmahmouath@gmail.com');
    if (mouathUser) {
      console.log('⚡ Setting up Mouath super-user profile...');

      // Doctor profile
      const mouathDoctor = await prisma.doctor.upsert({
        where: { userId: mouathUser.id },
        create: {
          userId: mouathUser.id,
          clinicId: seedClinics[0].id,
          branchId: seedBranches[0].id,
          specialization: 'طب الأسنان العام',
          bio: 'معاذ مسالمه — حساب تطوير بكل الأدوار',
          yearsOfExperience: 3,
          qualifications: 'بكالوريوس طب أسنان',
          rating: 5.0,
          reviewCount: 0,
        },
        update: {},
      });

      // Link mouath as clinic owner of clinic 0
      await prisma.clinic.update({
        where: { id: seedClinics[0].id },
        data: { ownerId: mouathUser.id },
      });

      // Patient record
      await prisma.patient.upsert({
        where: { userId: mouathUser.id },
        create: { userId: mouathUser.id },
        update: {},
      });

      console.log(`✓ Mouath: doctor(${mouathDoctor.id}), clinic owner(${seedClinics[0].id})\n`);
    }

    // Step 11: Patient Users + Patient records
    console.log('👤 Seeding Patient Users...');
    const seedPatientUsers = await Promise.all(
      patientUsers.map(async (user) =>
        prisma.user.create({
          data: {
            ...user,
            roles: [...user.roles] as UserRole[],
            password: await hashPassword(user.password),
          },
        })
      )
    );
    console.log(`✓ Created ${seedPatientUsers.length} patient users\n`);

    console.log('🏥 Seeding Patient Profiles...');
    const seedPatientProfiles = await Promise.all(
      patientProfiles.map((profile) =>
        prisma.patient.create({
          data: {
            userId: seedPatientUsers[profile.userIndex].id,
            dateOfBirth: profile.dateOfBirth,
            gender: profile.gender,
            bloodType: profile.bloodType,
            allergies: profile.allergies,
            medicalHistory: profile.medicalHistory,
          },
        })
      )
    );
    console.log(`✓ Created ${seedPatientProfiles.length} patient profiles\n`);

    // Step 12: Ratings
    console.log('⭐ Seeding Clinic Ratings...');
    const seedRatings = await Promise.all(
      ratings.map((rating, index) =>
        prisma.rating.create({
          data: {
            ...rating,
            userId: seedPatientUsers[index % seedPatientUsers.length].id,
            clinicId: clinicIdMap[rating.clinicId] || rating.clinicId,
          },
        })
      )
    );
    console.log(`✓ Created ${seedRatings.length} clinic ratings\n`);

    // Step 13: Booked Appointments, Lab Cases & Notifications
    console.log('📅 Seeding Booked Appointments, Lab Cases & Notifications...');

    const clinic0  = seedClinics[0];
    const branch0  = seedBranches[0];
    const branch1  = seedBranches[1];
    const doctor0  = seedDoctorProfiles[0]; // Dr. محمد علي  — clinic0/branch0
    const doctor1  = seedDoctorProfiles[1]; // Dr. سارة محمود — clinic0/branch0
    const service0 = seedServices[0];       // First service in clinic0
    const service1 = seedServices[1];       // Second service in clinic0

    const todayStr     = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const lastWeekStr  = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

    // Appointments — mix of statuses and dates
    const appointmentDefs = [
      // Today — upcoming
      { patientIdx: 0, doctorId: doctor0.id, branchId: branch0.id, date: todayStr, time: '09:00', status: 'PENDING',   serviceId: service0.id },
      { patientIdx: 1, doctorId: doctor1.id, branchId: branch0.id, date: todayStr, time: '09:30', status: 'CONFIRMED', serviceId: service1.id },
      { patientIdx: 2, doctorId: doctor0.id, branchId: branch0.id, date: todayStr, time: '10:00', status: 'PENDING',   serviceId: service0.id },
      { patientIdx: 3, doctorId: doctor1.id, branchId: branch1.id, date: todayStr, time: '10:30', status: 'CONFIRMED', serviceId: service1.id },
      { patientIdx: 4, doctorId: doctor0.id, branchId: branch1.id, date: todayStr, time: '11:00', status: 'PENDING',   serviceId: service0.id },
      // Yesterday — completed / no-show
      { patientIdx: 0, doctorId: doctor0.id, branchId: branch0.id, date: yesterdayStr, time: '09:00', status: 'COMPLETED', serviceId: service1.id },
      { patientIdx: 1, doctorId: doctor1.id, branchId: branch0.id, date: yesterdayStr, time: '10:00', status: 'COMPLETED', serviceId: service0.id },
      { patientIdx: 2, doctorId: doctor0.id, branchId: branch0.id, date: yesterdayStr, time: '11:00', status: 'NO_SHOW',   serviceId: service1.id },
      // Last week — completed / cancelled
      { patientIdx: 3, doctorId: doctor0.id, branchId: branch0.id, date: lastWeekStr, time: '09:00', status: 'COMPLETED', serviceId: service0.id },
      { patientIdx: 4, doctorId: doctor1.id, branchId: branch0.id, date: lastWeekStr, time: '10:30', status: 'CANCELLED', serviceId: service1.id },
    ];

    const seedAppointments = await Promise.all(
      appointmentDefs.map(({ patientIdx, doctorId, branchId, date, time, status, serviceId }) =>
        prisma.appointment.create({
          data: {
            userId:          seedPatientUsers[patientIdx].id,
            patientId:       seedPatientProfiles[patientIdx].id,
            clinicId:        clinic0.id,
            branchId,
            doctorId,
            serviceId,
            appointmentDate: new Date(date),
            appointmentTime: time,
            status:          status as any,
            notes:           null,
          },
        })
      )
    );
    console.log(`✓ Created ${seedAppointments.length} booked appointments`);

    // Treatments + Lab cases — linked to completed appointments
    const completedAppts = seedAppointments.filter((_, i) => appointmentDefs[i].status === 'COMPLETED');

    const seedTreatments = await Promise.all(
      completedAppts.map((appt, i) =>
        prisma.treatment.create({
          data: {
            appointmentId: appt.id,
            status:        i === 0 ? 'COMPLETED' : 'ONGOING',
            diagnosis:     i === 0 ? 'تسوس في الضرس الأيمن السفلي' : 'التهاب لثة خفيف',
            notesPublic:   'تم إجراء الفحص الشامل',
            notesInternal: 'المريض يحتاج متابعة بعد شهر',
            cost:          i === 0 ? 350 : 200,
          },
        })
      )
    );
    console.log(`✓ Created ${seedTreatments.length} treatment records`);

    const labCaseDefs = [
      { treatmentIdx: 0, labName: 'مختبر النور',   caseType: 'تاج خزفي',  status: 'DELIVERED',   cost: 250, notes: 'قياسات سليمة، تم التسليم',    sentDate: new Date(lastWeekStr) },
      { treatmentIdx: 1, labName: 'مختبر الشفاء',  caseType: 'طقم أسنان', status: 'IN_PROGRESS', cost: 180, notes: 'قيد التصنيع',                   sentDate: new Date(yesterdayStr) },
      { treatmentIdx: 2, labName: 'مختبر النور',   caseType: 'حشو خزفي',  status: 'SENT',        cost: 120, notes: 'تم الإرسال، انتظار النتيجة',    sentDate: new Date() },
    ];

    const seedLabCases = await Promise.all(
      labCaseDefs
        .filter(({ treatmentIdx }) => seedTreatments[treatmentIdx])
        .map(({ treatmentIdx, labName, caseType, status, cost, notes, sentDate }) =>
          prisma.labCase.create({
            data: {
              treatmentId:  seedTreatments[treatmentIdx].id,
              labName,
              caseType,
              status:       status as any,
              cost,
              notesPublic:  notes,
              sentDate,
            },
          })
        )
    );
    console.log(`✓ Created ${seedLabCases.length} lab cases`);

    // Notifications for Mouath
    if (mouathUser) {
      const notifDefs = [
        { type: 'APPOINTMENT_REMINDER', title: 'تذكير بموعد',           message: `موعد أحمد محمد اليوم الساعة 09:00 في فرع الدقي الرئيسي`,     link: '/staff/appointments' },
        { type: 'APPOINTMENT_UPDATED',  title: 'تحديث حالة موعد',       message: 'تم تأكيد موعد فاطمة علي الساعة 09:30',                       link: '/staff/appointments' },
        { type: 'CLINIC_ASSIGNMENT',    title: 'تم تعيينك في العيادة',  message: 'تم تعيينك سكرتيراً في عيادة الأسنان المتقدمة — فرع الدقي',   link: '/staff' },
        { type: 'APPOINTMENT_UPDATED',  title: 'إلغاء موعد',            message: 'تم إلغاء موعد يوسف كمال الساعة 10:30',                       link: '/staff/appointments' },
        { type: 'GENERAL',              title: 'رسالة من الإدارة',      message: 'يرجى مراجعة جدول المواعيد لهذا الأسبوع وتأكيد التوافر',      link: null },
      ];

      await prisma.notification.createMany({
        data: notifDefs.map(n => ({
          userId:  mouathUser.id,
          type:    n.type as any,
          title:   n.title,
          message: n.message,
          link:    n.link,
          isRead:  false,
        })),
      });
      console.log(`✓ Created ${notifDefs.length} notifications for Mouath`);
    }
    console.log('');

    // Summary
    console.log('\n✨ DATABASE SEEDING COMPLETE! ✨\n');
    console.log('📊 Summary:');
    console.log(`  - Subscription Plans: ${seedPlans.length}`);
    console.log(`  - Clinics: ${seedClinics.length}`);
    console.log(`  - Branches: ${seedBranches.length}`);
    console.log(`  - Services: ${seedServices.length}`);
    console.log(`  - Doctor Users: ${seedDoctorUsers.length}`);
    console.log(`  - Doctor Profiles: ${seedDoctorProfiles.length}`);
    console.log(`  - Appointment Slots: ${seedSlots.count}`);
    console.log(`  - Staff Users: ${seedStaffUsers.length}`);
    console.log(`  - Staff Profiles: ${seedStaffProfiles.length}`);
    console.log(`  - Patient Users: ${seedPatientUsers.length}`);
    console.log(`  - Patient Profiles: ${seedPatientProfiles.length}`);
    console.log(`  - Ratings: ${seedRatings.length}`);

    console.log('\n🔐 Test Credentials (password for all accounts):');
    console.log(`  Password: ${TEST_PASSWORD}\n`);
    console.log('  Clinic Owner (roles: CLINIC_OWNER + PATIENT):');
    console.log(`    ${clinicOwnerUser.email}`);
    console.log('\n  Staff:');
    staffUsers.forEach((u) => console.log(`    ${u.email}  (${u.roles.join(', ')})`));
    console.log('\n  Doctors:');
    doctorUsers.forEach((u) => console.log(`    ${u.email}`));
    console.log('\n  Patients:');
    patientUsers.forEach((u) => console.log(`    ${u.email}`));
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
