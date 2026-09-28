/**
 * API configuration. Secrets come from the environment only, never from a file
 * in the repository (workflow-and-security.md 5).
 *
 * Nothing here is a real credential. RESCRAP_JWT_SECRET has a development
 * fallback that is refused when NODE_ENV=production.
 */
import { z } from 'zod';

const DEV_ONLY_SECRET = 'dev-only-insecure-secret-do-not-use-in-production';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  RESCRAP_JWT_SECRET: z.string().min(16).default(DEV_ONLY_SECRET),
  RESCRAP_OTP_DELIVERY: z.enum(['console', 'disabled']).default('console'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(2_592_000),
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175,http://127.0.0.1:5176'),
  /** Auth rate limit. Rule F-12 / workflow-and-security.md 5. */
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),
  AUTH_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  /** List endpoints get a looser budget. */
  LIST_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  LIST_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),

  /** Production Cloud Services (Optional) */
  MONGODB_URI: z.string().optional(),
  SMS_PROVIDER_API_KEY: z.string().optional(),
  S3_BUCKET_NAME: z.string().optional(),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  GOOGLE_MAPS_API_KEY: z.string().optional(),
});

export type ApiConfig = {
  nodeEnv: 'development' | 'test' | 'production';
  host: string;
  port: number;
  jwtSecret: string;
  otpDelivery: 'console' | 'disabled';
  accessTokenTtlSeconds: number;
  refreshTokenTtlSeconds: number;
  corsOrigins: string[];
  authRateLimit: { max: number; windowMs: number };
  listRateLimit: { max: number; windowMs: number };
  /**
   * Every response carries this. Rule HON-01: until a real store, a real SMS
   * provider and real recyclers exist, the API must never imply otherwise.
   */
  demoMode: true;
};

export function loadConfig(source: NodeJS.ProcessEnv = process.env): ApiConfig {
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid API configuration - ${detail}`);
  }
  const env = parsed.data;

  if (env.NODE_ENV === 'production' && env.RESCRAP_JWT_SECRET === DEV_ONLY_SECRET) {
    throw new Error(
      'RESCRAP_JWT_SECRET must be set to a real secret when NODE_ENV=production. ' +
        'The development fallback is refused in production.',
    );
  }

  return {
    nodeEnv: env.NODE_ENV,
    host: env.API_HOST,
    port: env.API_PORT,
    jwtSecret: env.RESCRAP_JWT_SECRET,
    otpDelivery: env.RESCRAP_OTP_DELIVERY,
    accessTokenTtlSeconds: env.ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlSeconds: env.REFRESH_TOKEN_TTL_SECONDS,
    corsOrigins: env.CORS_ORIGIN.split(',')
      .map((o) => o.trim())
      .filter(Boolean),
    authRateLimit: { max: env.AUTH_RATE_LIMIT_MAX, windowMs: env.AUTH_RATE_LIMIT_WINDOW_MS },
    listRateLimit: { max: env.LIST_RATE_LIMIT_MAX, windowMs: env.LIST_RATE_LIMIT_WINDOW_MS },
    demoMode: true,
  };
}
