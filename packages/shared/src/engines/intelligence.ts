/**
 * ReScrap material classification and anomaly detection.
 *
 * IMPORTANT HONESTY NOTE (master prompt 20, AI-08, AI-09):
 * No trained model exists. These are DETERMINISTIC rule-based implementations
 * behind the same interfaces a trained model would implement. Every result
 * reports `method: 'rule'`. No accuracy is claimed, because none has been
 * measured. [DATA REQUIRED] for any real accuracy figure.
 */

import type { AiPrediction, HazardFlag, Material } from '../domain/types.js';
import { type Money, type WeightKg } from '../domain/money.js';

/* ------------------------------------------------------------------ *
 * Material classification
 * ------------------------------------------------------------------ */

export interface ClassificationInput {
  /** Optional keyword hints derived on-device from the photo filename or EXIF-free metadata. */
  keywordHints?: readonly string[];
  /** Optional explicit user selection. When present, this wins outright. */
  explicitMaterialKey?: string;
}

export interface ClassificationSuggestion {
  materialId: string;
  materialKey: string;
  confidence: number;
  method: 'rule';
  /** Rule that fired. Present so the suggestion can be explained. */
  rationale: string;
}

export interface ClassificationResult {
  suggestions: ClassificationSuggestion[];
  /** Best suggestion, or undefined when nothing matched. */
  best?: ClassificationSuggestion;
  /** True when confidence is below the auto-suggest threshold. */
  requiresManualSelection: boolean;
}

/** Below this, the UI must push manual selection rather than present a guess. */
export const AUTO_SUGGEST_CONFIDENCE_THRESHOLD = 0.55;

interface ClassificationRule {
  materialKey: string;
  keywords: readonly string[];
  /** Rule-derived prior confidence. NOT a measured model accuracy. */
  baseConfidence: number;
}

/**
 * Keyword heuristic catalogue. This is a transparent lookup, not a model.
 */
export const CLASSIFICATION_RULES: readonly ClassificationRule[] = [
  { materialKey: 'mobile-phone', keywords: ['phone', 'mobile', 'smartphone', 'iphone', 'android'], baseConfidence: 0.72 },
  { materialKey: 'laptop', keywords: ['laptop', 'notebook', 'macbook', 'computer'], baseConfidence: 0.75 },
  { materialKey: 'desktop-cpu', keywords: ['desktop', 'cpu', 'tower', 'pc'], baseConfidence: 0.68 },
  { materialKey: 'television', keywords: ['tv', 'television', 'led', 'lcd'], baseConfidence: 0.7 },
  { materialKey: 'crt-monitor', keywords: ['crt', 'monitor', 'bulky tv'], baseConfidence: 0.66 },
  { materialKey: 'battery', keywords: ['battery', 'batteries', 'cell', 'power bank'], baseConfidence: 0.8 },
  { materialKey: 'cable', keywords: ['cable', 'wire', 'wires', 'charger', 'adapter'], baseConfidence: 0.65 },
  { materialKey: 'printer', keywords: ['printer', 'scanner', 'toner'], baseConfidence: 0.7 },
  { materialKey: 'refrigerator', keywords: ['fridge', 'refrigerator', 'ac', 'cooler', 'compressor'], baseConfidence: 0.72 },
  { materialKey: 'home-appliance', keywords: ['mixer', 'grinder', 'washing machine', 'microwave', 'iron'], baseConfidence: 0.64 },
  { materialKey: 'circuit-board', keywords: ['pcb', 'board', 'circuit', 'motherboard'], baseConfidence: 0.6 },
  { materialKey: 'metal-scrap', keywords: ['steel', 'iron', 'aluminium', 'metal', 'utensil'], baseConfidence: 0.6 },
];

/**
 * Rule-based classification. Always returns a reason and never claims to be
 * a model. A collector confirmation is still required before the material
 * is persisted on a lot item (LOT-06, AI-03).
 */
