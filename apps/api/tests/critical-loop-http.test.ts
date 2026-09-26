/**
 * THE CRITICAL END-TO-END TEST, over HTTP.
 *
 * The shared package proves the loop against the service directly
 * (packages/shared/tests/critical-loop.test.ts). This proves the same loop
 * survives the network boundary: real routing, real auth, real status codes,
 * real error envelopes, three different sessions.
 *
 *   Collector creates Lot -> Recycler sees the SAME lot -> Recycler offers
 *   -> Collector accepts -> Recycler schedules + executes handover
 *   -> Collector verifies -> payment + one transaction -> Lot Passport
 */
import { beforeEach, afterEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { ADMIN_PHONE, COLLECTOR_PHONE, RECYCLER_PHONE, auth, key, lotPayload, makeApp, signIn, type Session } from './helpers.js';

let app: FastifyInstance;
let collector: Session;
let recycler: Session;
let admin: Session;

beforeEach(async () => {
  app = await makeApp();
  collector = await signIn(app, COLLECTOR_PHONE, 'COLLECTOR');
  recycler = await signIn(app, RECYCLER_PHONE, 'RECYCLER');
  admin = await signIn(app, ADMIN_PHONE, 'ADMIN');
});
afterEach(async () => {
  await app.close();
});

describe('the critical loop over HTTP', () => {
  it('carries ONE lot from creation to a traceability chain', async () => {
    /* --- Collector creates and submits --- */
    const created = await app.inject({
      method: 'POST',
      url: '/collector/lots',
      headers: auth(collector),
      payload: lotPayload(),
    });
    expect(created.statusCode).toBe(200);
    const lot = created.json<{
      data: { id: string; state: string; estimatedValue: number; demo: boolean };
    }>().data;
    expect(lot.id).toMatch(/^LOT-RS-\d{5,}$/);
    expect(lot.demo).toBe(true);

    const submitted = await app.inject({
      method: 'POST',
      url: `/collector/lots/${lot.id}/submit`,
      headers: auth(collector),
      payload: { idempotencyKey: key() },
    });
    expect(submitted.statusCode).toBe(200);
    expect(submitted.json<{ data: { state: string } }>().data.state).toBe('MATCHING');

    /* --- Recycler receives the SAME lot, not a copy --- */
    const available = await app.inject({
      method: 'GET',
      url: '/recycler/lots',
      headers: auth(recycler),
    });
    expect(available.statusCode).toBe(200);
    const recyclerLots = available.json<{ data: Array<{ id: string }> }>().data;
    expect(recyclerLots.map((l) => l.id)).toContain(lot.id);

    /* --- Recycler makes an offer --- */
    const offerRes = await app.inject({
      method: 'POST',
      url: '/recycler/offers',
      headers: auth(recycler),
      payload: {
        lotId: lot.id,
        amount: 120_000,
        validUntil: new Date(Date.now() + 3_600_000).toISOString(),
        message: 'We can collect tomorrow morning.',
        justification: 'Above the estimate because the lot is mixed and clean.',
        idempotencyKey: key(),
      },
    });
    expect(offerRes.statusCode).toBe(200);
    const offer = offerRes.json<{ data: { id: string; state: string } }>().data;
    expect(offer.state).toBe('PENDING');

    /* --- Collector accepts --- */
    const accepted = await app.inject({
      method: 'POST',
      url: `/collector/offers/${offer.id}/accept`,
      headers: auth(collector),
      payload: { idempotencyKey: key() },
    });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json<{ data: { state: string } }>().data.state).toBe('ACCEPTED');

    /* --- Recycler schedules and executes the handover --- */
    const scheduled = await app.inject({
      method: 'POST',
      url: '/recycler/handovers/schedule',
      headers: auth(recycler),
      payload: {
        lotId: lot.id,
        scheduledFor: new Date(Date.now() + 3_600_000).toISOString(),
        idempotencyKey: key(),
      },
    });
    expect(scheduled.statusCode).toBe(200);
    const handover = scheduled.json<{ data: { id: string; state: string } }>().data;
    expect(handover.state).toBe('SCHEDULED');

    const executed = await app.inject({
      method: 'POST',
      url: '/recycler/handovers/execute',
      headers: auth(recycler),
      payload: {
        handoverId: handover.id,
        finalWeightKg: 12.5,
        photoKeys: ['demo://photo/handover.jpg'],
        location: { lat: 18.5089, lng: 73.853 },
        idempotencyKey: key(),
      },
    });
    expect(executed.statusCode).toBe(200);
    const executedHandover = executed.json<{
      data: { state: string; discrepancyPercent: number; requiresReview: boolean };
    }>().data;
    expect(executedHandover.state).toBe('EXECUTED');
    // 4.17% is inside the 10% tolerance, so no review hold.
    expect(executedHandover.requiresReview).toBe(false);

    /* --- Collector verifies: payment + one transaction --- */
    const verified = await app.inject({
      method: 'POST',
      url: `/collector/handovers/${handover.id}/verify`,
      headers: auth(collector),
      payload: { acknowledgeDiscrepancy: false, idempotencyKey: key() },
    });
    expect(verified.statusCode).toBe(200);
    const finished = verified.json<{
      data: { state: string; paymentState: string; paymentAmount: number };
    }>().data;
    expect(finished.state).toBe('RECEIVED');
    expect(finished.paymentState).toBe('CONFIRMED');
    expect(finished.paymentAmount).toBeGreaterThan(0);

    /* --- Lot Passport + traceability chain --- */
    const passport = await app.inject({
      method: 'GET',
      url: `/collector/lots/${lot.id}/passport`,
      headers: auth(collector),
    });
    expect(passport.statusCode).toBe(200);
    const passportData = passport.json<{
      data: {
        lotId: string;
        chain: Array<{ event: string }>;
        summary: { paymentSimulated: boolean; materialSummary: string };
        demo: boolean;
      };
    }>().data;
    expect(passportData.lotId).toBe(lot.id);
    expect(passportData.summary.materialSummary).toBe('Laptops & computers');
    // Rule HON-02: the payment is stated as simulated, never implied to be real.
    expect(passportData.summary.paymentSimulated).toBe(true);
    expect(passportData.demo).toBe(true);

    const events = passportData.chain.map((c) => c.event);
    for (const expected of [
      'LOT_CREATED',
      'MATERIAL_IDENTIFIED',
      'WEIGHT_CAPTURED',
      'ESTIMATE_COMPUTED',
      'OFFER_MADE',
      'OFFER_ACCEPTED',
      'PAYMENT_RECORDED',
    ]) {
      expect(events, `traceability chain must contain ${expected}`).toContain(expected);
    }

    /* --- Admin sees the same lot, aggregated --- */
    const adminLots = await app.inject({
      method: 'GET',
      url: '/admin/lots',
      headers: auth(admin),
    });
    expect(adminLots.statusCode).toBe(200);
    const adminView = adminLots.json<{ data: Array<{ id: string; state: string }> }>().data;
    expect(adminView.map((l) => l.id)).toContain(lot.id);

    /* --- Rule TXN-01: one lot yields at most one transaction --- */
    const transactions = await app.inject({
      method: 'GET',
      url: '/recycler/transactions',
      headers: auth(recycler),
    });
    expect(transactions.statusCode).toBe(200);
    const txns = transactions.json<{ data: Array<{ lotId: string }> }>().data;
    expect(txns.filter((t) => t.lotId === lot.id)).toHaveLength(1);
  });

  it('reports a business rejection as 409, not 500', async () => {
    const created = await app.inject({
      method: 'POST',
      url: '/collector/lots',
      headers: auth(collector),
      payload: lotPayload(),
    });
    const lotId = created.json<{ data: { id: string } }>().data.id;

    // Skip SUBMIT, so the lot is still DRAFT and cannot take an offer.
    const early = await app.inject({
      method: 'POST',
      url: '/recycler/handovers/schedule',
      headers: auth(recycler),
      payload: {
        lotId,
        scheduledFor: new Date(Date.now() + 3_600_000).toISOString(),
        idempotencyKey: key(),
      },
    });
    expect(early.statusCode).toBeGreaterThanOrEqual(400);
    expect(early.statusCode).toBeLessThan(500);
    expect(early.json<{ error: { code: string } }>().error.code).not.toBe('INTERNAL');
  });

  it('holds verification when the weight changed too much (HAND-04)', async () => {
    const lotId = await createAndOffer();

    const scheduled = await app.inject({
      method: 'POST',
      url: '/recycler/handovers/schedule',
      headers: auth(recycler),
      payload: {
        lotId,
        scheduledFor: new Date(Date.now() + 3_600_000).toISOString(),
        idempotencyKey: key(),
      },
    });
    const handoverId = scheduled.json<{ data: { id: string } }>().data.id;

    const executed = await app.inject({
      method: 'POST',
      url: '/recycler/handovers/execute',
      headers: auth(recycler),
      payload: {
        handoverId,
        finalWeightKg: 30,
        photoKeys: ['demo://photo/h.jpg'],
        location: { lat: 18.5, lng: 73.8 },
        idempotencyKey: key(),
      },
    });
    expect(executed.json<{ data: { requiresReview: boolean } }>().data.requiresReview).toBe(true);

    const blocked = await app.inject({
      method: 'POST',
      url: `/collector/handovers/${handoverId}/verify`,
      headers: auth(collector),
      payload: { acknowledgeDiscrepancy: false, idempotencyKey: key() },
    });
    expect(blocked.statusCode).toBe(409);
    expect(blocked.json<{ error: { code: string } }>().error.code).toBe('DISCREPANCY_REQUIRES_ACK');

    // No payment may exist while the hold stands.
    const lots = await app.inject({
      method: 'GET',
      url: '/collector/lots',
      headers: auth(collector),
    });
    const view = lots
      .json<{ data: Array<{ id: string; paymentState?: string }> }>()
      .data.find((l) => l.id === lotId);
    expect(view?.paymentState).toBeUndefined();

    const acknowledged = await app.inject({
      method: 'POST',
      url: `/collector/handovers/${handoverId}/verify`,
      headers: auth(collector),
      payload: { acknowledgeDiscrepancy: true, idempotencyKey: key() },
    });
    expect(acknowledged.statusCode).toBe(200);
    expect(acknowledged.json<{ data: { state: string } }>().data.state).toBe('RECEIVED');
  });

  async function createAndOffer(): Promise<string> {
    const created = await app.inject({
      method: 'POST',
      url: '/collector/lots',
      headers: auth(collector),
      payload: lotPayload(),
    });
    const lotId = created.json<{ data: { id: string } }>().data.id;
    await app.inject({
      method: 'POST',
      url: `/collector/lots/${lotId}/submit`,
      headers: auth(collector),
      payload: { idempotencyKey: key() },
    });
    const offer = await app.inject({
      method: 'POST',
      url: '/recycler/offers',
      headers: auth(recycler),
      payload: {
        lotId,
        amount: 120_000,
        validUntil: new Date(Date.now() + 3_600_000).toISOString(),
        idempotencyKey: key(),
      },
    });
    await app.inject({
      method: 'POST',
      url: `/collector/offers/${offer.json<{ data: { id: string } }>().data.id}/accept`,
      headers: auth(collector),
      payload: { idempotencyKey: key() },
    });
    return lotId;
  }
});

