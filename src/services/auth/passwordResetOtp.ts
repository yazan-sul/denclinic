import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 3;
const RESET_SECRET =
  process.env.PASSWORD_RESET_SECRET ||
  process.env.JWT_SECRET ||
  'dev-password-reset-secret-change-in-production';

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

declare global {
  var _passwordResetRateLimit: Record<string, RateLimitEntry> | undefined;
}

globalThis._passwordResetRateLimit ??= {};

const rateLimitStore = globalThis._passwordResetRateLimit!;

export function normalizePasswordResetEmail(email: string) {
  return email.trim().toLowerCase();
}

export function generatePasswordResetOtp() {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
}

export function consumePasswordResetRateLimit(email: string, ipAddress: string | null) {
  const now = Date.now();
  const key = `${normalizePasswordResetEmail(email)}:${ipAddress || 'unknown'}`;
  const entry = rateLimitStore[key];

  if (!entry || entry.resetAt <= now) {
    rateLimitStore[key] = {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
    return { limited: false, retryAfterSeconds: 0 };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      limited: true,
      retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count += 1;
  return { limited: false, retryAfterSeconds: 0 };
}

function hashValue(value: string) {
  return crypto.createHmac('sha256', RESET_SECRET).update(value).digest('hex');
}

function timingSafeEqualHex(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'hex');
  const rightBuffer = Buffer.from(right, 'hex');

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function hashOtp(email: string, otp: string) {
  return hashValue(`otp:${normalizePasswordResetEmail(email)}:${otp}`);
}

function hashResetToken(resetToken: string) {
  return hashValue(`reset-token:${resetToken}`);
}

export async function createPasswordResetOtp(email: string, otp: string) {
  const normalizedEmail = normalizePasswordResetEmail(email);

  await prisma.passwordResetOtp.deleteMany({
    where: {
      email: normalizedEmail,
      expiresAt: { lt: new Date() },
    },
  });

  return prisma.passwordResetOtp.create({
    data: {
      email: normalizedEmail,
      otpHash: hashOtp(normalizedEmail, otp),
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MS),
    },
    select: { id: true },
  });
}

export async function verifyPasswordResetOtp(email: string, otp: string) {
  const normalizedEmail = normalizePasswordResetEmail(email);
  const record = await prisma.passwordResetOtp.findFirst({
    where: {
      email: normalizedEmail,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      otpHash: true,
      attempts: true,
    },
  });

  if (!record) {
    return { ok: false as const, status: 400, message: 'Invalid or expired verification code.' };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return { ok: false as const, status: 429, message: 'Too many attempts. Request a new code.' };
  }

  const incomingHash = hashOtp(normalizedEmail, otp);
  const isValid = timingSafeEqualHex(incomingHash, record.otpHash);

  if (!isValid) {
    await prisma.passwordResetOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
      select: { id: true },
    });

    return { ok: false as const, status: 400, message: 'Invalid verification code.' };
  }

  const resetToken = crypto.randomBytes(32).toString('hex');

  await prisma.passwordResetOtp.update({
    where: { id: record.id },
    data: {
      resetTokenHash: hashResetToken(resetToken),
      verifiedAt: new Date(),
    },
    select: { id: true },
  });

  return { ok: true as const, resetToken };
}

export async function findValidPasswordResetToken(email: string, resetToken: string) {
  const normalizedEmail = normalizePasswordResetEmail(email);

  return prisma.passwordResetOtp.findFirst({
    where: {
      email: normalizedEmail,
      resetTokenHash: hashResetToken(resetToken),
      verifiedAt: { not: null },
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      email: true,
    },
  });
}

export async function deletePasswordResetOtps(email: string) {
  return prisma.passwordResetOtp.deleteMany({
    where: { email: normalizePasswordResetEmail(email) },
  });
}
