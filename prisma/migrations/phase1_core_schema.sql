-- ============================================
-- PHASE 1: CLINIC MANAGEMENT SYSTEM - CORE SCHEMA
-- ============================================

-- 1. CREATE ENUMS
CREATE TYPE "UserRole" AS ENUM ('PATIENT', 'DOCTOR', 'STAFF', 'ADMIN', 'CLINIC_OWNER');
CREATE TYPE "GuardianRelationship" AS ENUM ('SELF', 'PARENT', 'SPOUSE', 'SIBLING', 'CHILD', 'GRANDPARENT', 'OTHER');
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'RESCHEDULED');
CREATE TYPE "SubscriptionTier" AS ENUM ('BASIC', 'PROFESSIONAL', 'ENTERPRISE');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING_PAYMENT');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE_PAYMENT', 'INSURANCE');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');

-- ============================================
-- 2. USER & IDENTITY MANAGEMENT TABLES
-- ============================================

CREATE TABLE "User" (
  "id" SERIAL PRIMARY KEY,
  "phoneNumber" VARCHAR(255) UNIQUE NOT NULL,
  "email" VARCHAR(255) UNIQUE,
  "password" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "role" "UserRole" DEFAULT 'PATIENT' NOT NULL,
  "avatar" TEXT,
  "clinicId" INTEGER,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "Patient" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER UNIQUE NOT NULL,
  "dateOfBirth" TIMESTAMP,
  "gender" VARCHAR(50),
  "bloodType" VARCHAR(10),
  "allergies" TEXT,
  "medicalHistory" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE
);

