/**
 * One-time script to add a test user with all roles.
 * Run: npx ts-node --project tsconfig.seed.json prisma/addUser.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env') });

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, UserRole } from '@prisma/client';
import { hash } from '@node-rs/argon2';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'masalmahmouath@gmail.com';
  const username = 'Mouath1';
  const plainPassword = 'Mm123456789';
  const name = 'معاذ مسالمة';
  const phone = '970591000001';

  const password = await hash(plainPassword, {
    memoryCost: 19456, timeCost: 2, outputLen: 32, parallelism: 1,
  });

  // Delete existing user + clinic if any (clean re-run)
  const existing = await prisma.user.findFirst({ where: { OR: [{ email }, { username }] } });
  if (existing) {
    console.log('🗑️  Removing existing user...');
    await prisma.user.delete({ where: { id: existing.id } });
  }
  const existingClinic = await prisma.clinic.findFirst({ where: { name: 'عيادة معاذ للاختبار' } });
  if (existingClinic) {
    await prisma.clinic.delete({ where: { id: existingClinic.id } });
  }

  // Create subscription plan if needed
  let plan = await prisma.subscriptionPlan.findFirst({ where: { tier: 'PROFESSIONAL' } });
  if (!plan) {
    plan = await prisma.subscriptionPlan.create({
      data: {
        tier: 'PROFESSIONAL',
        name: 'المحترف',
        price: 199,
        maxDoctors: 10,
        maxBranches: 5,
        maxAppointmentsPerMonth: 500,
        features: ['الميزات الكاملة'],
      },
    });
  }

  // Create user with all roles
  const user = await prisma.user.create({
    data: {
      email,
      username,
      password,
      name,
      phoneNumber: phone,
      emailVerified: true,
      roles: ['PATIENT', 'DOCTOR', 'STAFF', 'CLINIC_OWNER', 'ADMIN'] as UserRole[],
      patient: { create: {} },
    },
  });
  console.log(`✓ User created: ${user.email} (id: ${user.id})`);

  // Create clinic owned by this user
  const clinic = await prisma.clinic.create({
    data: {
      name: 'عيادة معاذ للاختبار',
      specialty: 'طب الأسنان',
      phone: phone,
      ownerId: user.id,
      subscription: {
        create: {
          planId: plan.id,
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          status: 'ACTIVE',
          monthlyBilled: false,
          autoRenew: true,
        },
      },
    },
  });
  console.log(`✓ Clinic created: ${clinic.name} (id: ${clinic.id})`);

  // Create branch
  const branch = await prisma.branch.create({
    data: {
      name: 'الفرع الرئيسي',
      clinicId: clinic.id,
      phone: phone,
      address: 'رام الله، فلسطين',
      latitude: 31.9038,
      longitude: 35.2034,
    },
  });
  console.log(`✓ Branch created: ${branch.name} (id: ${branch.id})`);

  // Create a service
  const service = await prisma.service.create({
    data: {
      name: 'فحص عام',
      clinicId: clinic.id,
      basePrice: 50,
      estimatedDuration: 30,
    },
  });

  // Create doctor profile
  const doctor = await prisma.doctor.create({
    data: {
      userId: user.id,
      clinicId: clinic.id,
      branchId: branch.id,
      specialization: 'طب الأسنان العام',
      yearsOfExperience: 3,
      qualifications: 'بكالوريوس طب أسنان',
      rating: 5.0,
      reviewCount: 0,
      servicesOffered: { connect: [{ id: service.id }] },
    },
  });
  console.log(`✓ Doctor profile created (id: ${doctor.id})`);

  // Create staff profile
  const staff = await prisma.staff.create({
    data: {
      userId: user.id,
      clinicId: clinic.id,
      branchId: branch.id,
      position: 'مدير',
      department: 'الإدارة',
    },
  });
  console.log(`✓ Staff profile created (id: ${staff.id})`);

  console.log('\n✅ Done!\n');
  console.log('🔐 Login credentials:');
  console.log(`   Email:    ${email}`);
  console.log(`   Username: ${username}`);
  console.log(`   Password: ${plainPassword}`);
  console.log('\n🎭 Roles: PATIENT, DOCTOR, STAFF, CLINIC_OWNER, ADMIN');
}

main()
  .catch((e) => { console.error('❌', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