export function classifyMaterial(
  input: ClassificationInput,
  catalogue: readonly Material[],
): ClassificationResult {
  if (input.explicitMaterialKey) {
    const explicit = catalogue.find((m) => m.key === input.explicitMaterialKey);
    if (explicit) {
      return {
        suggestions: [
          {
            materialId: explicit.id,
            materialKey: explicit.key,
            confidence: 1,
            method: 'rule',
            rationale: 'Collector selected this material directly.',
          },
        ],
        best: {
          materialId: explicit.id,
          materialKey: explicit.key,
          confidence: 1,
          method: 'rule',
          rationale: 'Collector selected this material directly.',
        },
        requiresManualSelection: false,
      };
    }
  }

  const hints = (input.keywordHints ?? []).map((h) => h.toLowerCase().trim());
  if (hints.length === 0) {
    return { suggestions: [], requiresManualSelection: true };
  }

  const suggestions: ClassificationSuggestion[] = [];

  for (const rule of CLASSIFICATION_RULES) {
    const matched = rule.keywords.filter((k) => hints.some((h) => h.includes(k)));
    if (matched.length === 0) {
      continue;
    }
    // Rule AI-08: a lone keyword is not enough to auto-select a material.
    // "board" alone could be a PCB, a wooden board or a notice board, so a
    // single match is held below the auto-suggest threshold and the collector
    // is asked to confirm. More distinct keyword hits -> higher confidence,
    // capped below certainty because this is a heuristic, not a measurement.
    const corroboration = matched.length === 1 ? 0 : 1;
    const raw = rule.baseConfidence + (matched.length - 1) * 0.05;
    const confidence = Number(
      (corroboration === 0
        ? Math.min(raw, AUTO_SUGGEST_CONFIDENCE_THRESHOLD - 0.01)
        : Math.min(raw, 0.9)).toFixed(2),
    );
    const material = catalogue.find((m) => m.key === rule.materialKey);
    if (!material) {
      continue;
    }
    suggestions.push({
      materialId: material.id,
      materialKey: material.key,
      confidence,
      method: 'rule',
      rationale: `Matched keyword${matched.length > 1 ? 's' : ''}: ${matched.join(', ')}. Confirm or change this.`,
    });
  }

  suggestions.sort((a, b) => b.confidence - a.confidence);
  const best = suggestions[0];

  return {
    suggestions,
    ...(best ? { best } : {}),
    requiresManualSelection: !best || best.confidence < AUTO_SUGGEST_CONFIDENCE_THRESHOLD,
  };
}

/* ------------------------------------------------------------------ *
 * Transaction anomaly detection
 * ------------------------------------------------------------------ */

export type AnomalyCode =
  | 'WEIGHT_OUTLIER'
  | 'PRICE_OUTLIER'
  | 'LOCATION_INCONSISTENT'
  | 'IMMEDIATE_CLOSURE'
  | 'RATE_MISMATCH'
  | 'HAZARD_MISSING';

export interface AnomalyFlag {
  code: AnomalyCode;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  observed: number;
  expected: number | null;
}

/**
 * Rule AI-06: anomaly detection FLAGS ONLY. It never auto-rejects,
 * auto-cancels or auto-adjusts a transaction. Output feeds the Admin
 * exception queue.
 */
export interface AnomalyInput {
  declaredWeightKg: WeightKg;
  finalWeightKg: WeightKg;
  offerAmount: Money;
  estimatedValue: Money;
  /** kg/kg reference ratio for this material from completed transactions. */
  historicalPricePerKg?: Money;
  /** Area captured at lot creation. */
  collectionArea?: string;
  /** Area captured at handover. */
  handoverArea?: string;
  /** Hours between lot creation and handover. */
  hoursOpen: number;
  materialHazardFlags: readonly HazardFlag[];
  photoCount: number;
}

/** Declared vs final weight tolerance. Rule HAND-04. */
export const WEIGHT_TOLERANCE_RATIO = 0.1;

export function weightDiscrepancyPercent(declared: WeightKg, final: WeightKg): number {
  if (declared <= 0) {
    return 0;
  }
  return Number((((final - declared) / declared) * 100).toFixed(2));
}

export function requiresWeightReview(declared: WeightKg, final: WeightKg): boolean {
  return Math.abs(weightDiscrepancyPercent(declared, final)) / 100 > WEIGHT_TOLERANCE_RATIO;
}

