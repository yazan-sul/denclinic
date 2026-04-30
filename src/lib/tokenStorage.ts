// In-memory stores for tokens
// Stored on globalThis to survive Next.js Fast Refresh in development

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

interface SmsOtpEntry {
  otp: string;
  expiresAt: number;
  verified: boolean;
}

interface EmailOtpEntry {
  otp: string;
  expiresAt: number;
}

declare global {
  var _passwordResetTokens: { [key: string]: PasswordResetToken } | undefined;
  var _emailVerificationTokens: { [key: string]: VerificationToken } | undefined;
  var _smsOtpStore: { [phoneNumber: string]: SmsOtpEntry } | undefined;
  var _emailOtpStore: { [email: string]: EmailOtpEntry } | undefined;
  var _verifiedEmailSet: { [email: string]: number } | undefined;
}

globalThis._passwordResetTokens ??= {};
globalThis._emailVerificationTokens ??= {};
globalThis._smsOtpStore ??= {};
globalThis._emailOtpStore ??= {};
globalThis._verifiedEmailSet ??= {};

export const passwordResetTokens = globalThis._passwordResetTokens;
export const emailVerificationTokens = globalThis._emailVerificationTokens;
export const smsOtpStore = globalThis._smsOtpStore;
export const emailOtpStore = globalThis._emailOtpStore;
export const verifiedEmailSet = globalThis._verifiedEmailSet;

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
