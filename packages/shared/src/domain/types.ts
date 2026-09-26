/**
 * ReScrap domain model.
 *
 * This file is the single source of truth for the ReScrap data model.
 * It is consumed by the API, the Collector App, the Recycler Portal and
 * the Admin Console. No application may redefine any type declared here.
 *
 * See system-architecture.md 8 for entity relationships.
 */

import type { Money, WeightKg } from './money.js';
import type {
  AdminId,
  AiPredictionId,
  AuditEventId,
  CollectorId,
  HandoverId,
  LotId,
  LotItemId,
  MaterialCategoryId,
  MaterialId,
  NotificationId,
  OfferId,
  PaymentId,
  PriceRecordId,
  RecyclerId,
  TraceabilityRecordId,
  TransactionId,
  UserId,
} from './ids.js';

/** Locale codes supported by the Collector App (prd.md 21). */
export type Locale = 'en' | 'hi' | 'mr';

export const SUPPORTED_LOCALES: readonly Locale[] = ['en', 'hi', 'mr'];

/** Roles. Authentication identifies; authorization decides (system-architecture.md 7). */
export type Role = 'COLLECTOR' | 'RECYCLER' | 'ADMIN';

/**
 * Demo provenance flag. Rule HON-06 / FRD-18:
 * Any entity carrying demo data must be flagged so the UI can label it.
 * Nothing in the MVP is real data, so this is `true` for all seeded records.
 */
export interface DemoFlag {
  demo: boolean;
}

