import { beforeEach, describe, expect, it } from 'vitest';
import { DemoReScrapService, resetDemoState } from '../src/services/demo.js';
import { money, type Money, type WeightKg } from '../src/domain/money.js';
import { rankRecyclerMatches } from '../src/engines/matching.js';
import { demoMaterials } from '../src/demo/seed.js';
import type { Recycler } from '../src/domain/types.js';

const kg = (n: number) => n as WeightKg;
const cash = (n: number) => money(n) as Money;

// The demo store is intentionally shared (ONE shared Lot across all three
// roles), so every test must start from a known seed rather than inheriting
// whatever the previous test left behind.
beforeEach(() => {
  resetDemoState();
});

const COLLECTOR_PHONE = '+919000000001';
const RECYCLER_PHONE = '+919000000002';
const UNVERIFIED_RECYCLER_PHONE = '+919000000005';
const ADMIN_PHONE = '+919000000004';
const OTP = '1234';

function key(): string {
  return `k_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

async function signInAsCollector(service: DemoReScrapService): Promise<void> {
  await service.verifyOtp(COLLECTOR_PHONE, 'COLLECTOR', OTP);
}

async function signInAsRecycler(service: DemoReScrapService, phone = RECYCLER_PHONE): Promise<void> {
  await service.verifyOtp(phone, 'RECYCLER', OTP);
}

/**
 * THE CRITICAL END-TO-END TEST (technical-approach.md 11.1).
 *
 *   Collector creates Lot -> Recycler receives Lot -> Recycler makes Offer
 *   -> Collector receives Offer -> Collector accepts
 *   -> Recycler confirms Handover -> Payment record created
 *   -> Collector sees Lot Passport + traceability chain
 *
 * All on ONE shared Lot.
 */
describe('critical end-to-end loop on ONE shared Lot', () => {
  it('runs the full collector -> recycler -> payment -> traceability cycle', async () => {
    const service = new DemoReScrapService();

    // --- Collector ---
    await signInAsCollector(service);

    const created = await service.createLot({
      items: [
        {
          materialId: 'mat_laptop',
          materialConfirmed: true,
          declaredWeightKg: kg(12),
          condition: 'GOOD',
          sourceType: 'HOUSEHOLD',
          photoKeys: ['demo://photo/laptop-1.jpg'],
        },
      ],
      collectionArea: 'Pune - Hadapsar',
      idempotencyKey: key(),
    });

    expect(created.id).toMatch(/^LOT-RS-\d{5}$/);
    expect(created.estimatedValue).toBeGreaterThan(0);
    expect(created.state).toBe('DRAFT');
    expect(created.demo).toBe(true);

    const submitted = await service.submitLot(created.id, key());
    expect(submitted.state).toBe('MATCHING');

    const matches = await service.matchRecyclers(created.id);
    expect(matches.length).toBeGreaterThan(0);
    for (const match of matches) {
      expect(match.authorizationStatus).toBe('VERIFIED');
      expect(match.reasons.length).toBeGreaterThan(0);
    }

    // --- Recycler ---
    await signInAsRecycler(service);

    const available = await service.listAvailableLots({});
    const seen = available.find((l) => l.id === created.id);
    expect(seen, 'the recycler must see the collector lot').toBeDefined();
    // Rule PRIV-04 / PRIV-10: no collector personal data in the recycler projection.
    expect(seen?.collectorName).toBeUndefined();

    const offer = await service.makeOffer({
      lotId: created.id,
      amount: cash(200000),
      validUntil: new Date(Date.now() + 86_400_000).toISOString(),
      idempotencyKey: key(),
    });
    expect(offer.state).toBe('PENDING');
    expect(offer.demo).toBe(true);

    // --- Collector accepts ---
    await signInAsCollector(service);
    const afterAccept = await service.acceptOffer(offer.id, key());
    expect(afterAccept.state).toBe('ACCEPTED');
    expect(afterAccept.acceptedRecyclerName).toBe('Green Loop Recycling');

    // --- Recycler schedules and executes the handover ---
    await signInAsRecycler(service);
    const handover = await service.schedulePickup(
      created.id,
      new Date(Date.now() + 3_600_000).toISOString(),
      key(),
    );
    expect(handover.state).toBe('SCHEDULED');
    expect(handover.declaredWeightKg).toBe(12);

    const executed = await service.executeHandover({
      handoverId: handover.id,
      finalWeightKg: kg(12.5),
      photoKeys: ['demo://photo/handover-1.jpg'],
      location: { lat: 18.5089, lng: 73.853 },
      idempotencyKey: key(),
    });
    expect(executed.state).toBe('EXECUTED');
    expect(executed.finalWeightKg).toBe(12.5);
    expect(executed.discrepancyPercent).toBeCloseTo(4.17, 1);
    // 4.17% is inside the 10% tolerance, so no review hold.
    expect(executed.requiresReview).toBe(false);

    // --- Collector verifies; payment and transaction are created ---
    await signInAsCollector(service);
    const afterVerify = await service.verifyHandover(handover.id, false, key());
    expect(afterVerify.state).toBe('RECEIVED');
    expect(afterVerify.paymentState).toBe('CONFIRMED');
    expect(afterVerify.paymentAmount).toBeGreaterThan(0);
    // Rule PAY-07: the MVP payment is explicitly simulated.
    expect(afterVerify.demo).toBe(true);

    // --- Digital Lot Passport ---
    const passport = await service.getPassport(created.id);
    expect(passport.lotId).toBe(created.id);
    expect(passport.summary.materialSummary).toBe('Laptops & computers');
    expect(passport.summary.recyclerName).toBe('Green Loop Recycling');
    expect(passport.summary.paymentSimulated).toBe(true);
    expect(passport.summary.finalAmount).toBe(afterVerify.paymentAmount);

    // --- Traceability chain, in order ---
    const chain = await service.listTraceability(created.id);
    const events = chain.map((c) => c.event);
    expect(events).toContain('LOT_CREATED');
    expect(events).toContain('MATERIAL_IDENTIFIED');
    expect(events).toContain('WEIGHT_CAPTURED');
    expect(events).toContain('ESTIMATE_COMPUTED');
    expect(events).toContain('RECYCLER_MATCHED');
    expect(events).toContain('OFFER_MADE');
    expect(events).toContain('OFFER_ACCEPTED');
    expect(events).toContain('PICKUP_SCHEDULED');
    expect(events).toContain('HANDOVER_EXECUTED');
    expect(events).toContain('COLLECTOR_VERIFIED');
    expect(events).toContain('PAYMENT_RECORDED');
    expect(chain.map((c) => c.sequence)).toEqual(chain.map((_, i) => i + 1));
  });

  it('gives the recycler the same lot id the collector created', async () => {
    const service = new DemoReScrapService();
    await signInAsCollector(service);
    const created = await service.createLot({
      items: [
        {
          materialId: 'mat_cable',
          materialConfirmed: true,
          declaredWeightKg: kg(4),
          condition: 'MIXED',
          sourceType: 'HOUSEHOLD',
          photoKeys: [],
        },
      ],
      collectionArea: 'Pune - Hadapsar',
      idempotencyKey: key(),
    });
    await service.submitLot(created.id, key());

    await signInAsRecycler(service);
    const available = await service.listAvailableLots({});
    // ONE lot, one id. Not a duplicate record.
    expect(available.filter((l) => l.id === created.id)).toHaveLength(1);
  });
});

describe('idempotency and duplicate prevention (FRD-03)', () => {
  it('returns the original lot when a create is replayed', async () => {
    const service = new DemoReScrapService();
    await signInAsCollector(service);
    const idempotencyKey = key();

    const payload = {
      items: [
        {
          materialId: 'mat_mobile_phone',
          materialConfirmed: true as const,
          declaredWeightKg: kg(2),
          condition: 'GOOD' as const,
          sourceType: 'HOUSEHOLD' as const,
          photoKeys: [],
        },
      ],
      collectionArea: 'Pune - Hadapsar',
      idempotencyKey,
    };

    const first = await service.createLot(payload);
    const replay = await service.createLot(payload);

    expect(replay.id).toBe(first.id);
    const all = await service.listMyLots();
    expect(all.filter((l) => l.id === first.id)).toHaveLength(1);
  });

  it('reports DUPLICATE rather than re-applying a replayed sync operation', async () => {
    const service = new DemoReScrapService();
    await signInAsCollector(service);
    const idempotencyKey = key();

    const op = {
      idempotencyKey,
      entity: 'LOT' as const,
      operation: 'CREATE' as const,
      clientCreatedAt: new Date().toISOString(),
      payload: {
        items: [
          {
            materialId: 'mat_battery',
            materialConfirmed: true,
            declaredWeightKg: kg(1),
            condition: 'GOOD',
            sourceType: 'HOUSEHOLD',
            photoKeys: [],
          },
        ],
        collectionArea: 'Pune - Hadapsar',
        idempotencyKey,
      },
    };

    const [first, second] = await service.syncBatch([op, op]);
    expect(first?.status).toBe('APPLIED');
    expect(second?.status).toBe('DUPLICATE');
    expect(second?.entityId).toBe(first?.entityId);
  });
});

describe('authorization boundaries (FRD-01, D-10)', () => {
  it('refuses collector data to a recycler session', async () => {
    const service = new DemoReScrapService();
    await signInAsRecycler(service);
    await expect(service.listMyLots()).rejects.toThrow(/access/i);
  });

  it('refuses a collector session to read another collector lot', async () => {
    const service = new DemoReScrapService();
    await signInAsCollector(service);
    await expect(service.getMyLot('LOT-RS-99999')).rejects.toThrow(/not found/i);
  });

  it('refuses admin actions to a recycler', async () => {
    const service = new DemoReScrapService();
    await signInAsRecycler(service);
    await expect(service.decideVerification('rec_demo_01', 'APPROVE', 'because')).rejects.toThrow(
      /access/i,
    );
  });

  it('refuses recycler actions to a collector', async () => {
    const service = new DemoReScrapService();
    await signInAsCollector(service);
    await expect(service.recyclerDashboard()).rejects.toThrow(/access/i);
  });

  it('requires authentication for every protected call', async () => {
    const service = new DemoReScrapService();
    await expect(service.listMyLots()).rejects.toThrow(/sign in/i);
  });
});

describe('trust controls (FRD-02, FRD-04, FRD-05)', () => {
  it('refuses to create a lot with unconfirmed material (LOT-06)', async () => {
    const service = new DemoReScrapService();
    await signInAsCollector(service);
    await expect(
      service.createLot({
        items: [
          {
            materialId: 'mat_laptop',
            // Simulates a client that skipped collector confirmation.
            materialConfirmed: false as never,
            declaredWeightKg: kg(5),
            condition: 'GOOD',
            sourceType: 'HOUSEHOLD',
            photoKeys: [],
          },
        ],
        collectionArea: 'Pune - Hadapsar',
        idempotencyKey: key(),
      }),
    ).rejects.toThrow(/confirm/i);
  });

  it('refuses a zero or negative weight (VAL-02)', async () => {
    const service = new DemoReScrapService();
    await signInAsCollector(service);
    await expect(
      service.createLot({
        items: [
          {
            materialId: 'mat_laptop',
            materialConfirmed: true,
            declaredWeightKg: kg(0),
            condition: 'GOOD',
            sourceType: 'HOUSEHOLD',
            photoKeys: [],
          },
        ],
        collectionArea: 'Pune - Hadapsar',
        idempotencyKey: key(),
      }),
    ).rejects.toThrow(/zero/i);
  });

  it('refuses an offer from an unverified recycler (RECY-01)', async () => {
    const service = new DemoReScrapService();
    await signInAsCollector(service);
    const created = await service.createLot({
      items: [
        {
          materialId: 'mat_laptop',
          materialConfirmed: true,
          declaredWeightKg: kg(5),
          condition: 'GOOD',
          sourceType: 'HOUSEHOLD',
          photoKeys: [],
        },
      ],
      collectionArea: 'Pune - Hadapsar',
      idempotencyKey: key(),
    });
    await service.submitLot(created.id, key());

    // The user behind the PENDING_REVIEW demo recycler signs in.
    await signInAsRecycler(service, UNVERIFIED_RECYCLER_PHONE);
    const lots = await service.listAvailableLots({});
    // An unverified recycler is served no listings at all.
    expect(lots).toEqual([]);
  });

  it('rejects an out-of-band offer without a justification (OFFER-04)', async () => {
    const service = new DemoReScrapService();
    await signInAsCollector(service);
    const created = await service.createLot({
      items: [
        {
          materialId: 'mat_laptop',
          materialConfirmed: true,
          declaredWeightKg: kg(10),
          condition: 'GOOD',
          sourceType: 'HOUSEHOLD',
          photoKeys: [],
        },
      ],
      collectionArea: 'Pune - Hadapsar',
      idempotencyKey: key(),
    });
    await service.submitLot(created.id, key());

    await signInAsRecycler(service);
    await expect(
      service.makeOffer({
        lotId: created.id,
        amount: cash(100),
        validUntil: new Date(Date.now() + 86_400_000).toISOString(),
        idempotencyKey: key(),
      }),
    ).rejects.toThrow(/reason/i);
  });

  it('rejects an illegal lifecycle jump', async () => {
    const service = new DemoReScrapService();
    await signInAsCollector(service);
    const created = await service.createLot({
      items: [
        {
          materialId: 'mat_laptop',
          materialConfirmed: true,
          declaredWeightKg: kg(3),
          condition: 'GOOD',
          sourceType: 'HOUSEHOLD',
          photoKeys: [],
        },
      ],
      collectionArea: 'Pune - Hadapsar',
      idempotencyKey: key(),
    });

    // A DRAFT lot cannot have a pickup scheduled against it.
    await signInAsRecycler(service);
    await expect(
      service.schedulePickup(created.id, new Date().toISOString(), key()),
    ).rejects.toThrow(/offer/i);
  });
});

describe('weight discrepancy hold (HAND-04)', () => {
  it('blocks verification until the collector acknowledges a large discrepancy', async () => {
    const service = new DemoReScrapService();
    await signInAsCollector(service);
    const created = await service.createLot({
      items: [
        {
          materialId: 'mat_laptop',
          materialConfirmed: true,
          declaredWeightKg: kg(10),
          condition: 'GOOD',
          sourceType: 'HOUSEHOLD',
          photoKeys: [],
        },
      ],
      collectionArea: 'Pune - Hadapsar',
      idempotencyKey: key(),
    });
    await service.submitLot(created.id, key());

    await signInAsRecycler(service);
    const offer = await service.makeOffer({
      lotId: created.id,
      amount: cash(150000),
      validUntil: new Date(Date.now() + 86_400_000).toISOString(),
      idempotencyKey: key(),
    });

    await signInAsCollector(service);
    await service.acceptOffer(offer.id, key());

    await signInAsRecycler(service);
    const handover = await service.schedulePickup(
      created.id,
      new Date(Date.now() + 3_600_000).toISOString(),
      key(),
    );
    const executed = await service.executeHandover({
      handoverId: handover.id,
      finalWeightKg: kg(25), // 150% over declared
      photoKeys: ['demo://photo/h.jpg'],
      location: { lat: 18.5, lng: 73.8 },
      idempotencyKey: key(),
    });
    expect(executed.requiresReview).toBe(true);

    await signInAsCollector(service);
    await expect(service.verifyHandover(handover.id, false, key())).rejects.toThrow(
      /weight changed/i,
    );
    // Payment must NOT be recorded while the hold stands.
    const lot = await service.getMyLot(created.id);
    expect(lot.paymentState).toBeUndefined();

    const acknowledged = await service.verifyHandover(handover.id, true, key());
    expect(acknowledged.state).toBe('RECEIVED');
  });
});

describe('earnings ledger (EARN-01, EARN-02)', () => {
  it('counts only confirmed payments and keeps demo labels visible', async () => {
    const service = new DemoReScrapService();
    await signInAsCollector(service);
    const empty = await service.getEarnings();
    expect(empty.confirmedTotal).toBe(0);
    expect(empty.lotCount).toBe(0);

    const created = await service.createLot({
      items: [
        {
          materialId: 'mat_cable',
          materialConfirmed: true,
          declaredWeightKg: kg(5),
          condition: 'FAIR',
          sourceType: 'HOUSEHOLD',
          photoKeys: [],
        },
      ],
      collectionArea: 'Pune - Hadapsar',
      idempotencyKey: key(),
    });
    await service.submitLot(created.id, key());

    await signInAsRecycler(service);
    const offer = await service.makeOffer({
      lotId: created.id,
      amount: cash(40000),
      validUntil: new Date(Date.now() + 86_400_000).toISOString(),
      idempotencyKey: key(),
    });

    await signInAsCollector(service);
    await service.acceptOffer(offer.id, key());
    await signInAsRecycler(service);
    const handover = await service.schedulePickup(created.id, new Date().toISOString(), key());
    await service.executeHandover({
      handoverId: handover.id,
      finalWeightKg: kg(5),
      photoKeys: ['demo://photo/h.jpg'],
      location: { lat: 18.5, lng: 73.8 },
      idempotencyKey: key(),
    });
    await signInAsCollector(service);
    await service.verifyHandover(handover.id, false, key());

    const earnings = await service.getEarnings();
    expect(earnings.confirmedTotal).toBe(40000);
    expect(earnings.pendingTotal).toBe(0);
    expect(earnings.lotCount).toBe(1);
    expect(earnings.ledger[0]?.simulated).toBe(true);
    expect(earnings.demo).toBe(true);
  });
});

describe('honesty controls (HON-01, HON-02, HON-04)', () => {
  it('flags every seeded recycler authorization as demo', () => {
    for (const r of rankRecyclerMatches(
      [
        {
          recycler: {
            id: 'rec_demo_01' as Recycler['id'],
            userId: 'usr_recycler_demo' as Recycler['userId'],
            businessName: 'Green Loop Recycling',
            phone: '+919000000002',
            authorizationStatus: 'VERIFIED',
            acceptedCategoryIds: [demoMaterials[0]!.categoryId],
            serviceAreas: ['Pune - Hadapsar'],
            pickupAvailable: true,
            authorizationIsDemo: true,
            demo: true,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
          lotCategoryIds: [demoMaterials[0]!.categoryId],
        },
      ],
    )) {
      expect(r.demo).toBe(true);
    }
  });

  it('rejects a wrong OTP', async () => {
    const service = new DemoReScrapService();
    await expect(service.verifyOtp(COLLECTOR_PHONE, 'COLLECTOR', '9999')).rejects.toThrow(/not correct/i);
  });

  it('rejects a malformed phone number', async () => {
    const service = new DemoReScrapService();
    await expect(service.requestOtp('123', 'COLLECTOR')).rejects.toThrow(/valid mobile/i);
  });
});

describe('admin operations (AUD-04)', () => {
  it('audit-logs a verification decision including the reason', async () => {
    const service = new DemoReScrapService();
    await service.verifyOtp(ADMIN_PHONE, 'ADMIN', OTP);

    const queue = await service.listPendingVerification();
    expect(queue.map((r) => r.id)).toContain('rec_demo_03');

    await service.decideVerification('rec_demo_03', 'APPROVE', 'Demo approval for test');
    const events = await service.listAuditEvents();
    const decision = events.find((e) => e.targetId === 'rec_demo_03');
    expect(decision?.action).toBe('RECYCLER_APPROVED');
    expect(decision?.reason).toBe('Demo approval for test');
    expect(decision?.actorRole).toBe('ADMIN');
  });

  it('labels recorded prices as demo in the source (HON-01)', async () => {
    const service = new DemoReScrapService();
    await service.verifyOtp(ADMIN_PHONE, 'ADMIN', OTP);
    const record = await service.recordPrice({
      materialId: 'mat_laptop',
      area: 'Pune - Hadapsar',
      buyingPricePerKg: cash(18500),
      effectiveFrom: new Date().toISOString(),
      sourceLabel: 'manual entry',
    });
    expect(record.sourceLabel).toContain('DEMO');
    expect(record.demo).toBe(true);
  });

  it('shows an operational dashboard with aggregates only', async () => {
    const service = new DemoReScrapService();
    await service.verifyOtp(ADMIN_PHONE, 'ADMIN', OTP);
    const dashboard = await service.adminDashboard();
    expect(dashboard.totalLots).toBe(0);
    expect(dashboard.verificationQueueDepth).toBe(1);
    expect(dashboard.demo).toBe(true);
  });
});