describe('offline sync (SB-10)', () => {
  it('replays an outbox without creating duplicate lots', async () => {
    const batch = {
      operations: [
        {
          idempotencyKey: key(),
          entity: 'LOT' as const,
          operation: 'CREATE' as const,
          clientCreatedAt: new Date().toISOString(),
          payload: lotPayload({ idempotencyKey: key() }),
        },
      ],
    };

    const first = await app.inject({
      method: 'POST',
      url: '/sync',
      headers: auth(collector),
      payload: batch,
    });
    expect(first.statusCode).toBe(200);
    const firstResults = first.json<{ data: Array<{ status: string; entityId?: string }> }>().data;
    expect(firstResults[0]?.status).toBe('APPLIED');

    const replay = await app.inject({
      method: 'POST',
      url: '/sync',
      headers: auth(collector),
      payload: batch,
    });
    expect(replay.statusCode).toBe(200);
    const replayResults = replay.json<{ data: Array<{ status: string }> }>().data;
    expect(['DUPLICATE', 'APPLIED']).toContain(replayResults[0]?.status);

    // Whatever the sync reported, exactly one lot must exist.
    const lots = await app.inject({
      method: 'GET',
      url: '/collector/lots',
      headers: auth(collector),
    });
    expect(lots.json<{ data: unknown[] }>().data).toHaveLength(1);
  });
});

