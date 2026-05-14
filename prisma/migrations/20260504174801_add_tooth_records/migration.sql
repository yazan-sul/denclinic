-- CreateEnum
CREATE TYPE "ToothStatus" AS ENUM ('HEALTHY', 'DECAYED', 'FILLED', 'CROWN', 'MISSING');

-- CreateEnum
CREATE TYPE "ToothSurface" AS ENUM ('MESIAL', 'DISTAL', 'OCCLUSAL', 'BUCCAL', 'LINGUAL');

-- CreateTable
CREATE TABLE "Tooth" (
    "id" SERIAL NOT NULL,
    "patientId" INTEGER NOT NULL,
    "toothNumber" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tooth_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToothRecord" (
    "id" SERIAL NOT NULL,
    "toothId" INTEGER NOT NULL,
    "appointmentId" TEXT,
    "doctorId" INTEGER,
    "status" "ToothStatus" NOT NULL,
    "surfaces" "ToothSurface"[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ToothRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Tooth_patientId_idx" ON "Tooth"("patientId");

-- CreateIndex
CREATE UNIQUE INDEX "Tooth_patientId_toothNumber_key" ON "Tooth"("patientId", "toothNumber");

-- CreateIndex
CREATE INDEX "ToothRecord_toothId_createdAt_idx" ON "ToothRecord"("toothId", "createdAt");

-- CreateIndex
CREATE INDEX "ToothRecord_appointmentId_idx" ON "ToothRecord"("appointmentId");

-- CreateIndex
CREATE INDEX "ToothRecord_doctorId_idx" ON "ToothRecord"("doctorId");

-- AddForeignKey
ALTER TABLE "Tooth" ADD CONSTRAINT "Tooth_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToothRecord" ADD CONSTRAINT "ToothRecord_toothId_fkey" FOREIGN KEY ("toothId") REFERENCES "Tooth"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToothRecord" ADD CONSTRAINT "ToothRecord_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToothRecord" ADD CONSTRAINT "ToothRecord_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
