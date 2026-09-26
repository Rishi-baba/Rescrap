import { describe, expect, it } from 'vitest';
import { rankRecyclerMatches, type MatchCandidate } from '../src/engines/matching.js';
import {
  AUTO_SUGGEST_CONFIDENCE_THRESHOLD,
  classifyMaterial,
  detectAnomalies,
  requiresWeightReview,
  safetyGuidanceFor,
  weightDiscrepancyPercent,
} from '../src/engines/intelligence.js';
import { demoMaterials } from '../src/demo/seed.js';
import { money } from '../src/domain/money.js';
import type { Recycler } from '../src/domain/types.js';
import type { MaterialCategoryId, RecyclerId } from '../src/domain/ids.js';

const electronics = 'cat_electronics' as MaterialCategoryId;
const metals = 'cat_metals' as MaterialCategoryId;

function recycler(overrides: Partial<Recycler>): Recycler {
  return {
    id: 'rec_x' as RecyclerId,
    userId: 'usr_x' as Recycler['userId'],
    businessName: 'Test Recycler',
    phone: '+919000000000',
    authorizationStatus: 'VERIFIED',
    acceptedCategoryIds: [electronics],
    serviceAreas: ['Pune'],
    pickupAvailable: true,
    authorizationIsDemo: true,
    demo: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('recycler matching (RECY-02, AI-05)', () => {
  it('never returns an unverified recycler, regardless of score', () => {
    const candidates: MatchCandidate[] = [
      {
        recycler: recycler({
          id: 'rec_pending' as RecyclerId,
          authorizationStatus: 'PENDING_REVIEW',
        }),
        lotCategoryIds: [electronics],
        distanceKm: 1,
      },
      {
        recycler: recycler({ id: 'rec_suspended' as RecyclerId, authorizationStatus: 'SUSPENDED' }),
        lotCategoryIds: [electronics],
        distanceKm: 1,
      },
    ];
    expect(rankRecyclerMatches(candidates)).toEqual([]);
  });

  it('never returns a recycler that does not accept the material', () => {
    const matches = rankRecyclerMatches([
      {
        recycler: recycler({ id: 'rec_wrong' as RecyclerId, acceptedCategoryIds: [metals] }),
        lotCategoryIds: [electronics],
        distanceKm: 1,
      },
    ]);
    expect(matches).toEqual([]);
  });

  it('always supplies at least one plain-language reason', () => {
    const matches = rankRecyclerMatches([
      { recycler: recycler({}), lotCategoryIds: [electronics] },
    ]);
    expect(matches).toHaveLength(1);
    const reasons = matches[0]?.reasons ?? [];
    expect(reasons.length).toBeGreaterThan(0);
    for (const reason of reasons) {
      expect(reason.label.en.length).toBeGreaterThan(0);
      expect(reason.label.hi.length).toBeGreaterThan(0);
      expect(reason.label.mr.length).toBeGreaterThan(0);
    }
  });

  it('marks verified recyclers with the VERIFIED reason', () => {
    const matches = rankRecyclerMatches([
      { recycler: recycler({ authorizationStatus: 'VERIFIED' }), lotCategoryIds: [electronics] },
    ]);
    expect(matches[0]?.reasons.map((r) => r.code)).toContain('VERIFIED');
  });

  it('ranks a nearby recycler with pickup above a distant one', () => {
    const matches = rankRecyclerMatches([
      { recycler: recycler({ id: 'rec_far' as RecyclerId }), lotCategoryIds: [electronics], distanceKm: 45 },
      { recycler: recycler({ id: 'rec_near' as RecyclerId }), lotCategoryIds: [electronics], distanceKm: 2 },
    ]);
    expect(matches[0]?.recyclerId).toBe('rec_near');
  });

  it('honours the limit option', () => {
    const matches = rankRecyclerMatches(
      [
        { recycler: recycler({ id: 'rec_a' as RecyclerId }), lotCategoryIds: [electronics] },
        { recycler: recycler({ id: 'rec_b' as RecyclerId }), lotCategoryIds: [electronics] },
        { recycler: recycler({ id: 'rec_c' as RecyclerId }), lotCategoryIds: [electronics] },
      ],
      { limit: 2 },
    );
    expect(matches).toHaveLength(2);
  });

  it('is deterministic for equal candidates', () => {
    const candidates: MatchCandidate[] = [
      { recycler: recycler({ id: 'rec_b' as RecyclerId }), lotCategoryIds: [electronics] },
      { recycler: recycler({ id: 'rec_a' as RecyclerId }), lotCategoryIds: [electronics] },
    ];
    expect(rankRecyclerMatches(candidates).map((m) => m.recyclerId)).toEqual(
      rankRecyclerMatches([...candidates].reverse()).map((m) => m.recyclerId),
    );
  });
});

describe('material classification (LOT-06, AI-03, AI-08)', () => {
  it('suggests a material from a keyword and explains why', () => {
    const result = classifyMaterial({ keywordHints: ['old mobile phone'] }, demoMaterials);
    expect(result.best?.materialKey).toBe('mobile-phone');
    expect(result.best?.method).toBe('rule');
    expect(result.best?.rationale).toContain('Matched keyword');
  });

  it('honours an explicit collector selection over any guess', () => {
    const result = classifyMaterial(
      { keywordHints: ['mobile phone'], explicitMaterialKey: 'laptop' },
      demoMaterials,
    );
    expect(result.best?.materialKey).toBe('laptop');
    expect(result.best?.confidence).toBe(1);
  });

  it('requires manual selection when nothing matches', () => {
    const result = classifyMaterial({ keywordHints: ['some unknown thing'] }, demoMaterials);
    expect(result.best).toBeUndefined();
    expect(result.requiresManualSelection).toBe(true);
  });

  it('requires manual selection when confidence is below threshold', () => {
    const result = classifyMaterial({ keywordHints: ['board'] }, demoMaterials);
    expect(result.requiresManualSelection).toBe(true);
  });

  it('never claims a confidence of certainty from a keyword guess', () => {
    const result = classifyMaterial({ keywordHints: ['battery cell power bank'] }, demoMaterials);
    expect(result.best!.confidence).toBeLessThanOrEqual(0.9);
    expect(AUTO_SUGGEST_CONFIDENCE_THRESHOLD).toBeLessThanOrEqual(0.9);
  });
});

describe('weight reconciliation (HAND-03, HAND-04)', () => {
  it('computes a signed discrepancy percentage', () => {
    expect(weightDiscrepancyPercent(10 as never, 12 as never)).toBe(20);
    expect(weightDiscrepancyPercent(10 as never, 8 as never)).toBe(-20);
    expect(weightDiscrepancyPercent(10 as never, 10 as never)).toBe(0);
  });

  it('requires review beyond the 10% tolerance', () => {
    expect(requiresWeightReview(10 as never, 10.5 as never)).toBe(false);
    expect(requiresWeightReview(10 as never, 12 as never)).toBe(true);
  });
});

describe('anomaly detection (AI-06)', () => {
  const base = {
    declaredWeightKg: 10 as never,
    finalWeightKg: 10 as never,
    offerAmount: money(10000),
    estimatedValue: money(10000),
    hoursOpen: 48,
    materialHazardFlags: [] as never[],
    photoCount: 1,
  };

  it('flags nothing for a clean transaction', () => {
    expect(detectAnomalies(base)).toEqual([]);
  });

  it('flags a large weight discrepancy', () => {
    const flags = detectAnomalies({ ...base, finalWeightKg: 20 as never });
    expect(flags.map((f) => f.code)).toContain('WEIGHT_OUTLIER');
  });

  it('flags an offer far below the estimate', () => {
    const flags = detectAnomalies({ ...base, offerAmount: money(2000) });
    expect(flags.map((f) => f.code)).toContain('PRICE_OUTLIER');
    expect(flags.find((f) => f.code === 'PRICE_OUTLIER')?.severity).toBe('HIGH');
  });

  it('flags a rate that diverges from the historical price', () => {
    const flags = detectAnomalies({ ...base, historicalPricePerKg: money(50000) });
    expect(flags.map((f) => f.code)).toContain('RATE_MISMATCH');
  });

  it('flags hazardous material with no photographs', () => {
    const flags = detectAnomalies({ ...base, materialHazardFlags: ['BATTERY'] as never, photoCount: 0 });
    expect(flags.map((f) => f.code)).toContain('HAZARD_MISSING');
  });

  it('only ever flags; it never changes a transaction', () => {
    const flags = detectAnomalies({ ...base, finalWeightKg: 99 as never, offerAmount: money(1) });
    for (const flag of flags) {
      expect(Object.keys(flag).sort()).toEqual(['code', 'expected', 'message', 'observed', 'severity']);
    }
  });
});

describe('safety guidance (SAFE-04, SAFE-05)', () => {
  it('warns about terminals for batteries', () => {
    const guidance = safetyGuidanceFor(['BATTERY']);
    expect(guidance.headline).toContain('Battery');
    expect(guidance.doNot.join(' ')).toContain('terminals');
  });

  it('never instructs burning cables or acid extraction (SAFE-05)', () => {
    const all = [safetyGuidanceFor(['CABLE']), safetyGuidanceFor(['BATTERY']), safetyGuidanceFor(['CRT'])];
    const text = all.flatMap((g) => [...g.doNot, ...g.doInstead]).join(' ').toLowerCase();
    expect(text).not.toContain('burn the cable');
    expect(text).not.toContain('acid');
  });

  it('always advises hand washing', () => {
    expect(safetyGuidanceFor([]).doInstead).toContain('Wash your hands after handling.');
  });
});
