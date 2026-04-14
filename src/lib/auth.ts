import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

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
