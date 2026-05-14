-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "TreatmentStatus" AS ENUM ('PLANNED', 'ONGOING', 'COMPLETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "LabCaseStatus" AS ENUM ('PENDING', 'SENT', 'IN_PROGRESS', 'READY', 'DELIVERED', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- CreateTable Treatment
CREATE TABLE IF NOT EXISTS "Treatment" (
    "id"            SERIAL NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "status"        "TreatmentStatus" NOT NULL DEFAULT 'PLANNED',
    "diagnosis"     TEXT,
    "notesPublic"   TEXT,
    "notesInternal" TEXT,
    "cost"          DOUBLE PRECISION,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Treatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable LabCase
CREATE TABLE IF NOT EXISTS "LabCase" (
    "id"           SERIAL NOT NULL,
    "treatmentId"  INTEGER NOT NULL,
    "labName"      TEXT NOT NULL,
    "caseType"     TEXT NOT NULL,
    "status"       "LabCaseStatus" NOT NULL DEFAULT 'PENDING',
    "cost"         DOUBLE PRECISION,
    "sentDate"     TIMESTAMP(3),
    "deliveryDate" TIMESTAMP(3),
    "notesPublic"  TEXT,
    "notesInternal" TEXT,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabCase_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Treatment_appointmentId_idx" ON "Treatment"("appointmentId");
CREATE INDEX IF NOT EXISTS "LabCase_treatmentId_idx" ON "LabCase"("treatmentId");
CREATE INDEX IF NOT EXISTS "LabCase_status_idx" ON "LabCase"("status");

-- AddForeignKey
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_appointmentId_fkey"
    FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LabCase" ADD CONSTRAINT "LabCase_treatmentId_fkey"
    FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
