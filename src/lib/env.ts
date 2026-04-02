/**
 * Environment variable validation and configuration
 * This file validates that all required environment variables are set at startup
 */

/**
 * Required environment variables
 */
const requiredEnvVars = {
  DATABASE_URL: 'PostgreSQL database connection string',
  NODE_ENV: 'Environment (development, production, or test)',
} as const;

/**
 * Optional environment variables with defaults
 */
const optionalEnvVars = {
  NEXT_PUBLIC_API_URL: {
    default: process.env.NODE_ENV === 'production' 
      ? 'https://api.denclinic.com' 
      : 'http://localhost:3000',
    description: 'Public API URL for frontend',
  },
  GOOGLE_MAPS_API_KEY: {
    default: '',
    description: 'Google Maps API key (optional)',
  },
} as const;

/**
 * Validate that all required environment variables are set
 * Throws an error if any are missing
 */
function validateRequiredEnvVars() {
  const missing: string[] = [];

  for (const [key, description] of Object.entries(requiredEnvVars)) {
    if (!process.env[key]) {
      missing.push(`${key}: ${description}`);
    }
  }

  if (missing.length > 0) {
    const message = `Missing required environment variables:\n${missing.join('\n')}`;
    console.error(message);
    throw new Error(message);
  }
}

/**
 * Get validated environment configuration
 */
export function getEnv() {
  // Only validate once
  if (!globalThis.envValidated) {
    validateRequiredEnvVars();
    globalThis.envValidated = true;
  }

  return {
    // Required
    DATABASE_URL: process.env.DATABASE_URL!,
    NODE_ENV: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',

    // Optional with defaults
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL ||
      optionalEnvVars.NEXT_PUBLIC_API_URL.default,
    GOOGLE_MAPS_API_KEY: process.env.GOOGLE_MAPS_API_KEY || '',

    // Derived
    isDevelopment: process.env.NODE_ENV === 'development',
    isProduction: process.env.NODE_ENV === 'production',
    isTest: process.env.NODE_ENV === 'test',
  };
}

/**
 * Type for environment configuration
 */
export type Env = ReturnType<typeof getEnv>;

// Add global type
declare global {
  var envValidated: boolean | undefined;
}

/**
 * Print environment configuration (for debugging, masks sensitive values)
 */
export function printEnvConfig() {
  const env = getEnv();
  console.log('Environment Configuration:');
  console.log(`  NODE_ENV: ${env.NODE_ENV}`);
  console.log(`  API_URL: ${env.NEXT_PUBLIC_API_URL}`);
  console.log(`  Database: ${env.DATABASE_URL.split('@')[1] || 'configured'}`);
  console.log(`  Google Maps: ${env.GOOGLE_MAPS_API_KEY ? 'configured' : 'not set'}`);
}
