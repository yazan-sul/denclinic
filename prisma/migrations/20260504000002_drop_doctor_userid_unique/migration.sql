-- Drop old single-userId unique constraints on Doctor and Staff
-- Users can now have profiles in multiple clinics/branches
DROP INDEX IF EXISTS "Doctor_userId_key";
DROP INDEX IF EXISTS "Staff_userId_key";
