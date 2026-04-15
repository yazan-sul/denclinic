// In-memory stores for tokens
// In production, store these in a database with expiry

interface PasswordResetToken {
  userId: number;
  email: string;
  expiresAt: number;
}

interface VerificationToken {
  userId: number;
  email: string;
  expiresAt: number;
}

export const passwordResetTokens: { [key: string]: PasswordResetToken } = {};
export const emailVerificationTokens: { [key: string]: VerificationToken } = {};

// SMS OTP store: key = phoneNumber, value = { otp, expiresAt, verified }
interface SmsOtpEntry {
  otp: string;
  expiresAt: number;
  verified: boolean;
}
export const smsOtpStore: { [phoneNumber: string]: SmsOtpEntry } = {};

// Utility function to clean up expired tokens
export function cleanupExpiredTokens() {
  const now = Date.now();

  // Cleanup password reset tokens
  Object.keys(passwordResetTokens).forEach((token) => {
    if (passwordResetTokens[token].expiresAt < now) {
      delete passwordResetTokens[token];
    }
  });

  // Cleanup email verification tokens
  Object.keys(emailVerificationTokens).forEach((token) => {
    if (emailVerificationTokens[token].expiresAt < now) {
      delete emailVerificationTokens[token];
    }
  });

  // Cleanup SMS OTP entries
  Object.keys(smsOtpStore).forEach((phone) => {
    if (smsOtpStore[phone].expiresAt < now) {
      delete smsOtpStore[phone];
    }
  });
}
