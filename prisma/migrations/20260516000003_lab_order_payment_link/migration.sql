ALTER TABLE "Payment" ADD COLUMN "labOrderId" TEXT;
CREATE UNIQUE INDEX "Payment_labOrderId_key" ON "Payment"("labOrderId");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_labOrderId_fkey"
  FOREIGN KEY ("labOrderId") REFERENCES "LabOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
