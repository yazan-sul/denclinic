ALTER TABLE "LabOrder"
  ALTER COLUMN "totalCost"    TYPE DOUBLE PRECISION USING "totalCost"::double precision,
  ALTER COLUMN "patientPrice" TYPE DOUBLE PRECISION USING "patientPrice"::double precision;
