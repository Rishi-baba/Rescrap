/**
 * ReScrap shared service contract.
 *
 * Rule master prompt 6 / technical-approach.md 3.2:
 * The demo implementation and the real API implementation satisfy this
 * IDENTICAL interface. Switching is configuration, not a rewrite.
 *
 * The interface is business-resource shaped, never UI-component shaped
 * (master prompt 32).
 *
 * The view models in this file are the ROLE-SPECIFIC PROJECTIONS of the one
 * shared Lot (master prompt 16). Collector, Recycler and Admin receive
 * different projections of the same record - never separate copies.
 */

import type {
  AiPrediction,
  AppNotification,
  AuditEvent,
  Collector,
  Coordinates,
  Handover,
  Locale,
  Lot,
  LotCondition,
  LotState,
  Material,
  MaterialCategory,
  OfferState,
  PriceRecord,
  Recycler,
  RecyclerAuthorizationStatus,
  RecyclerMatch,
  RecyclerOffer,
  Role,
  SafetyContent,
  SourceType,
  TraceabilityRecord,
  Transaction,
  TransactionStatus,
  User,
} from '../domain/types.js';
import type { Money, WeightKg } from '../domain/money.js';

/* ------------------------------------------------------------------ *
 * Auth
 * ------------------------------------------------------------------ */

export interface OtpRequestResult {
  sent: boolean;
  /** Present only when RESCRAP_OTP_DELIVERY=console in development. */
  devCode?: string;
  retryAfterSeconds: number;
  demo: boolean;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  user: User;
  collector?: Collector;
  recycler?: Recycler;
  demo: boolean;
}

/* ------------------------------------------------------------------ *
 * Role-specific projections of the shared Lot
 * ------------------------------------------------------------------ */

/** What the Collector sees (master prompt 16). */
export interface CollectorLotView {
  id: string;
  state: LotState;
  stateLabel: Record<Locale, string>;
  items: Array<{
    materialId: string;
    materialLabel: Record<Locale, string>;
    materialIcon: string;
    hazardFlags: readonly string[];
    declaredWeightKg: WeightKg;
    condition: LotCondition;
    photoCount: number;
  }>;
  totalWeightKg: WeightKg;
  collectionArea: string;
  sourceType: SourceType;
  /** RULE PRICE-02/03: unmistakably labelled as an estimate. */
  estimatedValue: Money;
  estimateMethod: 'rule' | 'model';
  estimateComputedAt: string;
  offerCount: number;
  bestOfferAmount?: Money;
  acceptedRecyclerName?: string;
  handoverState?: Handover['state'];
  paymentState?: 'PENDING' | 'CONFIRMED' | 'DISPUTED' | 'CANCELLED';
  paymentAmount?: Money;
  createdAt: string;
  updatedAt: string;
  demo: boolean;
}

/** What the Recycler sees. */
export interface RecyclerLotView {
  id: string;
  state: LotState;
  stateLabel: Record<Locale, string>;
  items: Array<{
    materialId: string;
    materialLabel: Record<Locale, string>;
    materialIcon: string;
    hazardFlags: readonly string[];
    declaredWeightKg: WeightKg;
    condition: LotCondition;
    photoKeys: readonly string[];
  }>;
  totalWeightKg: WeightKg;
  /** Area, not precise coordinates, until a pickup is scheduled (PRIV-04). */
  collectionArea: string;
  estimatedValue: Money;
  myOffer?: OfferState;
  myOfferAmount?: Money;
  offerCount: number;
  /** Never present. The recycler has no business need for it. */
  collectorName: never;
  createdAt: string;
  demo: boolean;
}

/** What Admin sees. Full projection plus governance context. */
export interface AdminLotView {
  id: string;
  state: LotState;
  collectorId: string;
  recyclerId?: string;
  items: Array<{ materialId: string; declaredWeightKg: WeightKg; condition: LotCondition }>;
  totalWeightKg: WeightKg;
  estimatedValue: Money;
  offerCount: number;
  handoverState?: Handover['state'];
  paymentState?: string;
  transactionStatus?: TransactionStatus;
  requiresReview: boolean;
  anomalyFlags: ReadonlyArray<{ code: string; severity: string; message: string }>;
  createdAt: string;
  updatedAt: string;
  demo: boolean;
}

