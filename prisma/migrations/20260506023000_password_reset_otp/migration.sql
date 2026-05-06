CREATE TABLE IF NOT EXISTS "PasswordResetOtp" (
  "id" SERIAL NOT NULL,
  "email" TEXT NOT NULL,
  "otpHash" TEXT NOT NULL,
  "resetTokenHash" TEXT,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "verifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PasswordResetOtp_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PasswordResetOtp_email_idx" ON "PasswordResetOtp"("email");
CREATE INDEX IF NOT EXISTS "PasswordResetOtp_email_createdAt_idx" ON "PasswordResetOtp"("email", "createdAt");
CREATE INDEX IF NOT EXISTS "PasswordResetOtp_expiresAt_idx" ON "PasswordResetOtp"("expiresAt");
CREATE INDEX IF NOT EXISTS "PasswordResetOtp_resetTokenHash_idx" ON "PasswordResetOtp"("resetTokenHash");
