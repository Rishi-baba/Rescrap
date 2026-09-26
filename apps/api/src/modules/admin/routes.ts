/**
 * Admin routes.
 *
 * Rule SB-8: highest privilege, least privilege. Every route here requires the
 * ADMIN role resolved server-side, and every decision is written to the
 * append-only audit log by the service layer.
 *
 * Rule PRIV-06: aggregates and operational data only. The dashboard does not
 * expose personal data, and no route here returns a collector's contact
 * details.
 */
import type { FastifyInstance, preHandlerHookHandler } from 'fastify';
import { money, recordPriceSchema, verifyRecyclerSchema } from '@rescrap/shared';
import { envelope } from '../../lib/envelope.js';
import { parse } from '../../lib/parse.js';
import { requireRole, serviceOf } from '../../plugins/auth.js';
import { rateLimit, type RateLimiter } from '../../plugins/rate-limit.js';

export async function adminRoutes(app: FastifyInstance, limiter: RateLimiter): Promise<void> {
  const adminOnly: preHandlerHookHandler[] = [app.requireAuth, requireRole('ADMIN')];
  const listLimit = rateLimit(limiter, { max: 240, windowMs: 60_000, bucket: 'list' });

  app.get('/admin/dashboard', { preHandler: adminOnly }, async (request) => {
    return envelope(await serviceOf(request).adminDashboard());
  });

  app.get('/admin/verification/pending', { preHandler: adminOnly }, async (request) => {
    return envelope(await serviceOf(request).listPendingVerification());
  });

  app.post<{ Params: { recyclerId: string } }>(
    '/admin/verification/:recyclerId',
    { preHandler: adminOnly },
    async (request) => {
      const input = parse(verifyRecyclerSchema, request.body);
      // Rule AUD-04: the reason is mandatory and lands in the audit log.
      return envelope(
        await serviceOf(request).decideVerification(
          request.params.recyclerId,
          input.decision,
          input.reason,
        ),
      );
    },
  );

  app.get('/admin/lots', { preHandler: [...adminOnly, listLimit] }, async (request) => {
    return envelope(await serviceOf(request).listLotsForAdmin());
  });

  app.get('/admin/audit', { preHandler: [...adminOnly, listLimit] }, async (request) => {
    return envelope(await serviceOf(request).listAuditEvents());
  });

  app.post('/admin/prices', { preHandler: adminOnly }, async (request) => {
    const input = parse(recordPriceSchema, request.body);
    return envelope(
      await serviceOf(request).recordPrice({
        materialId: input.materialId,
        area: input.area,
        buyingPricePerKg: money(input.buyingPricePerKg),
        effectiveFrom: input.effectiveFrom,
        // Rule PRICE-05: every price carries the source it came from.
        sourceLabel: input.sourceLabel,
      }),
    );
  });

  app.get('/admin/prices', { preHandler: [...adminOnly, listLimit] }, async (request) => {
    return envelope(await serviceOf(request).priceBoard('all'));
  });

  app.get('/admin/anomalies', { preHandler: adminOnly }, async (request) => {
    return envelope(await serviceOf(request).listAnomalyFlags());
  });

  app.get('/admin/ai-predictions', { preHandler: adminOnly }, async (request) => {
    return envelope(await serviceOf(request).listAiPredictions());
  });
}
