-- AlterTable: replace single phone with phones array
ALTER TABLE "Lab" DROP COLUMN "phone",
ADD COLUMN "phones" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
