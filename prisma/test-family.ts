import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env') });

import crypto from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha256').toString('hex');
  return `100000$${salt}$${hash}`;
}

function encryptUsername(username: string): string {
  const key = crypto.scryptSync(
    process.env.USERNAME_ENCRYPTION_KEY || 'username-enc-key-change-in-prod',
    'denclinic-username-salt',
    32
  );
  const iv = Buffer.alloc(16, 0);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  return cipher.update(username.toLowerCase(), 'utf8', 'hex') + cipher.final('hex');
}

async function main() {
  // Adult user (full account)
  const adult = await prisma.user.upsert({
    where: { username: encryptUsername('test_adult') },
    update: {},
    create: {
      name: 'محمد أحمد خالد الطيب',
      username: encryptUsername('test_adult'),
      password: hashPassword('Test@1234'),
      phoneNumber: '+970591111111',
      patient: {
        create: {
          nationalId: 'ID-ADULT-001',
          dateOfBirth: new Date('1990-05-15'),
          gender: 'male',
          bloodType: 'O+',
        },
      },
    },
    include: { patient: true },
  });

  // Minor patient (file only — no real account)
  let minor = await prisma.user.findFirst({
    where: { patient: { nationalId: 'ID-MINOR-001' } },
    include: { patient: true },
  });

  if (!minor) {
    minor = await prisma.user.create({
      data: {
        name: 'سارة محمد خالد الطيب',
        username: null,
        password: '',
        phoneNumber: '+970592222222',
        patient: {
          create: {
            nationalId: 'ID-MINOR-001',
            dateOfBirth: new Date('2015-03-20'),
            gender: 'female',
            bloodType: 'A+',
          },
        },
      },
      include: { patient: true },
    });
  }

  console.log('\n✅ Adult user created:');
  console.log('  Username : test_adult');
  console.log('  Password : Test@1234');
  console.log('  National ID:', adult.patient?.nationalId);

  console.log('\n👶 Minor patient file created:');
  console.log('  Name     :', minor.name);
  console.log('  National ID:', minor.patient?.nationalId);
  console.log('  DOB      : 2015-03-20 (عمر ~11 سنة)');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());