/**
 * Fastify bootstrap. Exported as a factory so tests can build an isolated
 * instance with `.inject()` and never open a socket.
 */
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { loadConfig, type ApiConfig } from './config.js';
import { registerAuth } from './plugins/auth.js';
import { createRateLimiter } from './plugins/rate-limit.js';
import { toHttpError } from './lib/errors.js';
import { authRoutes } from './modules/auth/routes.js';
import { collectorRoutes } from './modules/collector/routes.js';
import { recyclerRoutes } from './modules/recycler/routes.js';
import { adminRoutes } from './modules/admin/routes.js';
import { sharedRoutes } from './modules/shared/routes.js';

export interface BuildAppOptions {
  config?: ApiConfig;
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const config = options.config ?? loadConfig();

  const app = Fastify({
    // Rule technical-approach.md 7.4: never leak internals in a reply.
    logger: config.nodeEnv === 'test' ? false : { level: 'info' },
    bodyLimit: 256 * 1024,
    disableRequestLogging: config.nodeEnv === 'test',
  });

  await app.register(cors, {
    origin: config.corsOrigins,
    credentials: false,
  });

  registerAuth(app, config);

  app.setErrorHandler((error, request, reply) => {
    const { status, shape } = toHttpError(error);
    if (status >= 500) {
      request.log.error({ err: error }, 'unhandled error');
    }
    void reply.status(status).send({
      error: shape,
      demo: true,
      at: new Date().toISOString(),
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    void reply.status(404).send({
      error: { code: 'NOT_FOUND', message: 'That endpoint does not exist.' },
      demo: true,
      at: new Date().toISOString(),
    });
  });

  /* --- Health: the only route with no envelope and no demo flag --- */
  app.get('/health', async () => ({
    status: 'ok',
    service: 'rescrap-api',
    demo: true,
    at: new Date().toISOString(),
  }));

  /**
   * Rule HON-01: a machine-readable statement of what is real. Anything a
   * client needs in order to label content correctly is declared here once.
   */
  app.get('/meta', async () => ({
    demo: true,
    reality: {
      recyclers: 'FICTIONAL - no real recycler is authorized',
      recyclerAuthorization: 'FICTIONAL - no regulatory authorization claimed',
      payments: 'SIMULATED - no real money moves',
      prices: 'DEMO REFERENCE PRICES - not real market data',
      materialClassification: 'DETERMINISTIC RULE-BASED - not a trained model',
      valuation: 'DETERMINISTIC FORMULA - an estimate, not a quotation',
      otpDelivery: config.otpDelivery === 'console' ? 'CONSOLE ONLY - no SMS provider' : 'UNAVAILABLE',
      objectStorage: 'LOCAL KEYS - no S3 provider integrated',
      dataStore: 'IN-MEMORY - no PostgreSQL, data is lost on restart',
    },
    lifecycle: 'AUTHORITATIVE - enforced in packages/shared',
    at: new Date().toISOString(),
  }));

  const limiter = createRateLimiter();

  await app.register(authRoutes, { config, limiter });
  await app.register(async (instance) => collectorRoutes(instance, limiter));
  await app.register(async (instance) => recyclerRoutes(instance, limiter));
  await app.register(async (instance) => adminRoutes(instance, limiter));
  await app.register(async (instance) => sharedRoutes(instance, limiter));

  return app;
}
