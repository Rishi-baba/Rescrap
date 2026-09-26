/**
 * Auth routes (SB-1: unauthenticated -> authenticated).
 *
 * OTP issuance and verification are the only unauthenticated business routes.
 * Rate limits here are strict and deliberately separate from list endpoints.
 *
 * The dev OTP code is returned in the response ONLY when
 * RESCRAP_OTP_DELIVERY=console and NODE_ENV is not production. No real SMS
 * provider is integrated (HON-04).
 */
import type { FastifyInstance } from 'fastify';
import {
  DemoReScrapService,
  completeProfileSchema,
  demoSeed,
  otpRequestSchema,
  otpVerifySchema,
} from '@rescrap/shared';
import type { ApiConfig } from '../../config.js';
import { envelope } from '../../lib/envelope.js';
import { ApiHttpError } from '../../lib/errors.js';
import { parse } from '../../lib/parse.js';
import { issueToken } from '../../lib/tokens.js';
import { rateLimit, type RateLimiter } from '../../plugins/rate-limit.js';
import { serviceOf } from '../../plugins/auth.js';

export interface AuthRoutesOptions {
  config: ApiConfig;
  limiter: RateLimiter;
}

export async function authRoutes(app: FastifyInstance, options: AuthRoutesOptions): Promise<void> {
  const { config, limiter } = options;
  const authLimit = rateLimit(limiter, { ...config.authRateLimit, bucket: 'auth' });

  app.post('/auth/otp/request', { preHandler: authLimit }, async (request) => {
    const input = parse(otpRequestSchema, request.body);
    const svc = new DemoReScrapService();
    const result = await svc.requestOtp(input.phone, input.role);

    const devCodeVisible = config.otpDelivery === 'console' && config.nodeEnv !== 'production';
    return envelope({
      sent: result.sent,
      retryAfterSeconds: result.retryAfterSeconds,
      delivery: devCodeVisible ? 'console' : 'unavailable',
      // Rule HON-04: the code appears only as an explicit dev affordance.
      ...(devCodeVisible ? { devCode: result.devCode ?? demoSeed.DEMO_OTP_CODE } : {}),
    });
  });

  app.post('/auth/otp/verify', { preHandler: authLimit }, async (request) => {
    const input = parse(otpVerifySchema, request.body);
    const svc = new DemoReScrapService();
    const session = await svc.verifyOtp(input.phone, input.role, input.code);

    const access = issueToken(
      { sub: session.user.id, role: session.user.role, typ: 'access' },
      config.jwtSecret,
      config.accessTokenTtlSeconds,
    );
    const refresh = issueToken(
      { sub: session.user.id, role: session.user.role, typ: 'refresh' },
      config.jwtSecret,
      config.refreshTokenTtlSeconds,
    );

    return envelope({
      accessToken: access.token,
      refreshToken: refresh.token,
      expiresInSeconds: access.expiresInSeconds,
      user: session.user,
      ...(session.collector ? { collector: session.collector } : {}),
      ...(session.recycler ? { recycler: session.recycler } : {}),
      demo: true,
    });
  });

  app.post('/auth/refresh', async (request) => {
    const body = (request.body ?? {}) as { refreshToken?: unknown };
    if (typeof body.refreshToken !== 'string' || body.refreshToken.length === 0) {
      throw new ApiHttpError(400, { code: 'INVALID_INPUT', message: 'A refresh token is required.' });
    }
    const svc = new DemoReScrapService();
    const session = await svc.refresh(body.refreshToken);
    if (!session) {
      throw new ApiHttpError(401, { code: 'INVALID_TOKEN', message: 'Please sign in again.' });
    }

    // Rotating refresh: a fresh pair every time.
    const access = issueToken(
      { sub: session.user.id, role: session.user.role, typ: 'access' },
      config.jwtSecret,
      config.accessTokenTtlSeconds,
    );
    const refresh = issueToken(
      { sub: session.user.id, role: session.user.role, typ: 'refresh' },
      config.jwtSecret,
      config.refreshTokenTtlSeconds,
    );
    return envelope({
      accessToken: access.token,
      refreshToken: refresh.token,
      expiresInSeconds: access.expiresInSeconds,
      user: session.user,
      demo: true,
    });
  });

  app.post(
    '/auth/logout',
    { preHandler: app.requireAuth },
    async (request) => {
      await serviceOf(request).logout();
      return envelope({ ok: true });
    },
  );

  app.get(
    '/auth/me',
    { preHandler: app.requireAuth },
    async (request) => {
      const session = await serviceOf(request).currentUser();
      if (!session) {
        throw new ApiHttpError(401, { code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' });
      }
      return envelope({
        user: session.user,
        ...(session.collector ? { collector: session.collector } : {}),
        ...(session.recycler ? { recycler: session.recycler } : {}),
        demo: true,
      });
    },
  );

  app.post(
    '/auth/profile',
    { preHandler: app.requireAuth },
    async (request) => {
      const input = parse(completeProfileSchema, request.body);
      const session = await serviceOf(request).completeProfile(input);
      return envelope({ user: session.user, demo: true });
    },
  );
}
