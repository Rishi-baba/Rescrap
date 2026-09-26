/**
 * ReScrap validation schemas.
 *
 * Rule VAL-01: validation at every boundary - HTTP, sync outbox, AI input.
 * These schemas are the SINGLE definition, used by the API to validate and
 * by the clients to type their forms (technical-approach.md 5).
 */

import { z } from 'zod';
import { MAX_SANE_WEIGHT_KG } from '../domain/money.js';
import { LOT_ID_PREFIX } from '../domain/ids.js';

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{7,14}$/, 'Phone must be 7-15 digits, optional leading +');

export const localeSchema = z.enum(['en', 'hi', 'mr']);
export const roleSchema = z.enum(['COLLECTOR', 'RECYCLER', 'ADMIN']);

export const moneySchema = z
  .number()
  .int('Amounts must be integer minor units (paise)')
  .nonnegative('Amount cannot be negative');

export const positiveMoneySchema = moneySchema.refine((v) => v > 0, {
  message: 'Amount must be greater than zero',
});

/** Rule VAL-02: finite, > 0, within a sane upper bound. */
export const weightSchema = z
  .number()
  .finite('Weight must be a finite number')
  .positive('Weight must be greater than zero')
  .max(MAX_SANE_WEIGHT_KG, `Weight exceeds sane bound of ${MAX_SANE_WEIGHT_KG} kg`);

/** Rule VAL-06: valid bounds, rounded to operational precision (~11 m). */
export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const lotIdSchema = z
  .string()
  .regex(new RegExp(`^${LOT_ID_PREFIX}\\d{5,}$`), 'Invalid scrap ID format');

export const idempotencyKeySchema = z
  .string()
  .min(8)
  .max(128)
  .regex(/^[A-Za-z0-9_-]+$/, 'Idempotency key must be URL-safe');

export const lotConditionSchema = z.enum(['GOOD', 'FAIR', 'POOR', 'MIXED']);
export const sourceTypeSchema = z.enum(['HOUSEHOLD', 'IT_OFFICE', 'COMMERCIAL', 'MIXED']);
export const lotStateSchema = z.enum([
  'DRAFT',
  'CREATED',
  'MATCHING',
  'OFFER_RECEIVED',
  'NEGOTIATION',
  'ACCEPTED',
  'HANDOVER_SCHEDULED',
  'HANDED_OVER',
  'RECEIVED',
  'PROCESSED',
  'CLOSED',
  'CANCELLED',
  'DISPUTED',
]);
export const paymentMethodSchema = z.enum(['CASH', 'DIGITAL']);

/* ------------------------------------------------------------------ *
 * Auth
 * ------------------------------------------------------------------ */

export const otpRequestSchema = z.object({
  phone: phoneSchema,
  role: roleSchema,
});

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  role: roleSchema,
  code: z.string().trim().regex(/^\d{4,8}$/, 'OTP must be 4-8 digits'),
});

/* ------------------------------------------------------------------ *
 * Profile
 * ------------------------------------------------------------------ */

export const completeProfileSchema = z.object({
  displayName: z.string().trim().min(2, 'Name is too short').max(80),
  locale: localeSchema,
  /**
   * Deliberately narrow. Rule PRIV-03 / assumption A6: no government ID,
   * no address, no documents for the MVP.
   */
  baseArea: z.string().trim().max(80).optional(),
});

/* ------------------------------------------------------------------ *
 * Lots
 * ------------------------------------------------------------------ */

export const lotItemInputSchema = z.object({
  materialId: z.string().min(1),
  /**
   * Rule LOT-06: material is only persisted once the collector confirmed it.
   */
  materialConfirmed: z.literal(true, {
    errorMap: () => ({ message: 'Material must be confirmed by the collector' }),
  }),
  declaredWeightKg: weightSchema,
  condition: lotConditionSchema,
  sourceType: sourceTypeSchema,
  photoKeys: z.array(z.string().min(1).max(200)).max(10).default([]),
  notes: z.string().trim().max(280).optional(),
});

/**
 * Lot creation. Rule FRD-03: an idempotency key is mandatory so an offline
 * replay cannot create a duplicate lot.
 */
export const createLotSchema = z.object({
  items: z.array(lotItemInputSchema).min(1, 'A scrap lot needs at least one item'),
  collectionArea: z.string().trim().min(2, 'Collection area is required').max(80),
  idempotencyKey: idempotencyKeySchema,
});

export const submitLotSchema = z.object({
  lotId: lotIdSchema,
  idempotencyKey: idempotencyKeySchema,
});

export const listLotsQuerySchema = z.object({
  state: lotStateSchema.optional(),
  materialCategoryId: z.string().optional(),
  minWeightKg: weightSchema.optional(),
  maxWeightKg: weightSchema.optional(),
  area: z.string().trim().max(80).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().max(200).optional(),
});

