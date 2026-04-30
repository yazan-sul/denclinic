-- ============================================
-- PHASE 1: CORE SCHEMA (Full Reference)
-- ============================================
-- This file documents the complete baseline schema.
-- Individual migrations track incremental changes.
-- ============================================

-- Enums

CREATE TYPE "UserRole" AS ENUM ('PATIENT', 'DOCTOR', 'STAFF', 'ADMIN', 'CLINIC_OWNER');
CREATE TYPE "GuardianRelationship" AS ENUM ('SELF', 'PARENT', 'SPOUSE', 'SIBLING', 'CHILD', 'GRANDPARENT', 'OTHER');
CREATE TYPE "AppointmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'RESCHEDULED');
CREATE TYPE "SubscriptionTier" AS ENUM ('BASIC', 'PROFESSIONAL', 'ENTERPRISE');
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING_PAYMENT');
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'BANK_TRANSFER', 'ONLINE_PAYMENT', 'INSURANCE');
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED', 'CANCELLED');

-- ============================================
-- USER & IDENTITY
-- ============================================

CREATE TABLE "User" (
    "id"            SERIAL NOT NULL,
    "phoneNumber"   TEXT NOT NULL,
    "email"         TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "googleId"      TEXT,
    "username"      TEXT,
    "password"      TEXT NOT NULL,
    "name"          TEXT NOT NULL,
    "roles"         "UserRole"[] NOT NULL DEFAULT ARRAY['PATIENT'::"UserRole"],
    "avatar"        TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- ============================================
-- PATIENT PROFILE
-- ============================================

CREATE TABLE "Patient" (
    "id"             SERIAL NOT NULL,
    "userId"         INTEGER NOT NULL,
    "nationalId"     TEXT,
    "dateOfBirth"    TIMESTAMP(3),
    "gender"         TEXT,
    "bloodType"      TEXT,
    "allergies"      TEXT,
    "medicalHistory" TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Patient_userId_key" ON "Patient"("userId");

ALTER TABLE "Patient" ADD CONSTRAINT "Patient_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- PATIENT GUARDIAN (Family)
-- ============================================

CREATE TABLE "PatientGuardian" (
    "id"             SERIAL NOT NULL,
    "guardianUserId" INTEGER NOT NULL,
    "patientId"      INTEGER NOT NULL,
    "relationship"   "GuardianRelationship" NOT NULL,

    CONSTRAINT "PatientGuardian_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PatientGuardian_guardianUserId_patientId_key"
    ON "PatientGuardian"("guardianUserId", "patientId");
CREATE INDEX "PatientGuardian_guardianUserId_idx" ON "PatientGuardian"("guardianUserId");
CREATE INDEX "PatientGuardian_patientId_idx" ON "PatientGuardian"("patientId");

ALTER TABLE "PatientGuardian" ADD CONSTRAINT "PatientGuardian_guardianUserId_fkey"
    FOREIGN KEY ("guardianUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PatientGuardian" ADD CONSTRAINT "PatientGuardian_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- CLINIC & INFRASTRUCTURE
-- ============================================

CREATE TABLE "Clinic" (
    "id"                  SERIAL NOT NULL,
    "ownerId"             INTEGER,
    "name"                TEXT NOT NULL,
    "description"         TEXT,
    "specialty"           TEXT NOT NULL,
    "phone"               TEXT,
    "email"               TEXT,
    "website"             TEXT,
    "logo"                TEXT,
    "images"              TEXT[],
    "rating"              DOUBLE PRECISION NOT NULL DEFAULT 4.5,
    "reviewCount"         INTEGER NOT NULL DEFAULT 0,
    "currentSubscriber"   BOOLEAN NOT NULL DEFAULT false,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clinic_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Clinic_ownerId_key" ON "Clinic"("ownerId");
CREATE UNIQUE INDEX "Clinic_name_key" ON "Clinic"("name");

ALTER TABLE "Clinic" ADD CONSTRAINT "Clinic_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- BRANCH
-- ============================================

CREATE TABLE "Branch" (
    "id"        SERIAL NOT NULL,
    "clinicId"  INTEGER NOT NULL,
    "name"      TEXT NOT NULL,
    "address"   TEXT NOT NULL,
    "phone"     TEXT,
    "latitude"  DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Branch_clinicId_name_key" ON "Branch"("clinicId", "name");
CREATE INDEX "Branch_clinicId_idx" ON "Branch"("clinicId");

ALTER TABLE "Branch" ADD CONSTRAINT "Branch_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- SERVICE
-- ============================================

CREATE TABLE "Service" (
    "id"                SERIAL NOT NULL,
    "clinicId"          INTEGER NOT NULL,
    "name"              TEXT NOT NULL,
    "description"       TEXT,
    "icon"              TEXT,
    "basePrice"         DOUBLE PRECISION,
    "estimatedDuration" INTEGER,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Service_clinicId_name_key" ON "Service"("clinicId", "name");
CREATE INDEX "Service_clinicId_idx" ON "Service"("clinicId");

ALTER TABLE "Service" ADD CONSTRAINT "Service_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- DOCTOR PROFILE
-- ============================================

CREATE TABLE "Doctor" (
    "id"                SERIAL NOT NULL,
    "userId"            INTEGER NOT NULL,
    "clinicId"          INTEGER NOT NULL,
    "branchId"          INTEGER NOT NULL,
    "specialization"    TEXT NOT NULL,
    "bio"               TEXT,
    "avatar"            TEXT,
    "yearsOfExperience" INTEGER,
    "qualifications"    TEXT,
    "rating"            DOUBLE PRECISION NOT NULL DEFAULT 4.5,
    "reviewCount"       INTEGER NOT NULL DEFAULT 0,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Doctor_userId_key" ON "Doctor"("userId");
CREATE UNIQUE INDEX "Doctor_userId_branchId_key" ON "Doctor"("userId", "branchId");
CREATE INDEX "Doctor_clinicId_idx" ON "Doctor"("clinicId");
CREATE INDEX "Doctor_branchId_idx" ON "Doctor"("branchId");

ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Doctor" ADD CONSTRAINT "Doctor_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================================
-- STAFF PROFILE
-- ============================================

CREATE TABLE "Staff" (
    "id"         SERIAL NOT NULL,
    "userId"     INTEGER NOT NULL,
    "clinicId"   INTEGER NOT NULL,
    "branchId"   INTEGER NOT NULL,
    "position"   TEXT NOT NULL,
    "department" TEXT,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Staff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Staff_userId_key" ON "Staff"("userId");
CREATE INDEX "Staff_clinicId_idx" ON "Staff"("clinicId");
CREATE INDEX "Staff_branchId_idx" ON "Staff"("branchId");

ALTER TABLE "Staff" ADD CONSTRAINT "Staff_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Staff" ADD CONSTRAINT "Staff_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Doctor <-> Service (many-to-many)
CREATE TABLE "_DoctorServices" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);
CREATE UNIQUE INDEX "_DoctorServices_AB_unique" ON "_DoctorServices"("A", "B");
CREATE INDEX "_DoctorServices_B_index" ON "_DoctorServices"("B");

-- ============================================
-- SLOTS & APPOINTMENTS
-- ============================================

CREATE TABLE "Slot" (
    "id"          SERIAL NOT NULL,
    "doctorId"    INTEGER NOT NULL,
    "branchId"    INTEGER NOT NULL,
    "slotDate"    TIMESTAMP(3) NOT NULL,
    "startTime"   TEXT NOT NULL,
    "endTime"     TEXT NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"   TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Slot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Slot_doctorId_slotDate_startTime_key" ON "Slot"("doctorId", "slotDate", "startTime");
CREATE INDEX "Slot_doctorId_idx" ON "Slot"("doctorId");
CREATE INDEX "Slot_branchId_idx" ON "Slot"("branchId");
CREATE INDEX "Slot_slotDate_idx" ON "Slot"("slotDate");

ALTER TABLE "Slot" ADD CONSTRAINT "Slot_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Slot" ADD CONSTRAINT "Slot_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Appointment" (
    "id"                 TEXT NOT NULL,
    "patientId"          INTEGER NOT NULL,
    "userId"             INTEGER NOT NULL,
    "bookedForPatientId" INTEGER,
    "clinicId"           INTEGER NOT NULL,
    "branchId"           INTEGER NOT NULL,
    "doctorId"           INTEGER NOT NULL,
    "serviceId"          INTEGER NOT NULL,
    "slotId"             INTEGER,
    "appointmentDate"    TIMESTAMP(3) NOT NULL,
    "appointmentTime"    TEXT NOT NULL,
    "status"             "AppointmentStatus" NOT NULL DEFAULT 'PENDING',
    "notes"              TEXT,
    "reasonForVisit"     TEXT,
    "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"          TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Appointment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Appointment_slotId_key" ON "Appointment"("slotId");
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId");
CREATE INDEX "Appointment_userId_idx" ON "Appointment"("userId");
CREATE INDEX "Appointment_clinicId_idx" ON "Appointment"("clinicId");
CREATE INDEX "Appointment_doctorId_idx" ON "Appointment"("doctorId");
CREATE INDEX "Appointment_appointmentDate_idx" ON "Appointment"("appointmentDate");
CREATE INDEX "Appointment_status_idx" ON "Appointment"("status");

ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_patientId_fkey"
    FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_doctorId_fkey"
    FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_serviceId_fkey"
    FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Appointment" ADD CONSTRAINT "Appointment_slotId_fkey"
    FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- SUBSCRIPTION SYSTEM
-- ============================================

CREATE TABLE "SubscriptionPlan" (
    "id"              SERIAL NOT NULL,
    "tier"            "SubscriptionTier" NOT NULL,
    "name"            TEXT NOT NULL,
    "description"     TEXT,
    "monthlyPrice"    DOUBLE PRECISION NOT NULL,
    "annualPrice"     DOUBLE PRECISION,
    "maxBranches"     INTEGER NOT NULL DEFAULT 1,
    "maxDoctors"      INTEGER NOT NULL DEFAULT 10,
    "maxAppointments" INTEGER,
    "features"        TEXT[],
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubscriptionPlan_tier_key" ON "SubscriptionPlan"("tier");

CREATE TABLE "Subscription" (
    "id"            SERIAL NOT NULL,
    "clinicId"      INTEGER NOT NULL,
    "planId"        INTEGER NOT NULL,
    "startDate"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate"       TIMESTAMP(3) NOT NULL,
    "renewalDate"   TIMESTAMP(3),
    "status"        "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',
    "monthlyBilled" BOOLEAN NOT NULL DEFAULT true,
    "autoRenew"     BOOLEAN NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Subscription_clinicId_key" ON "Subscription"("clinicId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "Subscription_endDate_idx" ON "Subscription"("endDate");

ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey"
    FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================
-- PAYMENT SYSTEM
-- ============================================

CREATE TABLE "Payment" (
    "id"              TEXT NOT NULL,
    "userId"          INTEGER NOT NULL,
    "amount"          DOUBLE PRECISION NOT NULL,
    "currency"        TEXT NOT NULL DEFAULT 'EGP',
    "method"          "PaymentMethod" NOT NULL,
    "status"          "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "appointmentId"   TEXT,
    "subscriptionId"  INTEGER,
    "transactionId"   TEXT,
    "transactionTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "description"     TEXT,
    "receiptUrl"      TEXT,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Payment_appointmentId_key" ON "Payment"("appointmentId");
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");
CREATE INDEX "Payment_status_idx" ON "Payment"("status");
CREATE INDEX "Payment_transactionTime_idx" ON "Payment"("transactionTime");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey"
    FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================
-- RATINGS & REVIEWS
-- ============================================

CREATE TABLE "Rating" (
    "id"        SERIAL NOT NULL,
    "userId"    INTEGER NOT NULL,
    "clinicId"  INTEGER NOT NULL,
    "rating"    DOUBLE PRECISION NOT NULL,
    "comment"   TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Rating_userId_clinicId_key" ON "Rating"("userId", "clinicId");
CREATE INDEX "Rating_clinicId_idx" ON "Rating"("clinicId");
CREATE INDEX "Rating_rating_idx" ON "Rating"("rating");

ALTER TABLE "Rating" ADD CONSTRAINT "Rating_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_clinicId_fkey"
    FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
