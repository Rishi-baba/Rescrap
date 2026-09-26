/**
 * API test helpers.
 *
 * The API is exercised with `.inject()` so no socket is ever opened. Each test
 * file gets a fresh app; the shared demo store is reset explicitly because it
 * is deliberately shared (one Lot, all roles - that is the product premise).
 */
import type { FastifyInstance } from 'fastify';
import { resetDemoState, type Role } from '@rescrap/shared';
import { buildApp } from '../src/app.js';
import { loadConfig, type ApiConfig } from '../src/config.js';

export const TEST_CONFIG: ApiConfig = {
  ...loadConfig({ NODE_ENV: 'test' } as NodeJS.ProcessEnv),
  nodeEnv: 'test',
  jwtSecret: 'test-secret-that-is-long-enough-32',
  // Effectively unlimited: these tests assert authorization, not throttling.
  authRateLimit: { max: 10_000, windowMs: 60_000 },
  listRateLimit: { max: 10_000, windowMs: 60_000 },
};

export const COLLECTOR_PHONE = '+919000000001';
export const RECYCLER_PHONE = '+919000000002';
export const ADMIN_PHONE = '+919000000004';
export const OTP = '1234';

export async function makeApp(): Promise<FastifyInstance> {
  resetDemoState();
  const app = await buildApp({ config: TEST_CONFIG });
  await app.ready();
  return app;
}

export function key(): string {
  return `k_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  userId: string;
  role: Role;
}

/** Full OTP handshake over HTTP, returning a usable bearer token. */
export async function signIn(
  app: FastifyInstance,
  phone: string,
  role: Role,
): Promise<Session> {
  const verify = await app.inject({
    method: 'POST',
    url: '/auth/otp/verify',
    payload: { phone, role, code: OTP },
  });
  if (verify.statusCode !== 200) {
    throw new Error(`sign-in failed: ${verify.statusCode} ${verify.body}`);
  }
  const body = verify.json() as {
    data: { accessToken: string; refreshToken: string; user: { id: string; role: Role } };
  };
  return {
    accessToken: body.data.accessToken,
    refreshToken: body.data.refreshToken,
    userId: body.data.user.id,
    role: body.data.user.role,
  };
}

export function auth(session: Session): Record<string, string> {
  return { authorization: `Bearer ${session.accessToken}` };
}

export function lotPayload(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      {
        materialId: 'mat_laptop',
        materialConfirmed: true,
        declaredWeightKg: 12,
        condition: 'GOOD',
        sourceType: 'HOUSEHOLD',
        photoKeys: ['demo://photo/lot-1.jpg'],
      },
    ],
    collectionArea: 'Pune - Hadapsar',
    idempotencyKey: key(),
    ...overrides,
  };
}