CREATE TABLE "PatientGuardian" (
  "id" SERIAL PRIMARY KEY,
  "guardianUserId" INTEGER NOT NULL,
  "patientId" INTEGER NOT NULL,
  "relationship" "GuardianRelationship" NOT NULL,
  "canBook" BOOLEAN DEFAULT true NOT NULL,
  "canView" BOOLEAN DEFAULT true NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE("guardianUserId", "patientId"),
  FOREIGN KEY ("guardianUserId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_PatientGuardian_guardianUserId" ON "PatientGuardian"("guardianUserId");
CREATE INDEX "idx_PatientGuardian_patientId" ON "PatientGuardian"("patientId");

-- ============================================
-- 3. CLINIC & INFRASTRUCTURE TABLES
-- ============================================

CREATE TABLE "SubscriptionPlan" (
  "id" SERIAL PRIMARY KEY,
  "tier" "SubscriptionTier" UNIQUE NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "monthlyPrice" NUMERIC NOT NULL,
  "annualPrice" NUMERIC,
  "maxBranches" INTEGER DEFAULT 1 NOT NULL,
  "maxDoctors" INTEGER DEFAULT 10 NOT NULL,
  "maxAppointments" INTEGER,
  "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE TABLE "Subscription" (
  "id" SERIAL PRIMARY KEY,
  "clinicId" INTEGER NOT NULL,
  "planId" INTEGER NOT NULL,
  "startDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "endDate" TIMESTAMP NOT NULL,
  "renewalDate" TIMESTAMP,
  "status" "SubscriptionStatus" DEFAULT 'ACTIVE' NOT NULL,
  "monthlyBilled" BOOLEAN DEFAULT true NOT NULL,
  "autoRenew" BOOLEAN DEFAULT true NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE("clinicId"),
  FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT
);

CREATE INDEX "idx_Subscription_status" ON "Subscription"("status");
CREATE INDEX "idx_Subscription_endDate" ON "Subscription"("endDate");

CREATE TABLE "Clinic" (
  "id" SERIAL PRIMARY KEY,
  "ownerId" INTEGER UNIQUE,
  "name" VARCHAR(255) UNIQUE NOT NULL,
  "description" TEXT,
  "specialty" VARCHAR(255) NOT NULL,
  "phone" VARCHAR(20),
  "email" VARCHAR(255),
  "website" VARCHAR(255),
  "logo" TEXT,
  "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "rating" NUMERIC DEFAULT 4.5 NOT NULL,
  "reviewCount" INTEGER DEFAULT 0 NOT NULL,
  "currentSubscriber" BOOLEAN DEFAULT false NOT NULL,
  "subscriptionId" INTEGER,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL,
  FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id")
);

CREATE INDEX "idx_Clinic_subscriptionId" ON "Clinic"("subscriptionId");

CREATE TABLE "Branch" (
  "id" SERIAL PRIMARY KEY,
  "clinicId" INTEGER NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "address" TEXT NOT NULL,
  "phone" VARCHAR(20),
  "latitude" NUMERIC NOT NULL,
  "longitude" NUMERIC NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE("clinicId", "name"),
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_Branch_clinicId" ON "Branch"("clinicId");

CREATE TABLE "Service" (
  "id" SERIAL PRIMARY KEY,
  "clinicId" INTEGER NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "icon" VARCHAR(255),
  "basePrice" NUMERIC,
  "estimatedDuration" INTEGER,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE("clinicId", "name"),
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_Service_clinicId" ON "Service"("clinicId");

-- ============================================
-- 4. DOCTOR & SCHEDULING TABLES
-- ============================================

CREATE TABLE "Doctor" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER UNIQUE NOT NULL,
  "clinicId" INTEGER NOT NULL,
  "branchId" INTEGER NOT NULL,
  "specialization" VARCHAR(255) NOT NULL,
  "bio" TEXT,
  "avatar" TEXT,
  "yearsOfExperience" INTEGER,
  "qualifications" TEXT,
  "rating" NUMERIC DEFAULT 4.5 NOT NULL,
  "reviewCount" INTEGER DEFAULT 0 NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE("userId", "branchId"),
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE,
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_Doctor_clinicId" ON "Doctor"("clinicId");
CREATE INDEX "idx_Doctor_branchId" ON "Doctor"("branchId");

-- Many-to-Many: Doctor Services
CREATE TABLE "_DoctorServices" (
  "A" INTEGER NOT NULL,
  "B" INTEGER NOT NULL,
  UNIQUE("A", "B"),
  FOREIGN KEY ("A") REFERENCES "Doctor"("id") ON DELETE CASCADE,
  FOREIGN KEY ("B") REFERENCES "Service"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_DoctorServices_A" ON "_DoctorServices"("A");
CREATE INDEX "idx_DoctorServices_B" ON "_DoctorServices"("B");

CREATE TABLE "Slot" (
  "id" SERIAL PRIMARY KEY,
  "doctorId" INTEGER NOT NULL,
  "branchId" INTEGER NOT NULL,
  "slotDate" TIMESTAMP NOT NULL,
  "startTime" VARCHAR(5) NOT NULL,
  "endTime" VARCHAR(5) NOT NULL,
  "isAvailable" BOOLEAN DEFAULT true NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE("doctorId", "slotDate", "startTime"),
  FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE,
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_Slot_doctorId" ON "Slot"("doctorId");
CREATE INDEX "idx_Slot_branchId" ON "Slot"("branchId");
CREATE INDEX "idx_Slot_slotDate" ON "Slot"("slotDate");

-- ============================================
-- 5. APPOINTMENT TABLE
-- ============================================

CREATE TABLE "Appointment" (
  "id" VARCHAR(255) PRIMARY KEY,
  "patientId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "bookedForPatientId" INTEGER,
  "clinicId" INTEGER NOT NULL,
  "branchId" INTEGER NOT NULL,
  "doctorId" INTEGER NOT NULL,
  "serviceId" INTEGER NOT NULL,
  "slotId" INTEGER UNIQUE,
  "appointmentDate" TIMESTAMP NOT NULL,
  "appointmentTime" VARCHAR(5) NOT NULL,
  "status" "AppointmentStatus" DEFAULT 'PENDING' NOT NULL,
  "notes" TEXT,
  "reasonForVisit" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE,
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE,
  FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE,
  FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE,
  FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE SET NULL
);

CREATE INDEX "idx_Appointment_patientId" ON "Appointment"("patientId");
CREATE INDEX "idx_Appointment_userId" ON "Appointment"("userId");
CREATE INDEX "idx_Appointment_clinicId" ON "Appointment"("clinicId");
CREATE INDEX "idx_Appointment_doctorId" ON "Appointment"("doctorId");
CREATE INDEX "idx_Appointment_appointmentDate" ON "Appointment"("appointmentDate");
CREATE INDEX "idx_Appointment_status" ON "Appointment"("status");

-- ============================================
-- 6. PAYMENT TABLE
-- ============================================

CREATE TABLE "Payment" (
  "id" VARCHAR(255) PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "amount" NUMERIC NOT NULL,
  "currency" VARCHAR(10) DEFAULT 'EGP' NOT NULL,
  "method" "PaymentMethod" NOT NULL,
  "status" "PaymentStatus" DEFAULT 'PENDING' NOT NULL,
  "appointmentId" VARCHAR(255),
  "subscriptionId" INTEGER,
  "transactionId" VARCHAR(255),
  "transactionTime" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "description" TEXT,
  "receiptUrl" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL,
  FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL
);

CREATE INDEX "idx_Payment_userId" ON "Payment"("userId");
CREATE INDEX "idx_Payment_status" ON "Payment"("status");
CREATE INDEX "idx_Payment_transactionTime" ON "Payment"("transactionTime");

-- ============================================
-- 7. RATING TABLE
-- ============================================

CREATE TABLE "Rating" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "clinicId" INTEGER NOT NULL,
  "rating" NUMERIC NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  UNIQUE("userId", "clinicId"),
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE,
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE
);

CREATE INDEX "idx_Rating_clinicId" ON "Rating"("clinicId");
CREATE INDEX "idx_Rating_rating" ON "Rating"("rating");

-- ============================================
-- 8. FOREIGN KEY FOR USER.clinicId
-- ============================================

ALTER TABLE "User" ADD CONSTRAINT "fk_User_clinicId" 
  FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE SET NULL;

CREATE INDEX "idx_User_clinicId" ON "User"("clinicId");
CREATE INDEX "idx_User_role" ON "User"("role");