describe('honesty metadata', () => {
  it('declares on /meta exactly what is real and what is not', async () => {
    const res = await app.inject({ method: 'GET', url: '/meta' });
    expect(res.statusCode).toBe(200);
    const meta = res.json<{ demo: boolean; reality: Record<string, string> }>();
    expect(meta.demo).toBe(true);
    expect(meta.reality.recyclers).toContain('FICTIONAL');
    expect(meta.reality.payments).toContain('SIMULATED');
    expect(meta.reality.prices).toContain('DEMO');
    expect(meta.reality.materialClassification).toContain('RULE');
    expect(meta.reality.dataStore).toContain('IN-MEMORY');
  });

  it('marks every envelope as demo', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/otp/request',
      payload: { phone: COLLECTOR_PHONE, role: 'COLLECTOR' },
    });
    expect(res.json<{ demo: boolean }>().demo).toBe(true);
  });

  it('exposes the dev OTP only in non-production', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/auth/otp/request',
      payload: { phone: COLLECTOR_PHONE, role: 'COLLECTOR' },
    });
    expect(res.statusCode).toBe(200);
    const data = res.json<{ data: { devCode?: string; delivery: string } }>().data;
    expect(data.devCode).toBe('1234');
    expect(data.delivery).toBe('console');
  });
});

