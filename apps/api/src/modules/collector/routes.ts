/**
 * Collector routes.
 *
 * Every response is the COLLECTOR PROJECTION of the shared Lot
 * (contract.ts CollectorLotView). The collector never receives recycler
 * financials, other collectors' data, or admin fields (SB-3).
 */
import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import {
  classifyMaterialSchema,
  createLotSchema,
  idempotencyKeySchema,
  submitLotSchema,
  type WeightKg,
} from '@rescrap/shared';
import { envelope } from '../../lib/envelope.js';
import { parse } from '../../lib/parse.js';
import { requireRole, serviceOf } from '../../plugins/auth.js';
import type { RateLimiter } from '../../plugins/rate-limit.js';
import { rateLimit } from '../../plugins/rate-limit.js';

export async function collectorRoutes(
  app: FastifyInstance,
  limiter: RateLimiter,
): Promise<void> {
  const collectorOnly: preHandlerHookHandler[] = [app.requireAuth, requireRole('COLLECTOR')];
  const listLimit = rateLimit(limiter, { max: 120, windowMs: 60_000, bucket: 'list' });

  app.get('/collector/lots', { preHandler: [...collectorOnly, listLimit] }, async (request) => {
    return envelope(await serviceOf(request).listMyLots());
  });

  app.get<{ Params: { lotId: string } }>(
    '/collector/lots/:lotId',
    { preHandler: collectorOnly },
    async (request) => {
      return envelope(await serviceOf(request).getMyLot(request.params.lotId));
    },
  );

  app.post('/collector/lots', { preHandler: collectorOnly }, async (request) => {
    const input = parse(createLotSchema, request.body);
    // Rule SB-9: the server computes the estimate. The client never sends one.
    return envelope(
      await serviceOf(request).createLot({
        collectionArea: input.collectionArea as string,
        idempotencyKey: input.idempotencyKey as string,
        items: input.items.map((item) => ({
          materialId: item.materialId,
          materialConfirmed: item.materialConfirmed,
          declaredWeightKg: item.declaredWeightKg as WeightKg,
          condition: item.condition,
          sourceType: item.sourceType,
          photoKeys: item.photoKeys,
          ...(item.notes ? { notes: item.notes } : {}),
        })),
      }),
    );
  });

  app.post<{ Params: { lotId: string } }>(
    '/collector/lots/:lotId/submit',
    { preHandler: collectorOnly },
    async (request) => {
      const body = (request.body ?? {}) as { idempotencyKey?: unknown };
      const input = parse(submitLotSchema, {
        ...(body as Record<string, unknown>),
        lotId: request.params.lotId,
      });
      return envelope(await serviceOf(request).submitLot(input.lotId, input.idempotencyKey));
    },
  );

  app.get<{ Params: { lotId: string } }>(
    '/collector/lots/:lotId/matches',
    { preHandler: [...collectorOnly, listLimit] },
    async (request) => {
      return envelope(await serviceOf(request).matchRecyclers(request.params.lotId));
    },
  );

  app.post<{ Params: { offerId: string } }>(
    '/collector/offers/:offerId/accept',
    { preHandler: collectorOnly },
    async (request) => {
      const body = (request.body ?? {}) as { idempotencyKey?: unknown };
      const key = requireKey(body.idempotencyKey);
      return envelope(await serviceOf(request).acceptOffer(request.params.offerId, key));
    },
  );

  app.post<{ Params: { offerId: string } }>(
    '/collector/offers/:offerId/decline',
    { preHandler: collectorOnly },
    async (request) => {
      const body = (request.body ?? {}) as { idempotencyKey?: unknown };
      const key = requireKey(body.idempotencyKey);
      return envelope(await serviceOf(request).declineOffer(request.params.offerId, key));
    },
  );

  app.post<{ Params: { handoverId: string } }>(
    '/collector/handovers/:handoverId/verify',
    { preHandler: collectorOnly },
    async (request) => {
      const body = (request.body ?? {}) as { acknowledgeDiscrepancy?: unknown; idempotencyKey?: unknown };
      return envelope(
        await serviceOf(request).verifyHandover(
          request.params.handoverId,
          body.acknowledgeDiscrepancy === true,
          requireKey(body.idempotencyKey),
        ),
      );
    },
  );

  app.get<{ Params: { lotId: string } }>(
    '/collector/lots/:lotId/passport',
    { preHandler: collectorOnly },
    async (request) => {
      return envelope(await serviceOf(request).getPassport(request.params.lotId));
    },
  );

  app.get('/collector/earnings', { preHandler: collectorOnly }, async (request) => {
    return envelope(await serviceOf(request).getEarnings());
  });

  app.get('/collector/notifications', { preHandler: [...collectorOnly, listLimit] }, async (request) => {
    return envelope(await serviceOf(request).listMyNotifications());
  });

  app.post('/collector/classify', { preHandler: collectorOnly }, async (request) => {
    const input = parse(classifyMaterialSchema, request.body);
    return envelope(await serviceOf(request).classifyMaterial({
      keywordHints: input.keywordHints ?? [],
      ...(input.explicitMaterialKey ? { explicitMaterialKey: input.explicitMaterialKey } : {}),
    }));
  });
}

function requireKey(value: unknown): string {
  // Rule FRD-03: the key is mandatory, so a retry without one is rejected
  // rather than silently accepted.
  return parse(idempotencyKeySchema, value);
}
