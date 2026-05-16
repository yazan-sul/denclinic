-- CreateEnum
CREATE TYPE "LabOrderStatus" AS ENUM ('DRAFT', 'SENT_TO_LAB', 'UNDER_CONSTRUCTION', 'DELAYED', 'RECEIVED_AT_CLINIC', 'COMPLETED_FITTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ImpressionType" AS ENUM ('PHYSICAL', 'DIGITAL');

-- CreateEnum
CREATE TYPE "WorkCategory" AS ENUM ('FIXED_PROSTHODONTICS', 'REMOVABLE_PROSTHODONTICS', 'ORTHO_APPLIANCES');

-- CreateEnum
CREATE TYPE "WorkType" AS ENUM ('SINGLE_CROWN', 'DENTAL_BRIDGE', 'VENEER_EMAX', 'INLAY_ONLAY', 'IMPLANT_CROWN', 'COMPLETE_DENTURE', 'PARTIAL_ACRYLIC_DENTURE', 'CAST_PARTIAL_DENTURE', 'FLEXIBLE_DENTURE', 'ORTHODONTIC_RETAINER', 'NIGHT_GUARD', 'CLEAR_ALIGNERS', 'STUDY_MODEL');

-- CreateEnum
CREATE TYPE "DentalMaterial" AS ENUM ('ZIRCONIA_SOLID', 'ZIRCONIA_LAYERED', 'EMAX', 'PFM', 'FULL_METAL_GOLD', 'TEMPORARY_ACRYLIC', 'ACRYLIC_RESIN', 'COBALT_CHROMIUM', 'THERMOPLASTIC_FLEXIBLE', 'HARD_ACRYLIC', 'SOFT_EVA');

-- AlterEnum (safe: skips if value already exists)
ALTER TYPE "AppointmentStatus" ADD VALUE IF NOT EXISTS 'IN_PROGRESS';

-- DropForeignKey
ALTER TABLE "LabCase" DROP CONSTRAINT "LabCase_treatmentId_fkey";

-- DropTable
DROP TABLE "LabCase";

-- DropEnum
DROP TYPE "LabCaseStatus";

-- CreateTable
CREATE TABLE "Lab" (
    "id" SERIAL NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "contactPerson" TEXT,
    "email" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lab_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabOrder" (
    "id" TEXT NOT NULL,
    "clinicId" INTEGER NOT NULL,
    "branchId" INTEGER NOT NULL,
    "labId" INTEGER NOT NULL,
    "patientId" INTEGER NOT NULL,
    "doctorId" INTEGER,
    "orderAppointmentId" TEXT,
    "fittingAppointmentId" TEXT,
    "status" "LabOrderStatus" NOT NULL DEFAULT 'DRAFT',
    "impressionType" "ImpressionType" NOT NULL DEFAULT 'PHYSICAL',
    "totalCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "orderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentDate" TIMESTAMP(3),
    "expectedDate" TIMESTAMP(3),
    "receivedDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "notes" TEXT,
    "parentOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabOrderItem" (
    "id" SERIAL NOT NULL,
    "labOrderId" TEXT NOT NULL,
    "category" "WorkCategory" NOT NULL,
    "workType" "WorkType" NOT NULL,
    "toothNumbers" INTEGER[],
    "material" "DentalMaterial",
    "shade" TEXT,
    "stumpShade" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LabOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lab_clinicId_idx" ON "Lab"("clinicId");

-- CreateIndex
CREATE UNIQUE INDEX "Lab_clinicId_name_key" ON "Lab"("clinicId", "name");

-- CreateIndex
CREATE INDEX "LabOrder_clinicId_idx" ON "LabOrder"("clinicId");

-- CreateIndex
CREATE INDEX "LabOrder_branchId_idx" ON "LabOrder"("branchId");

-- CreateIndex
CREATE INDEX "LabOrder_patientId_idx" ON "LabOrder"("patientId");

-- CreateIndex
CREATE INDEX "LabOrder_labId_idx" ON "LabOrder"("labId");

-- CreateIndex
CREATE INDEX "LabOrder_status_idx" ON "LabOrder"("status");

-- CreateIndex
CREATE INDEX "LabOrder_orderAppointmentId_idx" ON "LabOrder"("orderAppointmentId");

-- CreateIndex
CREATE INDEX "LabOrder_fittingAppointmentId_idx" ON "LabOrder"("fittingAppointmentId");

-- CreateIndex
CREATE INDEX "LabOrderItem_labOrderId_idx" ON "LabOrderItem"("labOrderId");

-- AddForeignKey
ALTER TABLE "Lab" ADD CONSTRAINT "Lab_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_labId_fkey" FOREIGN KEY ("labId") REFERENCES "Lab"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_orderAppointmentId_fkey" FOREIGN KEY ("orderAppointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_fittingAppointmentId_fkey" FOREIGN KEY ("fittingAppointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrder" ADD CONSTRAINT "LabOrder_parentOrderId_fkey" FOREIGN KEY ("parentOrderId") REFERENCES "LabOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabOrderItem" ADD CONSTRAINT "LabOrderItem_labOrderId_fkey" FOREIGN KEY ("labOrderId") REFERENCES "LabOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