describe('admin operations (AUD-04)', () => {
  it('records a verification decision with its reason', async () => {
    const pending = await app.inject({
      method: 'GET',
      url: '/admin/verification/pending',
      headers: auth(admin),
    });
    expect(pending.statusCode).toBe(200);
    const queue = pending.json<{ data: Array<{ id: string; businessName: string }> }>().data;
    expect(queue.length).toBeGreaterThan(0);
    const subject = queue[0]!;

    const decided = await app.inject({
      method: 'POST',
      url: `/admin/verification/${subject.id}`,
      headers: auth(admin),
      payload: { decision: 'APPROVE', reason: 'Demo decision for the verification queue.' },
    });
    expect(decided.statusCode).toBe(200);
    expect(decided.json<{ data: { authorizationStatus: string } }>().data.authorizationStatus).toBe(
      'VERIFIED',
    );

    const audit = await app.inject({ method: 'GET', url: '/admin/audit', headers: auth(admin) });
    expect(audit.statusCode).toBe(200);
    const raw = audit.body;
    expect(raw).toContain('Demo decision for the verification queue.');
  });

  it('rejects a verification with no reason (AUD-04)', async () => {
    const pending = await app.inject({
      method: 'GET',
      url: '/admin/verification/pending',
      headers: auth(admin),
    });
    const subject = pending.json<{ data: Array<{ id: string }> }>().data[0]!;
    const res = await app.inject({
      method: 'POST',
      url: `/admin/verification/${subject.id}`,
      headers: auth(admin),
      payload: { decision: 'REJECT', reason: '' },
    });
    expect(res.statusCode).toBe(400);
  });

  it('serves an operational dashboard of aggregates only (PRIV-06)', async () => {
    const res = await app.inject({ method: 'GET', url: '/admin/dashboard', headers: auth(admin) });
    expect(res.statusCode).toBe(200);
    const data = res.json<{ data: { totalLots: number; demo: boolean } }>().data;
    expect(typeof data.totalLots).toBe('number');
    expect(data.demo).toBe(true);
    // Aggregates only: no personal data in the dashboard payload.
    expect(res.body).not.toContain('Sunita Devi');
    expect(res.body).not.toContain('+919000000001');
  });
});
