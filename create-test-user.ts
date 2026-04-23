import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { hash } from '@node-rs/argon2';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
const envPath = resolve(__dirname, '.env');
config({ path: envPath });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required');
}

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});
const prisma = new PrismaClient({ adapter });

async function createTestUser() {
  try {
    const password = 'test123456';
    const hashedPassword = await hash(password, {
      memoryCost: 19456,
      timeCost: 2,
      outputLen: 32,
      parallelism: 1,
    });

    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        username: 'testuser',
        phoneNumber: '201000000000',
        name: 'Test User',
        password: hashedPassword,
        role: 'PATIENT',
        emailVerified: true,
        avatar: 'https://i.pravatar.cc/150?img=1',
      },
    });

    console.log('✅ Test user created successfully!');
    console.log('\n📧 Email:', user.email);
    console.log('🔐 Password:', password);
    console.log('\nYou can now login with these credentials at http://localhost:3000/auth/signin');
    
  } catch (error: any) {
    if (error.code === 'P2002') {
      console.log('⚠️  User already exists with email test@example.com');
      console.log('\n📧 Email:', 'test@example.com');
      console.log('🔐 Password:', 'test123456');
      console.log('\nYou can login with these credentials at http://localhost:3000/auth/signin');
    } else {
      console.error('❌ Error creating user:', error.message);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
