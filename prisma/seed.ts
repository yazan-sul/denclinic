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
 * 2. Clinic (fk→SubscriptionPlan, optional owner)
 * 3. Branch (fk→Clinic)
 * 4. Service (fk→Clinic)
 * 5. User (doctors)
 * 6. Doctor (fk→User, Clinic, Branch)
 * 7. Slot (fk→Doctor, Branch)
 * 8. User (clinic owner)
 * 9. User (patients)
 * 10. Patient (fk→User)
 * 11. Rating (fk→User, Clinic)
 */

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import { seedConfig, generateTimeSlots } from './seeds/seedConfig';
import { subscriptionPlans, clinics, branches, services } from './seeds/seedClinicData';
import { doctorUsers, doctorProfiles, generateSlots } from './seeds/seedDoctorData';
import { patientUsers, patientProfiles, clinicOwnerUser, ratings } from './seeds/seedPatientData';

// Initialize Prisma with the same adapter as the main app
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});
const prisma = new PrismaClient({ adapter });

// ============================================
// PASSWORD HASHING
// ============================================

async function hashPassword(password: string): Promise<string> {
  try {
    // Use argon2 if available, otherwise use a simple hash for demo
    return await hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });
  } catch {
    // Fallback: for demo purposes
    console.warn('⚠️  Argon2 not available, using simple hash. Use production-grade hashing in production.');
    return `hashed_${password}`;
  }
}

// ============================================
// SEEDING FUNCTIONS
// ============================================

