import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Clear existing data (in reverse order of foreign keys)
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

  // Create Clinic
  const clinic1 = await prisma.clinic.create({
    data: {
      name: 'عيادة عبد اللطيف سليمان للأسنان',
      description: 'عيادة متخصصة في طب الأسنان وجراحة الفم بأحدث التقنيات',
      specialty: 'طب الأسنان وجراحة الفم',
      phone: '+966 11 1234567',
      email: 'info@suleiman-dental.com',
      website: 'https://suleiman-dental.com',
      logo: 'https://via.placeholder.com/200x200?text=Clinic+Logo',
      images: [
        'https://via.placeholder.com/600x400?text=Clinic+View+1',
        'https://via.placeholder.com/600x400?text=Clinic+View+2',
        'https://via.placeholder.com/600x400?text=Clinic+View+3',
      ],
      rating: 4.8,
      reviewCount: 250,
    },
  });

  // Create Services
  await prisma.service.createMany({
    data: [
      {
        clinicId: clinic1.id,
        name: 'تنظيف الأسنان',
        description: 'تنظيف احترافي للأسنان',
        icon: '🪥',
      },
      {
        clinicId: clinic1.id,
        name: 'حشو الأسنان',
        description: 'حشو التسوس بمواد عالية الجودة',
        icon: '🦷',
      },
      {
        clinicId: clinic1.id,
        name: 'تبييض الأسنان',
        description: 'تبييض احترافي للأسنان',
        icon: '✨',
      },
      {
        clinicId: clinic1.id,
        name: 'معالجة العصب',
        description: 'علاج جذري آمن وفعال',
        icon: '⚕️',
      },
      {
        clinicId: clinic1.id,
        name: 'خلع الأسنان',
        description: 'خلع آمن بتخدير موضعي',
        icon: '⚡',
      },
      {
        clinicId: clinic1.id,
        name: 'تقويم الأسنان',
        description: 'تقويم تقليدي وشفاف',
        icon: '📏',
      },
    ],
  });

  // Fetch created services
  const createdServices = await prisma.service.findMany({
    where: { clinicId: clinic1.id },
  });

  const serviceIds = createdServices.map(s => ({ id: s.id }));

  // Create Branches
  const branch1 = await prisma.branch.create({
    data: {
      clinicId: clinic1.id,
      name: 'فرع عزون',
      address: 'شارع عزون - وسط المدينة',
      phone: '+966 11 2345678',
      latitude: 24.7150,
      longitude: 46.6760,
    },
  });

  const branch2 = await prisma.branch.create({
    data: {
      clinicId: clinic1.id,
      name: 'فرع العصيلة',
      address: 'شارع العصيلة - الحي الشمالي',
      phone: '+966 11 3456789',
      latitude: 24.7350,
      longitude: 46.6900,
    },
  });

  // Create Doctor Users
  const docUser1 = await prisma.user.create({
    data: {
      name: 'د. خالد محمود',
      email: 'dr.khaled@example.com',
      password: 'hashed_password',
      phoneNumber: '+966 50 1111111',
      role: 'DOCTOR',
    },
  });

  const docUser2 = await prisma.user.create({
    data: {
      name: 'د. فاطمة أحمد',
      email: 'dr.fatima@example.com',
      password: 'hashed_password',
      phoneNumber: '+966 50 2222222',
      role: 'DOCTOR',
    },
  });

  const docUser3 = await prisma.user.create({
    data: {
      name: 'د. محمد علي',
      email: 'dr.mohammed@example.com',
      password: 'hashed_password',
      phoneNumber: '+966 50 3333333',
      role: 'DOCTOR',
    },
  });

  // Create Doctors
  const doctor1 = await prisma.doctor.create({
    data: {
      userId: docUser1.id,
      clinicId: clinic1.id,
      branchId: branch1.id,
      specialization: 'طب الأسنان العام',
      bio: 'دكتور متخصص بخبرة 10 سنوات في طب الأسنان',
      yearsOfExperience: 10,
      rating: 4.9,
      reviewCount: 150,
      servicesOffered: {
        connect: serviceIds.slice(0, 3),
      },
    },
  });

  const doctor2 = await prisma.doctor.create({
    data: {
      userId: docUser2.id,
      clinicId: clinic1.id,
      branchId: branch1.id,
      specialization: 'جراحة الفم والأسنان',
      bio: 'متخصصة في جراحة الفم بكفاءة عالية',
      yearsOfExperience: 12,
      rating: 4.8,
      reviewCount: 120,
      servicesOffered: {
        connect: [serviceIds[3], serviceIds[4], serviceIds[5]],
      },
    },
  });

  const doctor3 = await prisma.doctor.create({
    data: {
      userId: docUser3.id,
      clinicId: clinic1.id,
      branchId: branch2.id,
      specialization: 'تقويم الأسنان',
      bio: 'متخصص في تقويم الأسنان والعلاجات التقويمية',
      yearsOfExperience: 8,
      rating: 4.7,
      reviewCount: 100,
      servicesOffered: {
        connect: serviceIds.slice(0, 4),
      },
    },
  });

  // Create Slots for Doctor 1
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const slots1 = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(tomorrow);
    date.setDate(date.getDate() + i);

    const timeRanges = [
      { start: '09:00', end: '09:30' },
      { start: '10:00', end: '10:30' },
      { start: '11:00', end: '11:30' },
      { start: '14:00', end: '14:30' },
      { start: '15:00', end: '15:30' },
      { start: '16:00', end: '16:30' },
      { start: '17:00', end: '17:30' },
    ];

    for (const range of timeRanges) {
      slots1.push({
        doctorId: doctor1.id,
        branchId: branch1.id,
        slotDate: date,
        startTime: range.start,
        endTime: range.end,
      });
    }
  }

  await prisma.slot.createMany({
    data: slots1,
  });

  // Create Slots for Doctor 2
  const slots2 = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(tomorrow);
    date.setDate(date.getDate() + i);

    const timeRanges = [
      { start: '08:00', end: '08:30' },
      { start: '09:00', end: '09:30' },
      { start: '13:00', end: '13:30' },
      { start: '14:00', end: '14:30' },
      { start: '15:30', end: '16:00' },
      { start: '16:30', end: '17:00' },
    ];

    for (const range of timeRanges) {
      slots2.push({
        doctorId: doctor2.id,
        branchId: branch1.id,
        slotDate: date,
        startTime: range.start,
        endTime: range.end,
      });
    }
  }

  await prisma.slot.createMany({
    data: slots2,
  });

  // Create Slots for Doctor 3 (Branch 2)
  const slots3 = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(tomorrow);
    date.setDate(date.getDate() + i);

    const timeRanges = [
      { start: '09:00', end: '09:30' },
      { start: '10:00', end: '10:30' },
      { start: '11:00', end: '11:30' },
      { start: '14:00', end: '14:30' },
      { start: '15:00', end: '15:30' },
    ];

    for (const range of timeRanges) {
      slots3.push({
        doctorId: doctor3.id,
        branchId: branch2.id,
        slotDate: date,
        startTime: range.start,
        endTime: range.end,
      });
    }
  }

  await prisma.slot.createMany({
    data: slots3,
  });

  // Create Patient Users
  await prisma.user.createMany({
    data: [
      {
        name: 'محمد أحمد',
        email: 'patient1@example.com',
        password: 'hashed_password',
        phoneNumber: '+966 50 5555555',
        role: 'PATIENT',
      },
      {
        name: 'فاطمة علي',
        email: 'patient2@example.com',
        password: 'hashed_password',
        phoneNumber: '+966 50 6666666',
        role: 'PATIENT',
      },
    ],
  });

  console.log(`
✅ Database seeded successfully!

Clinic: عيادة عبد اللطيف سليمان للأسنان
├── Branch 1: فرع عزون
│   ├── Dr. خالد محمود (General)
│   └── Dr. فاطمة أحمد (Oral Surgery)
└── Branch 2: فرع العصيلة
    └── Dr. محمد علي (Orthodontics)

Services: 6 (Cleaning, Filling, Whitening, Root Canal, Extraction, Braces)
Slots: ${slots1.length + slots2.length + slots3.length} slots created
Patients: 2 test accounts
  `);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

