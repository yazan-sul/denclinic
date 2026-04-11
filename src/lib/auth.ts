import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const PASSWORD_HASH_ITERATIONS = 100000;
const PASSWORD_HASH_ALGORITHM = 'sha256';
const PASSWORD_SALT_LENGTH = 32;

export interface TokenPayload {
  userId: number;
  email: string;
  iat?: number;
  exp?: number;
}

/**
 * Sign a JWT token with HS256 algorithm
 * Token expires in 7 days
 */
export function signToken(payload: TokenPayload): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload = {
    ...payload,
    iat: now,
    exp: now + 7 * 24 * 60 * 60, // 7 days expiry
  };
  
  const body = Buffer.from(JSON.stringify(tokenPayload)).toString('base64url');
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${body}`)
    .digest('base64url');
  
  return `${header}.${body}.${signature}`;
}

/**
 * Verify and decode a JWT token
 * Returns the payload if valid, or null if invalid/expired
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const [headerBase64, bodyBase64, signatureBase64] = parts;
    
    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerBase64}.${bodyBase64}`)
      .digest('base64url');
    
    if (signatureBase64 !== expectedSignature) {
      return null;
    }
    
    // Decode payload
    const payload = JSON.parse(Buffer.from(bodyBase64, 'base64url').toString('utf-8'));
    
    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }
    
    return payload as TokenPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Hash a password using PBKDF2
 * Returns a string in format: "iterations$salt$hash"
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(PASSWORD_SALT_LENGTH).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, PASSWORD_HASH_ITERATIONS, 64, PASSWORD_HASH_ALGORITHM)
    .toString('hex');
  
  return `${PASSWORD_HASH_ITERATIONS}$${salt}$${hash}`;
}

/**
 * Verify a password against a hash
 * Securely compares using timing-safe comparison
 */
export function verifyPassword(password: string, hashedPassword: string): boolean {
  try {
    const parts = hashedPassword.split('$');
    if (parts.length !== 3) {
      return false;
    }

    const [iterationsStr, salt, originalHash] = parts;
    const iterations = parseInt(iterationsStr, 10);

    const hash = crypto
      .pbkdf2Sync(password, salt, iterations, 64, PASSWORD_HASH_ALGORITHM)
      .toString('hex');

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(originalHash));
  } catch (error) {
    return false;
  }
}