async function main() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Clear existing data (in reverse order of foreign keys)
    console.log('🗑️  Clearing existing data...');
    await prisma.appointment.deleteMany();
    await prisma.slot.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.rating.deleteMany();
    await prisma.doctor.deleteMany();
    await prisma.service.deleteMany();
    await prisma.branch.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.patientGuardian.deleteMany();
    await prisma.patient.deleteMany();
    await prisma.clinic.deleteMany();
    await prisma.user.deleteMany();
    console.log('✓ Data cleared\n');


    // Step 1: Seed SubscriptionPlans (no dependencies)
    console.log('📋 Seeding SubscriptionPlans...');
    const seedPlans = await Promise.all(
      subscriptionPlans.map((plan) =>
        prisma.subscriptionPlan.upsert({
          where: { tier: plan.tier },
          update: {},
          create: plan,
        })
      )
    );
    console.log(`✓ Created ${seedPlans.length} subscription plans\n`);

    // Step 1.5: Seed Clinic Owner User (must be before Clinic creation)
    console.log('👔 Seeding Clinic Owner User...');
    const ownerUser = await prisma.user.create({
      data: {
        ...clinicOwnerUser,
        password: await hashPassword(clinicOwnerUser.password),
      },
    });
    console.log(`✓ Created clinic owner user\n`);


    // Step 2: Seed Clinics
    console.log('🏥 Seeding Clinics...');
    const seedClinics = await Promise.all(
      clinics.map((clinic, index) =>
        prisma.clinic.create({
          data: {
            ...clinic,
            // Override ownerId with the actual created owner user (only for first clinic)
            ownerId: index === 0 ? ownerUser.id : clinic.ownerId,
            subscription: clinic.currentSubscriber
              ? {
                  create: {
                    planId: seedConfig.SUBSCRIPTION_PLAN_IDS.PROFESSIONAL,
                    startDate: seedConfig.baseDate,
                    endDate: new Date(seedConfig.baseDate.getTime() + 365 * 24 * 60 * 60 * 1000), // 1 year
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

    // Create a map of fixture clinicId (1-based index) to actual created clinic IDs
    const clinicIdMap: { [key: number]: number } = {};
    seedClinics.forEach((clinic, index) => {
      clinicIdMap[index + 1] = clinic.id; // Map fixture order (1, 2, 3...) to actual database IDs
    });

    // Step 3: Seed Branches  
    console.log('🏢 Seeding Branches...');
    const seedBranches = await Promise.all(
      branches.map((branch) =>
        prisma.branch.create({
          data: {
            ...branch,
            // Map the fixture clinicId to actual created clinic ID
            clinicId: clinicIdMap[branch.clinicId] || branch.clinicId,
          },
        })
      )
    );
    console.log(`✓ Created ${seedBranches.length} branches\n`);

    // Step 4: Seed Services
    console.log('🔧 Seeding Services...');
    const seedServices = await Promise.all(
      services.map((service) =>
        prisma.service.create({
          data: {
            ...service,
            clinicId: clinicIdMap[service.clinicId] || service.clinicId,
          },
        })
      )
    );
    console.log(`✓ Created ${seedServices.length} services\n`);


    // Step 5: Seed Doctor Users
    console.log('👨‍⚕️ Seeding Doctor Users...');
    const seedDoctorUsers = await Promise.all(
      doctorUsers.map(async (user) =>
        prisma.user.create({
          data: {
            ...user,
            password: await hashPassword(user.password),
          },
        })
      )
    );
    console.log(`✓ Created ${seedDoctorUsers.length} doctor users\n`);


    // Step 6: Seed Doctor Profiles (link users to clinics)
    console.log('📚 Seeding Doctor Profiles...');
    // Create ID maps for doctor profiles to use
    const branchIdMap: { [key: number]: number } = {};
    seedBranches.forEach((branch, index) => {
      branchIdMap[index + 1] = branch.id;
    });
    
    const serviceIdMap: { [key: number]: number } = {};
    seedServices.forEach((service, index) => {
      serviceIdMap[index + 1] = service.id;
    });
    
    const seedDoctorProfiles = await Promise.all(
      doctorProfiles.map((profile) => {
        const { userIndex, clinicId, branchId, servicesOffered, ...profileData } = profile;
        return prisma.doctor.create({
          data: {
            ...profileData,
            userId: seedDoctorUsers[userIndex].id,
            clinicId: clinicIdMap[clinicId] || clinicId,
            branchId: branchIdMap[branchId] || branchId,
            servicesOffered: {
              connect: servicesOffered.map((serviceFixtureId) => ({ 
                id: serviceIdMap[serviceFixtureId] || serviceFixtureId 
              })),
            },
          },
        });
      })
    );
    console.log(`✓ Created ${seedDoctorProfiles.length} doctor profiles\n`);


    // Step 7: Seed Slots (availability for each doctor)
    console.log('⏰ Seeding Appointment Slots...');
    const doctorIds = seedDoctorProfiles.map((d) => d.id);
    const branchIds = seedBranches.map((b) => b.id);
    const slotsData = generateSlots(doctorIds, branchIds);
    
    const seedSlots = await prisma.slot.createMany({
      data: slotsData,
      skipDuplicates: true,
    });
    console.log(`✓ Created ${seedSlots.count} appointment slots\n`);


    // Step 8: Seed Patient Users
    console.log('👤 Seeding Patient Users...');
    const seedPatientUsers = await Promise.all(
      patientUsers.map(async (user) =>
        prisma.user.create({
          data: {
            ...user,
            password: await hashPassword(user.password),
          },
        })
      )
    );
    console.log(`✓ Created ${seedPatientUsers.length} patient users\n`);


    // Step 10: Seed Patient Profiles (medical info)
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

    // Step 11: Seed Ratings (reviews from patients)
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
    console.log(`  - Clinic Owner Users: 1`);
    console.log(`  - Patient Users: ${seedPatientUsers.length}`);
    console.log(`  - Patient Profiles: ${seedPatientProfiles.length}`);
    console.log(`  - Ratings: ${seedRatings.length}`);

    console.log('\n🔐 Demo Credentials:');
    console.log('  Clinic Owner:');
    console.log(`    Email: ${clinicOwnerUser.email}`);
    console.log(`    Password: Use any password (demo mode accepts 'password')`);
    console.log('\n  Sample Patients:');
    patientUsers.forEach((patient) => {
      console.log(`    Email: ${patient.email}`);
    });
    console.log(`    Password: Use any password (demo mode accepts 'password')`);

    console.log('\n💡 Next Steps:');
    console.log('  1. Update auth routes to use database queries');
    console.log('  2. Migrate clinic discovery routes');
    console.log('  3. Migrate booking routes');
    console.log('  4. Test end-to-end patient booking flow\n');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

