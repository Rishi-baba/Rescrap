/**
 * ReScrap recycler matching engine.
 *
 * Rule AI-05 / prd.md 14: matching must be EXPLAINABLE.
 * This engine returns plain-language reasons, never an opaque score.
 *
 * Phase 0-3 implementation is deterministic and weighted. A learned ranker
 * can replace `scoreMatch` internals in Phase 4 behind the same interface
 * (technical-approach.md 6.1).
 */

import type { MatchReason, Recycler, RecyclerMatch } from '../domain/types.js';
import type { MaterialCategoryId } from '../domain/ids.js';

export const MATCH_WEIGHTS = {
  verified: 0.3,
  materialCompatibility: 0.35,
  proximity: 0.2,
  pickupAvailable: 0.1,
  offerPrice: 0.05,
} as const;

export interface MatchCandidate {
  recycler: Recycler;
  /** Category ids on the lot. */
  lotCategoryIds: readonly MaterialCategoryId[];
  /** Case-insensitive area match, or undefined when unknown. */
  distanceKm?: number;
  /** Best known offer rate for this recycler on this material, in paise/kg. */
  offerPricePerKg?: number;
  /** Platform reference rate for the material, in paise/kg, for offer comparison. */
  referencePricePerKg?: number;
  /** Whether this recycler has transacted with the platform before. */
  priorTransaction?: boolean;
}

function reasonsFor(candidate: MatchCandidate): MatchReason[] {
  const { recycler } = candidate;
  const reasons: MatchReason[] = [];

  // Rule RECY-02: only VERIFIED recyclers are ever returned as matches.
  if (recycler.authorizationStatus === 'VERIFIED') {
    reasons.push({
      code: 'VERIFIED',
      label: {
        en: 'Verified recycler',
        hi: 'सत्यापित रीसायकलर',
        mr: 'सत्यापित रीसायकलर',
      },
    });
  }

  const accepts = candidate.lotCategoryIds.some((id) => recycler.acceptedCategoryIds.includes(id));
  if (accepts) {
    reasons.push({
      code: 'ACCEPTS_THIS_MATERIAL',
      label: {
        en: 'Accepts this material',
        hi: 'यह सामग्री लेता है',
        mr: 'हा साहित्य घेते',
      },
    });
  }

  if (candidate.distanceKm !== undefined) {
    if (candidate.distanceKm <= 10) {
      reasons.push({
        code: 'NEARBY',
        label: { en: 'Nearby', hi: 'पास में', mr: 'जवळपास' },
      });
    }
  }

  if (recycler.pickupAvailable) {
    reasons.push({
      code: 'PICKUP_AVAILABLE',
      label: {
        en: 'Pickup available',
        hi: 'पिकअप उपलब्ध',
        mr: 'पिकअप उपलब्ध',
      },
    });
  }

  if (
    candidate.offerPricePerKg !== undefined &&
    candidate.referencePricePerKg !== undefined &&
    candidate.referencePricePerKg > 0
  ) {
    if (candidate.offerPricePerKg >= candidate.referencePricePerKg) {
      reasons.push({
        code: 'OFFER_PRICE',
        label: {
          en: 'Pays above the usual rate',
          hi: 'सामान्य भाव से ऊपर देता है',
          mr: 'नेहमीच्या भावापेक्षा जास्त देतो',
        },
      });
    }
  }

  if (candidate.priorTransaction) {
    reasons.push({
      code: 'RECENT_TRANSACTION',
      label: {
        en: 'Worked with ReScrap before',
        hi: 'पहले ReScrap के साथ काम किया',
        mr: 'आधी ReScrap सोबत काम केले',
      },
    });
  }

  return reasons;
}

function scoreCandidate(candidate: MatchCandidate): number {
  const { recycler } = candidate;
  let score = 0;

  if (recycler.authorizationStatus === 'VERIFIED') {
    score += MATCH_WEIGHTS.verified;
  }

  const accepts = candidate.lotCategoryIds.some((id) => recycler.acceptedCategoryIds.includes(id));
  if (accepts) {
    score += MATCH_WEIGHTS.materialCompatibility;
  }

  if (candidate.distanceKm !== undefined) {
    // Within 5 km scores full proximity weight, decaying to zero at 50 km.
    const proximity = Math.max(0, 1 - candidate.distanceKm / 50);
    score += MATCH_WEIGHTS.proximity * proximity;
  }

  if (recycler.pickupAvailable) {
    score += MATCH_WEIGHTS.pickupAvailable;
  }

  if (
    candidate.offerPricePerKg !== undefined &&
    candidate.referencePricePerKg !== undefined &&
    candidate.referencePricePerKg > 0
  ) {
    const ratio = candidate.offerPricePerKg / candidate.referencePricePerKg;
    score += MATCH_WEIGHTS.offerPrice * Math.min(1, Math.max(0, ratio));
  }

  return Number(score.toFixed(4));
}

/**
 * Rank recyclers for a lot.
 *
 * Hard filters (not scoring): only VERIFIED recyclers that accept at least
 * one of the lot's categories are eligible. This is a rule, not a weight -
 * an ineligible recycler must never be nudged into the list by a good score.
 */
export function rankRecyclerMatches(
  candidates: readonly MatchCandidate[],
  options: { limit?: number } = {},
): RecyclerMatch[] {
  const eligible = candidates.filter(
    (c) =>
      c.recycler.authorizationStatus === 'VERIFIED' &&
      c.lotCategoryIds.some((id) => c.recycler.acceptedCategoryIds.includes(id)),
  );

  const matches: RecyclerMatch[] = eligible
    .map((c) => ({
      recyclerId: c.recycler.id,
      businessName: c.recycler.businessName,
      authorizationStatus: c.recycler.authorizationStatus,
      score: scoreCandidate(c),
      reasons: reasonsFor(c),
      ...(c.distanceKm !== undefined ? { distanceKm: Number(c.distanceKm.toFixed(1)) } : {}),
      pickupAvailable: c.recycler.pickupAvailable,
      acceptedCategoryIds: c.recycler.acceptedCategoryIds,
      demo: c.recycler.demo,
    }))
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      // Stable, meaningful tiebreak.
      const aDist = a.distanceKm ?? Number.POSITIVE_INFINITY;
      const bDist = b.distanceKm ?? Number.POSITIVE_INFINITY;
      if (aDist !== bDist) {
        return aDist - bDist;
      }
      return a.recyclerId.localeCompare(b.recyclerId);
    });

  return options.limit !== undefined ? matches.slice(0, options.limit) : matches;
}