export function detectAnomalies(input: AnomalyInput): AnomalyFlag[] {
  const flags: AnomalyFlag[] = [];

  // --- Weight ---
  const discrepancy = weightDiscrepancyPercent(input.declaredWeightKg, input.finalWeightKg);
  if (Math.abs(discrepancy) / 100 > WEIGHT_TOLERANCE_RATIO) {
    flags.push({
      code: 'WEIGHT_OUTLIER',
      severity: Math.abs(discrepancy) / 100 > 0.3 ? 'HIGH' : 'MEDIUM',
      message: `Final weight differs from declared weight by ${Math.abs(discrepancy)}%.`,
      observed: Number(input.finalWeightKg.toFixed(2)),
      expected: Number(input.declaredWeightKg.toFixed(2)),
    });
  }

  // --- Price vs platform estimate ---
  if (input.estimatedValue > 0) {
    const ratio = input.offerAmount / input.estimatedValue;
    if (ratio < 0.5) {
      flags.push({
        code: 'PRICE_OUTLIER',
        severity: 'HIGH',
        message: `Offer is ${Math.round((1 - ratio) * 100)}% below the estimated value.`,
        observed: input.offerAmount,
        expected: input.estimatedValue,
      });
    } else if (ratio > 1.75) {
      flags.push({
        code: 'PRICE_OUTLIER',
        severity: 'LOW',
        message: `Offer is ${Math.round((ratio - 1) * 100)}% above the estimated value. Check for mis-entered weight.`,
        observed: input.offerAmount,
        expected: input.estimatedValue,
      });
    }
  }

  // --- Rate vs historical price for the material ---
  if (input.historicalPricePerKg && input.historicalPricePerKg > 0 && input.finalWeightKg > 0) {
    const expectedPerKg = Math.round(input.offerAmount / input.finalWeightKg);
    const ratio = expectedPerKg / input.historicalPricePerKg;
    if (ratio < 0.6 || ratio > 1.6) {
      flags.push({
        code: 'RATE_MISMATCH',
        severity: 'MEDIUM',
        message: `Effective rate differs from the usual rate for this material.`,
        observed: expectedPerKg,
        expected: input.historicalPricePerKg,
      });
    }
  }

  // --- Location consistency ---
  if (input.collectionArea && input.handoverArea && input.collectionArea !== input.handoverArea) {
    flags.push({
      code: 'LOCATION_INCONSISTENT',
      severity: 'LOW',
      message: 'Handover area differs from the area the lot was listed in.',
      observed: 0,
      expected: null,
    });
  }

  // --- Closure speed ---
  if (input.hoursOpen < 1) {
    flags.push({
      code: 'IMMEDIATE_CLOSURE',
      severity: 'LOW',
      message: 'Lot closed unusually quickly after creation. Worth a look for data quality.',
      observed: input.hoursOpen,
      expected: null,
    });
  }

  // --- Evidence completeness ---
  if (input.materialHazardFlags.length > 0 && input.photoCount === 0) {
    flags.push({
      code: 'HAZARD_MISSING',
      severity: 'MEDIUM',
      message: 'Hazardous material recorded with no handover photographs.',
      observed: 0,
      expected: null,
    });
  }

  return flags;
}

/* ------------------------------------------------------------------ *
 * Safety content derivation
 * ------------------------------------------------------------------ */

export interface SafetyGuidance {
  headline: string;
  doNot: readonly string[];
  doInstead: readonly string[];
}

/**
 * Rule SAFE-04/05: material-attached safety guidance.
 * This function can only ever produce safe instructions. It has no path
 * that emits acid extraction, cable burning or CRT breaking advice.
 */
export function safetyGuidanceFor(flags: readonly HazardFlag[]): SafetyGuidance {
  const doNot = new Set<string>();
  const doInstead = new Set<string>();
  let headline = 'Handle carefully and keep it away from children.';

  if (flags.includes('BATTERY')) {
    headline = 'Battery - handle with care.';
    doNot.add('Do not touch both terminals at the same time.');
    doNot.add('Do not crush, puncture or burn any battery.');
    doInstead.add('Tape the terminals with tape before moving it.');
    doInstead.add('Keep batteries dry and away from heat.');
  }
  if (flags.includes('CABLE')) {
    doNot.add('Do not burn cables to strip them.');
    doInstead.add('Strip cable by hand or with a tool, and wear gloves.');
  }
  if (flags.includes('CRT')) {
    headline = 'TV or monitor - heavy and fragile.';
    doNot.add('Do not break the screen.');
    doNot.add('Do not carry it alone.');
    doInstead.add('Keep it upright and move it with help.');
  }
  if (flags.includes('SHARP')) {
    doNot.add('Do not cut towards your hands.');
    doInstead.add('Wear gloves and cut away from your body.');
  }
  if (flags.includes('REFRIGERANT') || flags.includes('MERCURY')) {
    doNot.add('Do not puncture or open the sealed part yourself.');
    doInstead.add('Hand this to the recycler as a sealed unit.');
  }
  if (flags.includes('TONER') || flags.includes('CHEMICAL')) {
    doNot.add('Do not open or shake the cartridge.');
    doInstead.add('Keep it in its cartridge and dry.');
  }

  doInstead.add('Wash your hands after handling.');
  doInstead.add('Keep scrap dry and off the ground.');

  return { headline, doNot: [...doNot], doInstead: [...doInstead] };
}

/** Convenience: build the AiPrediction record for a rule-based result. */
export function toAiPrediction(args: {
  capability: AiPrediction['capability'];
  confidence: number;
  result: string;
  lotId?: string;
  lotItemId?: string;
}): AiPrediction {
  return {
    id: '' as AiPrediction['id'],
    ...(args.lotId ? { lotId: args.lotId as AiPrediction['lotId'] } : {}),
    ...(args.lotItemId ? { lotItemId: args.lotItemId as AiPrediction['lotItemId'] } : {}),
    capability: args.capability,
    method: 'rule',
    confidence: args.confidence,
    result: args.result,
    createdAt: new Date().toISOString(),
    demo: true,
  };
}