export interface LotPassportView {
  lotId: string;
  /** Full lifecycle, in order. This is the collector's permanent record. */
  chain: Array<{
    event: string;
    label: Record<Locale, string>;
    at: string;
    detail: string;
  }>;
  summary: {
    materialSummary: string;
    totalWeightKg: WeightKg;
    recyclerName?: string;
    quotedAmount?: Money;
    finalAmount?: Money;
    method?: 'CASH' | 'DIGITAL';
    paymentSimulated: boolean;
    completedAt?: string;
  };
  demo: boolean;
}

export interface PriceBoardRow {
  materialId: string;
  materialLabel: Record<Locale, string>;
  materialIcon: string;
  hazardFlags: readonly string[];
  buyingPricePerKg: Money;
  effectiveFrom: string;
  /** True when the record is older than the staleness window. */
  stale: boolean;
  demo: boolean;
}

export interface EarningsView {
  /** RULE EARN-01: only CONFIRMED payments are counted here. */
  confirmedTotal: Money;
  pendingTotal: Money;
  disputedTotal: Money;
  lotCount: number;
  ledger: Array<{
    lotId: string;
    at: string;
    amount: Money;
    method: 'CASH' | 'DIGITAL';
    simulated: boolean;
    materialSummary: string;
  }>;
  demo: boolean;
}

export interface RecyclerDashboardView {
  newLotsCount: number;
  pendingOffersCount: number;
  activeDealsCount: number;
  upcomingPickupsCount: number;
  completedCount: number;
  /** Percentage 0-100. Derived from real offers on this recycler's record. */
  acceptanceRate: number;
  /** Rule FD-11: every metric carries the decision it supports. */
  metricRationale: ReadonlyArray<{ metric: string; decision: Record<Locale, string> }>;
  upcomingPickups: Array<{
    lotId: string;
    scheduledFor: string;
    collectionArea: string;
  }>;
  pendingActions: Array<{ lotId: string; action: string; at: string }>;
  demo: boolean;
}

export interface AdminDashboardView {
  totalLots: number;
  lotsByState: Record<string, number>;
  verificationQueueDepth: number;
  openDisputes: number;
  exceptions: number;
  confirmedPayments: Money;
  /** Rule PRIV-06: aggregates only, never personal data. */
  demo: boolean;
}

export interface ClassificationResultView {
  suggestions: Array<{
    materialId: string;
    materialLabel: Record<Locale, string>;
    confidence: number;
    method: 'rule';
    rationale: string;
  }>;
  requiresManualSelection: boolean;
  demo: boolean;
}

export interface ApiEnvelope<T> {
  data: T;
  demo: boolean;
  at: string;
}

export interface ApiErrorShape {
  code: string;
  message: string;
  /** Stable, language-independent. The UI maps this to a plain message. */
  field?: string;
}

/* ------------------------------------------------------------------ *
 * The service contract
 * ------------------------------------------------------------------ */

export interface ReScrapService {
  /* --- Auth --- */
  requestOtp(phone: string, role: Role): Promise<OtpRequestResult>;
  verifyOtp(phone: string, role: Role, code: string): Promise<AuthSession>;
  refresh(refreshToken: string): Promise<AuthSession>;
  logout(): Promise<void>;
  currentUser(): Promise<AuthSession | null>;
  completeProfile(input: { displayName: string; locale: Locale; baseArea?: string }): Promise<AuthSession>;

  /* --- Catalogue --- */
  listMaterialCategories(): Promise<MaterialCategory[]>;
  listMaterials(): Promise<Material[]>;
  getSafetyContent(materialId: string): Promise<SafetyContent[]>;

  /* --- Pricing --- */
  priceBoard(area: string): Promise<PriceBoardRow[]>;
  priceHistory(materialId: string): Promise<PriceRecord[]>;

