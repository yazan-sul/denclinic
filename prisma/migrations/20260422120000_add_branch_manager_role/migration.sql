-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'BRANCH_MANAGER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "managedBranchId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_managedBranchId_key" ON "User"("managedBranchId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'User_managedBranchId_fkey'
  ) THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_managedBranchId_fkey" FOREIGN KEY ("managedBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
