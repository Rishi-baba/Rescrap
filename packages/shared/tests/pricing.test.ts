import { describe, expect, it } from 'vitest';
import {
  checkOfferAgainstEstimate,
  computeFinalAmount,
  estimateValue,
  findReferencePrice,
  valuationConfidence,
} from '../src/engines/pricing.js';
import {
  money,
  moneyToRupees,
  rupeesToMoney,
  scaleMoney,
  MAX_SANE_WEIGHT_KG,
  isSaneWeight,
} from '../src/domain/money.js';
import type { PriceRecord } from '../src/domain/types.js';
import type { PriceRecordId, MaterialId } from '../src/domain/ids.js';

const materialId = 'mat_test' as MaterialId;
const area = 'Pune - Hadapsar';

function record(overrides: Partial<PriceRecord> = {}): PriceRecord {
  return {
    id: 'prc_test' as PriceRecordId,
    materialId,
    area,
    buyingPricePerKg: money(10000),
    effectiveFrom: '2026-09-25T00:00:00.000Z',
    sourceLabel: 'DEMO - test',
    demo: true,
    createdAt: '2026-09-25T00:00:00.000Z',
    updatedAt: '2026-09-25T00:00:00.000Z',
    ...overrides,
  };
}

describe('money', () => {
  it('rejects non-integer minor units', () => {
    expect(() => money(10.5)).toThrow(TypeError);
  });

  it('round-trips rupees to paise', () => {
    expect(moneyToRupees(rupeesToMoney(123.45))).toBeCloseTo(123.45, 5);
  });

  it('rounds half-up when scaling', () => {
    expect(scaleMoney(money(1000), 0.855)).toBe(855);
    expect(scaleMoney(money(333), 1.005)).toBe(335);
  });

  it('rejects implausible weights', () => {
    expect(isSaneWeight(0)).toBe(false);
    expect(isSaneWeight(-1)).toBe(false);
    expect(isSaneWeight(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isSaneWeight(MAX_SANE_WEIGHT_KG + 1)).toBe(false);
    expect(isSaneWeight(12.5)).toBe(true);
  });
});

describe('valuation', () => {
  it('applies condition and location factors and labels itself a rule', () => {
    const result = estimateValue({
      weightKg: 10 as never,
      condition: 'GOOD',
      area,
      buyingPricePerKg: money(10000),
    });
    expect(result.estimatedValue).toBe(100000);
    expect(result.conditionFactor).toBe(1);
    // "Pune - Hadapsar" carries no tier token, so the factor is the neutral
    // default. An unknown area must never silently move the number.
    expect(result.locationFactor).toBe(1);
    expect(result.method).toBe('rule');
    expect(result.formula).toContain('10000 paise/kg');
  });

  it('reduces the estimate for poor condition', () => {
    const good = estimateValue({ weightKg: 10 as never, condition: 'GOOD', area, buyingPricePerKg: money(10000) });
    const poor = estimateValue({ weightKg: 10 as never, condition: 'POOR', area, buyingPricePerKg: money(10000) });
    expect(poor.estimatedValue).toBeLessThan(good.estimatedValue);
    expect(poor.conditionFactor).toBe(0.6);
  });

  it('applies a location factor for a known area tier', () => {
    const metro = estimateValue({ weightKg: 10 as never, condition: 'GOOD', area: 'Mumbai metro', buyingPricePerKg: money(10000) });
    const rural = estimateValue({ weightKg: 10 as never, condition: 'GOOD', area: 'rural village', buyingPricePerKg: money(10000) });
    expect(metro.estimatedValue).toBeGreaterThan(rural.estimatedValue);
  });

  it('is recomputable from its own reported factors (AI-04)', () => {
    const r = estimateValue({ weightKg: 7.5 as never, condition: 'FAIR', area: 'tier2 city', buyingPricePerKg: money(8000) });
    const expected = Math.round(8000 * r.conditionFactor * r.locationFactor * 7.5);
    expect(r.estimatedValue).toBe(expected);
  });
});

describe('reference price lookup', () => {
  const now = new Date('2026-09-27T00:00:00.000Z');

  it('returns the most recent effective record', () => {
    const lookup = findReferencePrice(materialId, area, [
      record({ id: 'a' as PriceRecordId, buyingPricePerKg: money(5000), effectiveFrom: '2026-09-01T00:00:00.000Z' }),
      record({ id: 'b' as PriceRecordId, buyingPricePerKg: money(9000), effectiveFrom: '2026-09-26T00:00:00.000Z' }),
    ], now);
    expect(lookup.record?.buyingPricePerKg).toBe(9000);
    expect(lookup.stale).toBe(false);
  });

  it('marks an old record as stale rather than silently trusting it', () => {
    const lookup = findReferencePrice(materialId, area, [
      record({ effectiveFrom: '2026-08-01T00:00:00.000Z' }),
    ], now);
    expect(lookup.stale).toBe(true);
    expect(lookup.ageDays).toBeGreaterThan(7);
  });

  it('excludes a record whose effective window has closed', () => {
    const lookup = findReferencePrice(materialId, area, [
      record({ effectiveFrom: '2026-01-01T00:00:00.000Z', effectiveTo: '2026-02-01T00:00:00.000Z' }),
    ], now);
    expect(lookup.record).toBeUndefined();
  });

  it('falls back to a wildcard area record', () => {
    const lookup = findReferencePrice(materialId, 'Somewhere Else', [
      record({ area: '*' }),
    ], now);
    expect(lookup.record).toBeDefined();
  });

  it('returns no record rather than guessing when none exists', () => {
    const lookup = findReferencePrice('mat_missing' as MaterialId, area, [record()], now);
    expect(lookup.record).toBeUndefined();
    expect(lookup.ageDays).toBeNull();
  });
});

describe('offer sanity band (OFFER-04)', () => {
  const estimate = money(10000);

  it('accepts an offer inside the band', () => {
    expect(checkOfferAgainstEstimate(money(10000), estimate).outsideBand).toBe(false);
    expect(checkOfferAgainstEstimate(money(17000), estimate).outsideBand).toBe(false);
  });

  it('flags an offer far below the estimate', () => {
    const check = checkOfferAgainstEstimate(money(3000), estimate);
    expect(check.outsideBand).toBe(true);
    expect(check.direction).toBe('BELOW');
  });

  it('flags an offer far above the estimate', () => {
    const check = checkOfferAgainstEstimate(money(20000), estimate);
    expect(check.outsideBand).toBe(true);
    expect(check.direction).toBe('ABOVE');
  });

  it('does not judge when there is no estimate', () => {
    expect(checkOfferAgainstEstimate(money(1), money(0)).direction).toBe('UNKNOWN');
  });
});

describe('final amount (PAY-03)', () => {
  it('is computed from rate and reconciled final weight, never accepted from a client', () => {
    expect(computeFinalAmount(money(12000), 8.5 as never)).toBe(102000);
  });
});

describe('valuation confidence (AI-02)', () => {
  it('is higher when data quality is better', () => {
    const best = valuationConfidence({
      hasReferencePrice: true,
      priceStale: false,
      weightEstimated: false,
      materialConfirmed: true,
    });
    const worst = valuationConfidence({
      hasReferencePrice: false,
      priceStale: true,
      weightEstimated: true,
      materialConfirmed: false,
    });
    expect(best.confidence).toBeGreaterThan(worst.confidence);
    expect(best.confidence).toBeLessThanOrEqual(1);
  });

  it('reports which factors produced the number', () => {
    const result = valuationConfidence({
      hasReferencePrice: true,
      priceStale: false,
      weightEstimated: false,
      materialConfirmed: true,
    });
    expect(result.factors).toContain('has_reference_price');
    expect(result.factors).toContain('material_confirmed_by_collector');
  });
});
