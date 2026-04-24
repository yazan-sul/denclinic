import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding test data...');

  // 1. Get or Create a Doctor (User 25)
  let doctorUser = await prisma.user.findUnique({
    where: { id: 25 },
    include: { doctorProfile: true }
  });

  if (!doctorUser) {
    console.log('User 25 not found. Please create it or use another ID.');
    return;
  }

  // Find a clinic and branch to associate with
  const clinic = await prisma.clinic.findFirst();
  const branch = await prisma.branch.findFirst({ where: { clinicId: clinic?.id } });
  const service = await prisma.service.findFirst({ where: { clinicId: clinic?.id } });

  if (!clinic || !branch || !service) {
    console.log('Clinic, Branch, or Service missing. Cannot seed.');
    return;
  }

  // Create doctor profile if missing
  if (!doctorUser.doctorProfile) {
    await prisma.doctor.create({
      data: {
        userId: doctorUser.id,
        clinicId: clinic.id,
        branchId: branch.id,
        specialization: 'General Dentistry',
        bio: 'Expert in 3D dental mapping.',
      }
    });
  }

  const doctorProfile = await prisma.doctor.findUnique({ where: { userId: 25 } });

  // 2. Create Test Patients
  const patientData = [
    { name: 'أحمد علي', phone: '01011112222', email: 'ahmed@test.com' },
    { name: 'سارة محمد', phone: '01022223333', email: 'sara@test.com' },
    { name: 'ليلى خالد', phone: '01033334444', email: 'laila@test.com' },
  ];

  for (const data of patientData) {
    // Create User
    const user = await prisma.user.upsert({
      where: { email: data.email },
      update: {},
      create: {
        name: data.name,
        phoneNumber: data.phone,
        email: data.email,
        password: 'hashed_password_placeholder', // Should be hashed in real app
        roles: ['PATIENT'],
      }
    });

    // Create Patient Profile
    const patient = await prisma.patient.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
      }
    });

    // Create Appointment
    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        userId: user.id,
        clinicId: clinic.id,
        branchId: branch.id,
        doctorId: doctorProfile!.id,
        serviceId: service.id,
        appointmentDate: new Date(),
        appointmentTime: '10:00',
        status: 'CONFIRMED',
        notes: 'Test record for 3D teeth model visualization.',
      }
    });
    
    console.log(`Created record for patient: ${data.name}`);
  }

  console.log('Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