  /* --- Collector --- */
  createLot(input: {
    items: Array<{
      materialId: string;
      materialConfirmed: true;
      declaredWeightKg: WeightKg;
      condition: LotCondition;
      sourceType: SourceType;
      photoKeys: string[];
      notes?: string;
    }>;
    collectionArea: string;
    idempotencyKey: string;
  }): Promise<CollectorLotView>;
  submitLot(lotId: string, idempotencyKey: string): Promise<CollectorLotView>;
  listMyLots(): Promise<CollectorLotView[]>;
  getMyLot(lotId: string): Promise<CollectorLotView>;
  matchRecyclers(lotId: string): Promise<RecyclerMatch[]>;
  acceptOffer(offerId: string, idempotencyKey: string): Promise<CollectorLotView>;
  declineOffer(offerId: string, idempotencyKey: string): Promise<CollectorLotView>;
  verifyHandover(
    handoverId: string,
    acknowledgeDiscrepancy: boolean,
    idempotencyKey: string,
  ): Promise<CollectorLotView>;
  getPassport(lotId: string): Promise<LotPassportView>;
  getEarnings(): Promise<EarningsView>;
  listMyNotifications(): Promise<AppNotification[]>;

  /* --- Recycler --- */
  recyclerDashboard(): Promise<RecyclerDashboardView>;
  listAvailableLots(filters: {
    materialCategoryId?: string;
    area?: string;
    minWeightKg?: number;
    maxWeightKg?: number;
  }): Promise<RecyclerLotView[]>;
  getRecyclerLot(lotId: string): Promise<RecyclerLotView>;
  makeOffer(input: {
    lotId: string;
    amount: Money;
    validUntil: string;
    message?: string;
    justification?: string;
    idempotencyKey: string;
  }): Promise<RecyclerOffer>;
  listMyOffers(): Promise<RecyclerOffer[]>;
  schedulePickup(lotId: string, scheduledFor: string, idempotencyKey: string): Promise<Handover>;
  executeHandover(input: {
    handoverId: string;
    finalWeightKg: WeightKg;
    photoKeys: string[];
    location: Coordinates;
    idempotencyKey: string;
  }): Promise<Handover>;
  confirmHandover(handoverId: string, idempotencyKey: string): Promise<Handover>;
  listTransactions(): Promise<Transaction[]>;
  getMyRecyclerProfile(): Promise<Recycler>;

  /* --- Shared --- */
  getHandover(handoverId: string): Promise<Handover>;
  listTraceability(lotId: string): Promise<TraceabilityRecord[]>;
  classifyMaterial(input: {
    keywordHints: string[];
    explicitMaterialKey?: string;
  }): Promise<ClassificationResultView>;

  /* --- Admin --- */
  adminDashboard(): Promise<AdminDashboardView>;
  listPendingVerification(): Promise<Recycler[]>;
  decideVerification(recyclerId: string, decision: string, reason: string): Promise<Recycler>;
  listLotsForAdmin(): Promise<AdminLotView[]>;
  listAuditEvents(): Promise<AuditEvent[]>;
  recordPrice(input: {
    materialId: string;
    area: string;
    buyingPricePerKg: Money;
    effectiveFrom: string;
    sourceLabel: string;
  }): Promise<PriceRecord>;
  listAnomalyFlags(): Promise<Array<{ lotId: string; code: string; severity: string; message: string }>>;
  listAiPredictions(): Promise<AiPrediction[]>;

  /* --- Offline sync --- */
  /**
   * Rule FRD-03: replay must be idempotent. The server returns the original
   * result for a repeated idempotency key rather than creating a duplicate.
   */
  syncBatch(operations: SyncOperation[]): Promise<SyncResult[]>;
}

export interface SyncOperation {
  idempotencyKey: string;
  entity: 'LOT' | 'OFFER_RESPONSE' | 'HANDOVER_VERIFICATION' | 'PROFILE';
  operation: 'CREATE' | 'UPDATE' | 'SUBMIT' | 'RESPOND' | 'VERIFY';
  clientCreatedAt: string;
  payload: Record<string, unknown>;
}

export interface SyncResult {
  idempotencyKey: string;
  status: 'APPLIED' | 'DUPLICATE' | 'REJECTED';
  entityId?: string;
  error?: ApiErrorShape;
  demo: boolean;
}

/** Narrow an unknown value to a role. Used by route guards. */
export function isRole(value: unknown): value is Role {
  return value === 'COLLECTOR' || value === 'RECYCLER' || value === 'ADMIN';
}

export function isAuthorizationStatus(value: unknown): value is RecyclerAuthorizationStatus {
  return (
    value === 'UNVERIFIED' ||
    value === 'PENDING_REVIEW' ||
    value === 'VERIFIED' ||
    value === 'SUSPENDED' ||
    value === 'REJECTED'
  );
}

/** Shared lot payload for the internal API. Not a role projection. */
export type LotRecord = Lot;
