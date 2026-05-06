ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "roles" "UserRole"[] NOT NULL DEFAULT ARRAY['PATIENT']::"UserRole"[];

UPDATE "User"
SET "roles" = ARRAY["role"]::"UserRole"[]
WHERE "role" IS NOT NULL
  AND ("roles" IS NULL OR "roles" = ARRAY['PATIENT']::"UserRole"[]);
