-- Add unique constraint to Patient.nationalId
CREATE UNIQUE INDEX IF NOT EXISTS "Patient_nationalId_key" ON "Patient"("nationalId");
