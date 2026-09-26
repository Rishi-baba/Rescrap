/**
 * Shared / catalogue routes.
 *
 * Read-only catalogue data plus the offline sync endpoint. Rule SB-10: the
 * outbox replay path is the only way an offline client writes, and it is
 * idempotent by construction.
 */
import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import { syncBatchSchema } from '@rescrap/shared';
import { envelope } from '../../lib/envelope.js';
import { parse } from '../../lib/parse.js';
import { serviceOf } from '../../plugins/auth.js';
import { rateLimit, type RateLimiter } from '../../plugins/rate-limit.js';

export async function sharedRoutes(app: FastifyInstance, limiter: RateLimiter): Promise<void> {
  const anyRole: preHandlerHookHandler[] = [app.requireAuth];
  const listLimit = rateLimit(limiter, { max: 180, windowMs: 60_000, bucket: 'list' });

  /* --- Catalogue: readable by any signed-in role --- */

  app.get('/materials/categories', { preHandler: [...anyRole, listLimit] }, async (request) => {
    return envelope(await serviceOf(request).listMaterialCategories());
  });

  app.get('/materials', { preHandler: [...anyRole, listLimit] }, async (request) => {
    return envelope(await serviceOf(request).listMaterials());
  });

  app.get<{ Params: { materialId: string } }>(
    '/materials/:materialId/safety',
    { preHandler: anyRole },
    async (request) => {
      return envelope(await serviceOf(request).getSafetyContent(request.params.materialId));
    },
  );

  app.get('/prices/board', { preHandler: [...anyRole, listLimit] }, async (request) => {
    const query = (request.query ?? {}) as { area?: string };
    const area = typeof query.area === 'string' && query.area.trim() ? query.area.trim() : 'all';
    return envelope(await serviceOf(request).priceBoard(area));
  });

  app.get<{ Params: { materialId: string } }>(
    '/prices/:materialId/history',
    { preHandler: anyRole },
    async (request) => {
      return envelope(await serviceOf(request).priceHistory(request.params.materialId));
    },
  );

  /* --- Cross-role reads --- */

  app.get<{ Params: { lotId: string } }>(
    '/lots/:lotId/traceability',
    { preHandler: [...anyRole, listLimit] },
    async (request) => {
      return envelope(await serviceOf(request).listTraceability(request.params.lotId));
    },
  );

  app.get<{ Params: { handoverId: string } }>(
    '/handovers/:handoverId',
    { preHandler: anyRole },
    async (request) => {
      return envelope(await serviceOf(request).getHandover(request.params.handoverId));
    },
  );

  /* --- Offline sync (SB-10) --- */

  app.post('/sync', { preHandler: anyRole }, async (request) => {
    const input = parse(syncBatchSchema, request.body);
    return envelope(await serviceOf(request).syncBatch(input.operations));
  });
}