/* ------------------------------------------------------------------ *
 * Offers
 * ------------------------------------------------------------------ */

export const createOfferSchema = z.object({
  lotId: lotIdSchema,
  amount: positiveMoneySchema,
  validUntil: z.string().datetime({ message: 'Offer validity must be an ISO datetime' }),
  message: z.string().trim().max(280).optional(),
  /**
   * Rule OFFER-04: required when the amount sits outside the sanity band.
   * Cross-field check lives in the API service which knows the estimate.
   */
  justification: z.string().trim().max(280).optional(),
  idempotencyKey: idempotencyKeySchema,
});

export const respondToOfferSchema = z.object({
  action: z.enum(['ACCEPT', 'REJECT', 'WITHDRAW', 'COUNTER']),
  counterAmount: positiveMoneySchema.optional(),
  message: z.string().trim().max(280).optional(),
  idempotencyKey: idempotencyKeySchema,
});

/* ------------------------------------------------------------------ *
 * Handover
 * ------------------------------------------------------------------ */

export const scheduleHandoverSchema = z.object({
  lotId: lotIdSchema,
  scheduledFor: z.string().datetime(),
  idempotencyKey: idempotencyKeySchema,
});

export const executeHandoverSchema = z.object({
  handoverId: z.string().min(1),
  finalWeightKg: weightSchema,
  photoKeys: z.array(z.string().min(1).max(200)).min(1, 'At least one handover photo is required'),
  location: coordinatesSchema,
  idempotencyKey: idempotencyKeySchema,
});

export const verifyHandoverSchema = z.object({
  handoverId: z.string().min(1),
  /** Optional: a collector may acknowledge and accept a discrepancy. */
  acknowledgeDiscrepancy: z.boolean().default(false),
  idempotencyKey: idempotencyKeySchema,
});

/* ------------------------------------------------------------------ *
 * Payment
 * ------------------------------------------------------------------ */

/**
 * Note what is deliberately ABSENT: no amount field.
 * Rule PAY-03 / FRD-02: the final amount is server-computed from the
 * accepted offer rate and the reconciled final weight. A client-supplied
 * amount would be a trust violation.
 */
export const recordPaymentSchema = z.object({
  lotId: lotIdSchema,
  method: paymentMethodSchema,
  /**
   * Rule PAY-04 / HON-02: no completion without a confirmation reference or
   * an explicit simulated marker. One of the two is required.
   */
  confirmationReference: z.string().trim().min(4).max(120).optional(),
  simulated: z.boolean().default(true),
  idempotencyKey: idempotencyKeySchema,
});

/* ------------------------------------------------------------------ *
 * AI
 * ------------------------------------------------------------------ */

export const classifyMaterialSchema = z.object({
  keywordHints: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
  explicitMaterialKey: z.string().trim().max(40).optional(),
});

/* ------------------------------------------------------------------ *
 * Admin
 * ------------------------------------------------------------------ */

export const verifyRecyclerSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT', 'SUSPEND', 'REACTIVATE']),
  /** Rule AUD-04: a reason is mandatory on rejection. */
  reason: z.string().trim().min(3, 'A reason is required').max(280),
});

export const recordPriceSchema = z.object({
  materialId: z.string().min(1),
  area: z.string().trim().min(1).max(80),
  buyingPricePerKg: positiveMoneySchema,
  quotedPricePerKg: positiveMoneySchema.optional(),
  effectiveFrom: z.string().datetime(),
  sourceLabel: z.string().trim().min(2).max(120),
});

/* ------------------------------------------------------------------ *
 * Offline sync
 * ------------------------------------------------------------------ */

export const outboxOperationSchema = z.object({
  idempotencyKey: idempotencyKeySchema,
  entity: z.enum(['LOT', 'OFFER_RESPONSE', 'HANDOVER_VERIFICATION', 'PROFILE']),
  operation: z.enum(['CREATE', 'UPDATE', 'SUBMIT', 'RESPOND', 'VERIFY']),
  clientCreatedAt: z.string().datetime(),
  payload: z.record(z.unknown()),
});

/**
 * Rule FRD-03: replaying the outbox must be safe. The API dedupes on
 * idempotencyKey and returns the original result rather than creating a
 * duplicate lot.
 */
export const syncBatchSchema = z.object({
  operations: z.array(outboxOperationSchema).min(1).max(50),
});

export type CreateLotInput = z.infer<typeof createLotSchema>;
export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type ExecuteHandoverInput = z.infer<typeof executeHandoverSchema>;
export type SyncBatchInput = z.infer<typeof syncBatchSchema>;
export type OutboxOperation = z.infer<typeof outboxOperationSchema>;
