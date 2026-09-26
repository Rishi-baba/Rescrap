/**
 * ReScrap pricing engine.
 *
 * Rule PRICE-04: the estimated value is computed SERVER-side from
 * reference price x weight x condition factor x location factor.
 * It is never accepted from a client.
 *
 * Rule PRICE-02/03: the four price concepts are kept strictly distinct.
 * This module produces ESTIMATES ONLY. It never produces an offer and
 * never produces a final amount.
 */

import { money, scaleMoney, type Money, type WeightKg } from '../domain/money.js';
import type {
  EstimateMethod,
  LotCondition,
  PriceRecord,
} from '../domain/types.js';

export type ConditionFactorTable = Readonly<Record<LotCondition, number>>;

/** Rule PRD price discovery: condition adjusts the reference rate. */
export const CONDITION_FACTORS: ConditionFactorTable = {
  GOOD: 1,
  FAIR: 0.85,
  POOR: 0.6,
  MIXED: 0.75,
};

/**
 * Location factor. Kept as an explicit, auditable table rather than a hidden
 * model so a valuation can always be explained and recomputed (AI-04).
 */
export const LOCATION_FACTORS: Readonly<Record<string, number>> = {
  metro: 1.05,
  tier2: 1,
  tier3: 0.92,
  rural: 0.85,
};

export const DEFAULT_LOCATION_FACTOR = 1;

export function locationFactor(area: string): number {
  const key = area.trim().toLowerCase();
  for (const [name, factor] of Object.entries(LOCATION_FACTORS)) {
    if (key.includes(name)) {
      return factor;
    }
  }
  return DEFAULT_LOCATION_FACTOR;
}

export function conditionFactor(condition: LotCondition): number {
  return CONDITION_FACTORS[condition] ?? 1;
}

export interface PriceLookup {
  /** Most recent effective price record for the material and area, if any. */
  record?: PriceRecord;
  /** True when the record is older than the staleness window. */
  stale: boolean;
  /** Age of the record in days. Null when no record exists. */
  ageDays: number | null;
}

/** Prices older than this are surfaced as stale rather than silently trusted. */
export const PRICE_STALENESS_DAYS = 7;

export function findReferencePrice(
  materialId: string,
  area: string,
  records: readonly PriceRecord[],
  now: Date,
): PriceLookup {
  const candidates = records
    .filter((r) => r.materialId === materialId)
    .filter((r) => {
      const from = Date.parse(r.effectiveFrom);
      const to = r.effectiveTo ? Date.parse(r.effectiveTo) : Number.POSITIVE_INFINITY;
      const t = now.getTime();
      return from <= t && t < to;
    })
    .filter((r) => r.area === area || r.area === '*')
    .sort((a, b) => Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom));

  const record = candidates[0];
  if (!record) {
    return { stale: false, ageDays: null };
  }

  const ageMs = now.getTime() - Date.parse(record.effectiveFrom);
  const ageDays = Math.floor(ageMs / 86_400_000);
  return { record, stale: ageDays > PRICE_STALENESS_DAYS, ageDays };
}

export interface ValuationInput {
  weightKg: WeightKg;
  condition: LotCondition;
  area: string;
  buyingPricePerKg: Money;
}

export interface ValuationBreakdown {
  referencePricePerKg: Money;
  conditionFactor: number;
  locationFactor: number;
  effectivePricePerKg: Money;
  weightKg: WeightKg;
  estimatedValue: Money;
  method: EstimateMethod;
  /** Human-readable derivation, so any estimate can be explained and recomputed. */
  formula: string;
}

/**
 * Compute an ESTIMATED VALUE.
 *
 * This is the P0 deterministic implementation. The interface is stable so a
 * learned model can replace the internals in Phase 4 without touching any
 * call site (technical-approach.md 6.1, AI-08).
 */
export function estimateValue(input: ValuationInput): ValuationBreakdown {
  const cond = conditionFactor(input.condition);
  const loc = locationFactor(input.area);
  const effectivePerKg = scaleMoney(input.buyingPricePerKg, cond * loc);
  const estimated = scaleMoney(effectivePerKg, input.weightKg);

  return {
    referencePricePerKg: input.buyingPricePerKg,
    conditionFactor: cond,
    locationFactor: loc,
    effectivePricePerKg: effectivePerKg,
    weightKg: input.weightKg,
    estimatedValue: money(estimated),
    // Phase 0-3 is deterministic. Labelled honestly; never presented as a model.
    method: 'rule',
    formula: `${input.buyingPricePerKg} paise/kg x ${cond} (condition) x ${loc} (area) x ${input.weightKg} kg = ${estimated} paise`,
  };
}

export interface ValuationConfidence {
  confidence: number;
  factors: readonly string[];
}

/**
 * Rule AI-02: a confidence value is only ever returned when it was actually
 * computed. This is a rule-based confidence reflecting data quality, NOT a
 * model accuracy claim.
 */
export function valuationConfidence(args: {
  hasReferencePrice: boolean;
  priceStale: boolean;
  weightEstimated: boolean;
  materialConfirmed: boolean;
}): ValuationConfidence {
  const factors: string[] = [];
  let confidence = 0.4;

  if (args.hasReferencePrice) {
    confidence += 0.25;
    factors.push('has_reference_price');
  }
  if (!args.priceStale) {
    confidence += 0.15;
    factors.push('price_is_fresh');
  }
  if (!args.weightEstimated) {
    confidence += 0.1;
    factors.push('weight_is_measured');
  }
  if (args.materialConfirmed) {
    confidence += 0.1;
    factors.push('material_confirmed_by_collector');
  }

  return { confidence: Math.min(1, Number(confidence.toFixed(2))), factors };
}

/**
 * Rule OFFER-04: an offer outside this band relative to the estimate
 * requires an explicit justification and is flagged for review.
 */
export const OFFER_SANITY_BAND = { low: 0.5, high: 1.75 };

export interface SanityCheck {
  outsideBand: boolean;
  ratio: number | null;
  direction: 'BELOW' | 'ABOVE' | 'WITHIN' | 'UNKNOWN';
}

export function checkOfferAgainstEstimate(
  offerAmount: Money,
  estimatedValue: Money,
): SanityCheck {
  if (estimatedValue <= 0) {
    return { outsideBand: false, ratio: null, direction: 'UNKNOWN' };
  }
  const ratio = Number((offerAmount / estimatedValue).toFixed(3));
  if (ratio < OFFER_SANITY_BAND.low) {
    return { outsideBand: true, ratio, direction: 'BELOW' };
  }
  if (ratio > OFFER_SANITY_BAND.high) {
    return { outsideBand: true, ratio, direction: 'ABOVE' };
  }
  return { outsideBand: false, ratio, direction: 'WITHIN' };
}

/**
 * Rule PAY-03: the final amount is computed from the accepted offer rate
 * and the reconciled final weight. Never accepted from a client.
 */
export function computeFinalAmount(
  amountPerKg: Money,
  finalWeightKg: WeightKg,
): Money {
  return scaleMoney(amountPerKg, finalWeightKg);
}
