/**
 * Recycler routes.
 *
 * Responses are the RECYCLER PROJECTION. Rule SB-3/SB-4: a recycler sees the
 * collection AREA rather than precise coordinates, and never the collector's
 * name - RecyclerLotView.collectorName is typed `never` for exactly this
 * reason, so the omission is enforced by the compiler, not by discipline.
 */
import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import { z } from 'zod';
import {
  createOfferSchema,
  executeHandoverSchema,
  idempotencyKeySchema,
  money,
  scheduleHandoverSchema,
  type Coordinates,
  type WeightKg,
} from '@rescrap/shared';
import { envelope } from '../../lib/envelope.js';
import { parse } from '../../lib/parse.js';
import { requireRole, serviceOf } from '../../plugins/auth.js';
import { rateLimit, type RateLimiter } from '../../plugins/rate-limit.js';

export async function recyclerRoutes(
  app: FastifyInstance,
  limiter: RateLimiter,
): Promise<void> {
  const recyclerOnly: preHandlerHookHandler[] = [app.requireAuth, requireRole('RECYCLER')];
  const listLimit = rateLimit(limiter, { max: 120, windowMs: 60_000, bucket: 'list' });

  app.get('/recycler/dashboard', { preHandler: recyclerOnly }, async (request) => {
    const svc = serviceOf(request);
    const dashboard = await svc.recyclerDashboard();
    const lots = await svc.listAvailableLots({});
    const recentMatchingLots = lots.map((l) => ({
      id: l.id,
      materialName: l.items[0]?.materialLabel.en ?? 'E-Waste Material',
      categoryName: 'Electronics',
      declaredWeightKg: l.totalWeightKg,
      condition: l.items[0]?.condition ?? 'GOOD',
      collectionArea: l.collectionArea,
      estimatedValuePaise: l.estimatedValue as unknown as number,
      photoKeys: l.items[0]?.photoKeys ?? [],
      createdAt: l.createdAt,
      status: l.state,
    }));

    return envelope({
      ...dashboard,
      completedThisMonthCount: dashboard.completedCount,
      acceptanceRatePercent: dashboard.acceptanceRate,
      recentMatchingLots,
    });
  });

  app.get('/recycler/lots', { preHandler: [...recyclerOnly, listLimit] }, async (request) => {
    const query = (request.query ?? {}) as {
      materialCategoryId?: string;
      area?: string;
      minWeightKg?: string;
      maxWeightKg?: string;
    };
    const filters = parse(listQuerySchema, query);
    return envelope(await serviceOf(request).listAvailableLots(filters));
  });

  app.get<{ Params: { lotId: string } }>(
    '/recycler/lots/:lotId',
    { preHandler: recyclerOnly },
    async (request) => {
      return envelope(await serviceOf(request).getRecyclerLot(request.params.lotId));
    },
  );

  app.post('/recycler/offers', { preHandler: recyclerOnly }, async (request) => {
    const input = parse(createOfferSchema, request.body);
    // Rule OFFER-04: the justification requirement is enforced in the service,
    // which is the only layer that knows the estimate.
    return envelope(
      await serviceOf(request).makeOffer({
        lotId: input.lotId as string,
        amount: money(input.amount),
        validUntil: input.validUntil as string,
        idempotencyKey: input.idempotencyKey as string,
        ...(input.message ? { message: input.message } : {}),
        ...(input.justification ? { justification: input.justification } : {}),
      }),
    );
  });

  app.get('/recycler/offers', { preHandler: [...recyclerOnly, listLimit] }, async (request) => {
    return envelope(await serviceOf(request).listMyOffers());
  });

  app.post('/recycler/handovers/schedule', { preHandler: recyclerOnly }, async (request) => {
    const input = parse(scheduleHandoverSchema, request.body);
    return envelope(
      await serviceOf(request).schedulePickup(
        input.lotId as string,
        input.scheduledFor as string,
        input.idempotencyKey as string,
      ),
    );
  });

  app.post('/recycler/handovers/execute', { preHandler: recyclerOnly }, async (request) => {
    const input = parse(executeHandoverSchema, request.body);
    return envelope(
      await serviceOf(request).executeHandover({
        handoverId: input.handoverId as string,
        finalWeightKg: input.finalWeightKg as WeightKg,
        photoKeys: input.photoKeys as string[],
        location: input.location as Coordinates,
        idempotencyKey: input.idempotencyKey as string,
      }),
    );
  });

  app.post<{ Params: { handoverId: string } }>(
    '/recycler/handovers/:handoverId/confirm',
    { preHandler: recyclerOnly },
    async (request) => {
      const body = (request.body ?? {}) as { idempotencyKey?: unknown };
      const key = parse(idempotencyKeySchema, body.idempotencyKey);
      return envelope(await serviceOf(request).confirmHandover(request.params.handoverId, key));
    },
  );

  app.get('/recycler/profile', { preHandler: recyclerOnly }, async (request) => {
    const r = await serviceOf(request).getMyRecyclerProfile();
    return envelope({
      id: r.id,
      businessName: r.businessName,
      verificationStatus: r.authorizationStatus,
      authorizedMaterials: (r.acceptedCategoryIds ?? []).map((catId) => {
        if (catId === 'cat_ewaste_computing') return 'Computing & IT Equipment';
        if (catId === 'cat_ewaste_telecom') return 'Telecom & Smartphones';
        if (catId === 'cat_ewaste_pcb') return 'Printed Circuit Boards';
        if (catId === 'cat_ewaste_consumer') return 'Consumer Electronics';
        if (catId === 'cat_battery_lithium') return 'Lithium-ion Batteries';
        return catId;
      }),
      serviceAreas: r.serviceAreas ?? ['Pune - Hadapsar', 'Pune - Magarpatta'],
      contactPhone: r.phone ?? '+91 90000 00002',
      facilityAddress: 'MIDC Industrial Estate, Phase II, Hadapsar, Pune - 411028',
      authorizationIsDemo: r.authorizationIsDemo,
      pickupAvailable: r.pickupAvailable,
    });
  });

  app.get('/recycler/transactions', { preHandler: [...recyclerOnly, listLimit] }, async (request) => {
    return envelope(await serviceOf(request).listTransactions());
  });
}

const listQuerySchema = z.object({
  materialCategoryId: z.string().min(1).optional(),
  area: z.string().trim().max(80).optional(),
  minWeightKg: z.coerce.number().positive().optional(),
  maxWeightKg: z.coerce.number().positive().optional(),
});