export interface Timestamped extends DemoFlag {
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ *
 * Identity
 * ------------------------------------------------------------------ */

export interface User extends Timestamped {
  id: UserId;
  phone: string;
  role: Role;
  locale: Locale;
  displayName: string;
  /** Populated only after first-run profile completion. */
  profileComplete: boolean;
  /** Present only for ADMIN. MFA policy is [DATA REQUIRED] - see project-summary.md 10. */
  mfaEnrolled?: boolean;
}

export interface Collector extends Timestamped {
  id: CollectorId;
  userId: UserId;
  displayName: string;
  phone: string;
  locale: Locale;
  /**
   * Rule PRIV-01: no background or continuous location tracking.
   * This is the collector's declared home/base AREA, not a live position.
   */
  baseArea?: string;
  /**
   * Rule PRIV-03 / assumption A6: data minimisation.
   * No government ID, no address, no documents are collected for the MVP.
   */
  dataMinimised: true;
}

export type RecyclerAuthorizationStatus =
  | 'UNVERIFIED'
  | 'PENDING_REVIEW'
  | 'VERIFIED'
  | 'SUSPENDED'
  | 'REJECTED';

export interface Recycler extends Timestamped {
  id: RecyclerId;
  userId: UserId;
  businessName: string;
  phone: string;
  authorizationStatus: RecyclerAuthorizationStatus;
  /** Material category ids this recycler accepts (RECY-01). */
  acceptedCategoryIds: readonly MaterialCategoryId[];
  /** Areas served. Used for matching, not precise coordinates. */
  serviceAreas: readonly string[];
  pickupAvailable: boolean;
  /**
   * Rule HON-01: no real recycler authorization exists.
   * Seeded recyclers carry demo status and MUST be labelled in the UI.
   */
  authorizationIsDemo: boolean;
  verificationNote?: string;
}

export interface Admin extends Timestamped {
  id: AdminId;
  userId: UserId;
  displayName: string;
  permissions: readonly AdminPermission[];
}

export type AdminPermission =
  | 'recycler:verify'
  | 'recycler:manage'
  | 'collector:view'
  | 'material:manage'
  | 'price:manage'
  | 'transaction:view'
  | 'transaction:override'
  | 'dispute:resolve'
  | 'analytics:view'
  | 'audit:view'
  | 'safety:manage'
  | 'ai:view';

/* ------------------------------------------------------------------ *
 * Catalogue
 * ------------------------------------------------------------------ */

export interface MaterialCategory extends Timestamped {
  id: MaterialCategoryId;
  key: string;
  label: Record<Locale, string>;
  icon: string;
}

export interface Material extends Timestamped {
  id: MaterialId;
  categoryId: MaterialCategoryId;
  key: string;
  label: Record<Locale, string>;
  icon: string;
  /**
   * Rule SAFE-04: hazardous handling materials are flagged so a warning
   * can surface at the point of selection.
   */
  hazardFlags: readonly HazardFlag[];
  active: boolean;
}

export type HazardFlag =
  | 'BATTERY'
  | 'CRT'
  | 'CABLE'
  | 'TONER'
  | 'REFRIGERANT'
  | 'SHARP'
  | 'MERCURY'
  | 'CHEMICAL';

export interface SafetyContent extends Timestamped {
  materialId: MaterialId;
  locale: Locale;
  headline: Record<Locale, string>;
  /** Short imperative sentences. Never technical. */
  doNot: readonly string[];
  doInstead: readonly string[];
  pictogramKey: string;
}

/* ------------------------------------------------------------------ *
 * Pricing
 * ------------------------------------------------------------------ */

/**
 * Rule PRICE-01: a Price Record is effective-dated reference data.
 * It is NOT a binding quote and never overwrites a prior record.
 */
export interface PriceRecord extends Timestamped {
  id: PriceRecordId;
  materialId: MaterialId;
  area: string;
  /** Integer minor units per kilogram. */
  buyingPricePerKg: Money;
  /** Integer minor units per kilogram. Optional quoted/selling reference. */
  quotedPricePerKg?: Money;
  effectiveFrom: string;
  effectiveTo?: string;
  /** Null for platform-curated records. Set when sourced from a recycler. */
  sourceRecyclerId?: RecyclerId;
  sourceLabel: string;
}

/* ------------------------------------------------------------------ *
 * The Lot - the central shared business object (prd.md 11, master prompt 16)
 * ------------------------------------------------------------------ */

export type LotState =
  | 'DRAFT'
  | 'CREATED'
  | 'MATCHING'
  | 'OFFER_RECEIVED'
  | 'NEGOTIATION'
  | 'ACCEPTED'
  | 'HANDOVER_SCHEDULED'
  | 'HANDED_OVER'
  | 'RECEIVED'
  | 'PROCESSED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'DISPUTED';

export type LotCondition = 'GOOD' | 'FAIR' | 'POOR' | 'MIXED';

export type SourceType = 'HOUSEHOLD' | 'IT_OFFICE' | 'COMMERCIAL' | 'MIXED';

export interface LotItem extends Timestamped {
  id: LotItemId;
  lotId: LotId;
  materialId: MaterialId;
  /**
   * Material actually stored on the item. Per LOT-06 this is only ever set
   * from a CONFIRMED selection - an unconfirmed AI suggestion is never persisted here.
   */
  materialConfirmed: boolean;
  /** Collector declaration at lot creation. Not authoritative - see HAND-03. */
  declaredWeightKg: WeightKg;
  condition: LotCondition;
  photoKeys: readonly string[];
  notes?: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Lot extends Timestamped {
  id: LotId;
  /** Server-generated sequence. Never client-asserted (LOT-03). */
  sequence: number;
  collectorId: CollectorId;
  state: LotState;
  items: readonly LotItem[];
  sourceType: SourceType;
  /**
   * Rule PRIV-04: collectors expose an AREA for matching, not coordinates.
   * Precise location is only attached at handover scheduling.
   */
  collectionArea: string;
  /** Only present once a pickup is scheduled (workflow-and-security.md SB-4). */
  handoverLocation?: Coordinates;
  /**
   * Rule PRICE-04: estimated value is SERVER-computed, never accepted from a client.
   * Integer minor units.
   */
  estimatedValue: Money;
  estimateComputedAt: string;
  estimateMethod: EstimateMethod;
  acceptedOfferId?: OfferId;
  handoverId?: HandoverId;
  paymentId?: PaymentId;
  transactionId?: TransactionId;
  /** Client-generated, stable across retries (FRD-03). */
  idempotencyKey: string;
}

export type EstimateMethod = 'rule' | 'model';

/* ------------------------------------------------------------------ *
 * Offers
 * ------------------------------------------------------------------ */

export type OfferState =
  | 'PENDING'
  | 'COUNTERED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'WITHDRAWN'
  | 'EXPIRED'
  | 'SUPERSEDED';

export interface RecyclerOffer extends Timestamped {
  id: OfferId;
  lotId: LotId;
  recyclerId: RecyclerId;
  state: OfferState;
  /** Integer minor units for the whole lot. */
  amount: Money;
  /** Integer minor units per kilogram implied by this offer. */
  amountPerKg: Money;
  /** Rule OFFER-05: an offer is a binding commitment with a validity window. */
  validUntil: string;
  message?: string;
  /**
   * Rule OFFER-04: amounts outside the sanity band require an explicit
   * justification and are flagged.
   */
  outsideSanityBand: boolean;
  justification?: string;
  /** Chain of counter-offers. Full history is preserved (OFFER-08). */
  parentOfferId?: OfferId;
  respondedAt?: string;
  respondedBy?: UserId;
}

/* ------------------------------------------------------------------ *
 * Handover
 * ------------------------------------------------------------------ */

export type HandoverState = 'SCHEDULED' | 'EXECUTED' | 'CONFIRMED' | 'DISPUTED';

export interface HandoverPhoto {
  key: string;
  capturedAt: string;
  capturedByRole: Role;
}

/**
 * Trust-critical record. Rule HAND-02: BOTH parties must confirm.
 * Neither party alone completes the handover.
 */
export interface Handover extends Timestamped {
  id: HandoverId;
  lotId: LotId;
  recyclerId: RecyclerId;
  state: HandoverState;
  scheduledFor: string;
  /** Executed by the recycler. Becomes authoritative for valuation (HAND-03). */
  executedAt?: string;
  executedBy?: UserId;
  /** Authoritative final weight captured at handover. */
  finalWeightKg?: WeightKg;
  /** Declared weight retained for comparison (HAND-03). */
  declaredWeightKg: WeightKg;
  /** Rule HAND-04: discrepancy beyond tolerance holds payment. */
  discrepancyPercent?: number;
  requiresReview: boolean;
  photos: readonly HandoverPhoto[];
  /** Captured at handover only (HAND-07). */
  location?: Coordinates;
  /** Collector verification - required to complete the handover. */
  collectorVerifiedAt?: string;
  collectorVerifiedBy?: UserId;
  recyclerConfirmedAt?: string;
  recyclerConfirmedBy?: UserId;
  reference: string;
}

/* ------------------------------------------------------------------ *
 * Payment
 * ------------------------------------------------------------------ */

export type PaymentMethod = 'CASH' | 'DIGITAL';

/**
 * Rule PAY-01: CASH is first-class and must never be blocked or
 * deprioritised by lack of digital payment capability.
 */
export type PaymentState = 'PENDING' | 'CONFIRMED' | 'DISPUTED' | 'CANCELLED';

export interface Payment extends Timestamped {
  id: PaymentId;
  lotId: LotId;
  offerId: OfferId;
  recyclerId: RecyclerId;
  state: PaymentState;
  method: PaymentMethod;
  /**
   * Rule PAY-03: amount is computed from accepted rate x reconciled final
   * weight. NEVER accepted from a client.
   */
  amount: Money;
  amountPerKg: Money;
  /** Rule PAY-04 / HON-02: no completion without this or a simulated marker. */
  confirmationReference?: string;
  /**
   * Rule PAY-07: in the MVP no real money moves. Every seeded/completed
   * payment MUST set this so the UI can label it honestly.
   */
  simulated: boolean;
  confirmedAt?: string;
  paidAt?: string;
}

/* ------------------------------------------------------------------ *
 * Transaction
 * ------------------------------------------------------------------ */

export type TransactionStatus =
  | 'AWAITING_HANDOVER'
  | 'AWAITING_PAYMENT'
  | 'COMPLETED'
  | 'IN_RECYCLED_PROCESS'
  | 'RECYCLED'
  | 'DISPUTED';

/**
 * Rule TXN-03: status is DERIVED from component state, never set independently.
 */
export interface Transaction extends Timestamped {
  id: TransactionId;
  lotId: LotId;
  collectorId: CollectorId;
  recyclerId: RecyclerId;
  offerId: OfferId;
  handoverId: HandoverId;
  paymentId: PaymentId;
  status: TransactionStatus;
  quantityKg: WeightKg;
  amount: Money;
  method: PaymentMethod;
  completedAt?: string;
  /** Rule TXN-05: corrections are adjustment events, never edits. */
  adjustments: readonly TransactionAdjustment[];
}

export interface TransactionAdjustment {
  at: string;
  byUserId: UserId;
  reason: string;
  previousAmount: Money;
  newAmount: Money;
}

/* ------------------------------------------------------------------ *
 * Traceability & audit
 * ------------------------------------------------------------------ */

export type TraceabilityEventType =
  | 'LOT_CREATED'
  | 'MATERIAL_IDENTIFIED'
  | 'PHOTO_CAPTURED'
  | 'WEIGHT_CAPTURED'
  | 'ESTIMATE_COMPUTED'
  | 'RECYCLER_MATCHED'
  | 'OFFER_MADE'
  | 'OFFER_ACCEPTED'
  | 'PICKUP_SCHEDULED'
  | 'HANDOVER_EXECUTED'
  | 'RECYCLER_CONFIRMED'
  | 'COLLECTOR_VERIFIED'
  | 'PAYMENT_RECORDED'
  | 'RECYCLING_STATUS_UPDATED';

/**
 * Append-only. Rule AUD-01/AUD-05: never updated, never deleted.
 * This is the traceability chain of master prompt 36.
 */
export interface TraceabilityRecord {
  id: TraceabilityRecordId;
  lotId: LotId;
  sequence: number;
  event: TraceabilityEventType;
  at: string;
  actorUserId: UserId;
  actorRole: Role;
  detail: string;
  evidenceKeys: readonly string[];
  demo: boolean;
}

export type AuditAction =
  | 'ADMIN_LOGIN'
  | 'RECYCLER_APPROVED'
  | 'RECYCLER_REJECTED'
  | 'RECYCLER_SUSPENDED'
  | 'RECYCLER_REACTIVATED'
  | 'MATERIAL_CREATED'
  | 'MATERIAL_UPDATED'
  | 'PRICE_RECORDED'
  | 'LOT_STATE_OVERRIDDEN'
  | 'PAYMENT_ADJUSTED'
  | 'DISPUTE_OPENED'
  | 'DISPUTE_RESOLVED'
  | 'SAFETY_CONTENT_UPDATED'
  | 'TRANSACTION_DETAIL_VIEWED';

/** Append-only. Rule AUD-05: no update, no delete, for anyone. */
export interface AuditEvent {
  id: AuditEventId;
  at: string;
  actorUserId: UserId;
  actorRole: Role;
  action: AuditAction;
  targetType: string;
  targetId: string;
  before?: string;
  after?: string;
  reason?: string;
  demo: boolean;
}

/* ------------------------------------------------------------------ *
 * Notifications
 * ------------------------------------------------------------------ */

export type NotificationType =
  | 'OFFER_RECEIVED'
  | 'OFFER_ACCEPTED'
  | 'OFFER_DECLINED'
  | 'OFFER_EXPIRED'
  | 'PICKUP_SCHEDULED'
  | 'HANDOVER_CONFIRMED'
  | 'HANDOVER_READY'
  | 'PAYMENT_RECORDED'
  | 'LOT_ASSIGNED'
  | 'SYNC_COMPLETED'
  | 'NEW_LOT_AVAILABLE';

export interface AppNotification extends Timestamped {
  id: NotificationId;
  userId: UserId;
  role: Role;
  type: NotificationType;
  titleKey: string;
  bodyKey: string;
  params: Readonly<Record<string, string | number>>;
  lotId?: LotId;
  readAt?: string;
}

/* ------------------------------------------------------------------ *
 * AI / ML
 * ------------------------------------------------------------------ */

/**
 * Rule AI-01: every prediction records method and confidence.
 * Rule AI-08: where training data is insufficient, rule-based methods are
 * used and the method is labelled.
 */
export interface AiPrediction {
  id: AiPredictionId;
  lotId?: LotId;
  lotItemId?: LotItemId;
  capability: 'MATERIAL_CLASSIFICATION' | 'VALUATION' | 'MATCHING' | 'ANOMALY';
  method: 'model' | 'rule';
  /** 0..1. Always present. Never fabricated (AI-02). */
  confidence: number;
  /** Present only when method === 'model'. */
  modelVersion?: string;
  result: string;
  /** Set when a collector or recycler corrected the AI output. */
  correctedAt?: string;
  correctedBy?: UserId;
  createdAt: string;
  demo: boolean;
}

/* ------------------------------------------------------------------ *
 * Matching
 * ------------------------------------------------------------------ */

export type MatchReasonCode =
  | 'VERIFIED'
  | 'ACCEPTS_THIS_MATERIAL'
  | 'NEARBY'
  | 'PICKUP_AVAILABLE'
  | 'OFFER_PRICE'
  | 'RECENT_TRANSACTION';

/**
 * Rule AI-05 / prd.md 14: matching must be explainable. These reasons are
 * rendered as plain language - an unexplained score must never be shown.
 */
export interface MatchReason {
  code: MatchReasonCode;
  label: Record<Locale, string>;
}

export interface RecyclerMatch {
  recyclerId: RecyclerId;
  businessName: string;
  authorizationStatus: RecyclerAuthorizationStatus;
  /** Deterministic, explainable 0..1 ordering score. NOT presented as an AI score. */
  score: number;
  reasons: readonly MatchReason[];
  distanceKm?: number;
  pickupAvailable: boolean;
  acceptedCategoryIds: readonly MaterialCategoryId[];
  demo: boolean;
}
