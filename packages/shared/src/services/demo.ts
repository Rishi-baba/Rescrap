/**
 * ReScrap demo service - in-memory implementation of ReScrapService.
 *
 * Satisfies the IDENTICAL interface as the real API client
 * (technical-approach.md 3.2). Switching between them is configuration.
 *
 * This is the reference implementation of the shared transaction loop, and
 * it runs the SAME lifecycle state machine, pricing engine and matching
 * engine as the API. It is not a UI mock.
 *
 * Every response is flagged `demo: true` and every payment is flagged
 * `simulated: true` (rules-and-risk-controls.md HON-01..07).
 */

import { money, scaleMoney, type Money, type WeightKg } from '../domain/money.js';
import { formatLotId } from '../domain/ids.js';
import type {
  AiPrediction,
  AppNotification,
  AuditEvent,
  Collector,
  Coordinates,
  Handover,
  Lot,
  LotCondition,
  LotItem,
  LotState,
  Material,
  MaterialCategory,
  OfferState,
  PriceRecord,
  Recycler,
  RecyclerMatch,
  RecyclerOffer,
  Role,
  SafetyContent,
  SourceType,
  TraceabilityRecord,
  TraceabilityEventType,
  Transaction,
  User,
} from '../domain/types.js';
import type {
  AdminId,
  CollectorId,
  HandoverId,
  LotId,
  LotItemId,
  OfferId,
  PaymentId,
  PriceRecordId,
  TransactionId,
  UserId,
} from '../domain/ids.js';
import {
  LOT_STATE_PRESENTATION,
  isOfferEligible,
  nextState,
  type LotTransitionTrigger,
} from '../lifecycle/lot.js';
import { computeFinalAmount, estimateValue, findReferencePrice } from '../engines/pricing.js';
import { rankRecyclerMatches } from '../engines/matching.js';
import {
  AUTO_SUGGEST_CONFIDENCE_THRESHOLD,
  classifyMaterial,
  requiresWeightReview,
  weightDiscrepancyPercent,
} from '../engines/intelligence.js';
import { deriveTransactionStatus } from '../lifecycle/transaction.js';
import type {
  AdminDashboardView,
  AdminLotView,
  ApiErrorShape,
  AuthSession,
  ClassificationResultView,
  CollectorLotView,
  EarningsView,
  LotPassportView,
  OtpRequestResult,
  PriceBoardRow,
  RecyclerDashboardView,
  RecyclerLotView,
  ReScrapService,
  SyncOperation,
  SyncResult,
} from './contract.js';
import {
  DEMO_OTP_CODE,
  demoAiPredictions,
  demoAuditEvents,
  demoCollectors,
  demoMaterialCategories,
  demoMaterials,
  demoPriceRecords,
  demoRecyclers,
  demoSafetyContent,
  demoUsers,
} from '../demo/seed.js';

const SIMULATED_LATENCY_MS = 140;

/**
 * Business rejection carrying the shared ApiErrorShape. The API maps `code`
 * to an HTTP status; it never leaks a stack trace (technical-approach.md 7.4).
 */
export class DemoError extends Error {
  readonly shape: ApiErrorShape;

  constructor(shape: ApiErrorShape) {
    super(shape.message);
    this.name = 'DemoError';
    this.shape = shape;
  }
}

function notFound(what: string): DemoError {
  return new DemoError({ code: 'NOT_FOUND', message: `${what} was not found.` });
}

function forbidden(what: string): DemoError {
  return new DemoError({ code: 'FORBIDDEN', message: `You do not have access to this ${what}.` });
}

function invalid(message: string, field?: string): DemoError {
  return new DemoError({ code: 'INVALID_INPUT', message, ...(field ? { field } : {}) });
}

function delay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));
}

/**
 * Rule FRD-03: an idempotency key already seen must return the ORIGINAL
 * result rather than re-applying the operation. This is the offline
 * duplicate-transaction defence.
 */
function replayIfSeen(
  idempotencyKey: string,
  entity: string,
  resolveId: (id: string) => CollectorLotView,
): CollectorLotView | null {
  const seen = state.idempotency.get(idempotencyKey);
  if (!seen || seen.entity !== entity) {
    return null;
  }
  return resolveId(seen.id);
}

interface DemoState {
  users: Map<string, (typeof demoUsers)[number]>;
  collectors: Map<string, Collector>;
  recyclers: Map<string, Recycler>;
  materials: Material[];
  categories: MaterialCategory[];
  prices: PriceRecord[];
  safety: SafetyContent[];
  lots: Map<string, Lot>;
  offers: Map<string, RecyclerOffer>;
  handovers: Map<string, Handover>;
  payments: Map<string, import('../domain/types.js').Payment>;
  transactions: Map<string, Transaction>;
  trace: Map<string, TraceabilityRecord[]>;
  notifications: Map<string, AppNotification[]>;
  audit: AuditEvent[];
  predictions: AiPrediction[];
  /** Rule FRD-03: idempotency key -> original result. The duplicate defence. */
  idempotency: Map<string, { entity: string; id: string }>;
  lotSequence: number;
  /**
   * The session is deliberately NOT stored here. Data is shared (one Lot,
   * visible to every role) but identity is per-client, so the session lives
   * on the service instance. See DemoReScrapSession.
   */
}

function freshState(): DemoState {
  return {
    users: new Map(demoUsers.map((u) => [u.id, { ...u }])),
    collectors: new Map(demoCollectors.map((c) => [c.id, { ...c }])),
    recyclers: new Map(demoRecyclers.map((r) => [r.id, { ...r }])),
    materials: demoMaterials.map((m) => ({ ...m })),
    categories: demoMaterialCategories.map((c) => ({ ...c })),
    prices: demoPriceRecords.map((p) => ({ ...p })),
    safety: demoSafetyContent.map((s) => ({ ...s })),
    lots: new Map(),
    offers: new Map(),
    handovers: new Map(),
    payments: new Map(),
    transactions: new Map(),
    trace: new Map(),
    notifications: new Map(),
    audit: demoAuditEvents.map((a) => ({ ...a })),
    predictions: demoAiPredictions.map((p) => ({ ...p })),
    idempotency: new Map(),
    lotSequence: 1,
  };
}

/**
 * The demo store is deliberately a single module-level instance. The whole
 * product premise is ONE shared Lot visible to collector, recycler and admin
 * at the same time, so the in-memory demo must not fragment into per-client
 * copies. `resetDemoState` is the explicit, test-only door back to seed data.
 */
const state: DemoState = freshState();

/**
 * Test-only affordance: wipe the shared demo store back to seed data.
 * Exported so test setup can guarantee a known starting point without
 * depending on execution order.
 */
export function resetDemoState(): void {
  Object.assign(state, freshState());
}

function now(): string {
  return new Date().toISOString();
}

function currentUser(session: DemoReScrapSession): User {
  if (!session.current) {
    throw new DemoError({ code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' });
  }
  const user = state.users.get(session.current.userId);
  if (!user) {
    throw new DemoError({ code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' });
  }
  return user;
}

function currentCollector(session: DemoReScrapSession): Collector {
  const user = currentUser(session);
  if (user.role !== 'COLLECTOR') {
    throw forbidden('collector data');
  }
  const collector = [...state.collectors.values()].find((c) => c.userId === user.id);
  if (!collector) {
    throw notFound('Collector profile');
  }
  return collector;
}

function currentRecycler(session: DemoReScrapSession): Recycler {
  const user = currentUser(session);
  if (user.role !== 'RECYCLER') {
    throw forbidden('recycler data');
  }
  const recycler = [...state.recyclers.values()].find((r) => r.userId === user.id);
  if (!recycler) {
    throw notFound('Recycler profile');
  }
  return recycler;
}

/** Actor for audit records. Rule AUD-01: every record names a real actor. */
const SYSTEM_ACTOR: UserId = 'usr_system' as UserId;

function actorId(session: DemoReScrapSession): UserId {
  if (!session.current) {
    return SYSTEM_ACTOR;
  }
  return state.users.get(session.current.userId)?.id ?? SYSTEM_ACTOR;
}

function materialById(id: string): Material {
  const m = state.materials.find((x) => x.id === id);
  if (!m) {
    throw notFound('Material');
  }
  return m;
}

function lotById(id: string): Lot {
  const lot = state.lots.get(id);
  if (!lot) {
    throw notFound('Scrap');
  }
  return lot;
}

/**
 * Per-client identity. Data lives in the shared store; the caller identity
 * does not. A server handling three roles at once must not share a session.
 */
export interface DemoReScrapSession {
  current: { role: Role; userId: string } | null;
}

function appendTrace(
  session: DemoReScrapSession,
  lotId: LotId,
  event: TraceabilityEventType,
  actorRole: Role,
  detail: string,
  evidenceKeys: string[] = [],
): void {
  const chain = state.trace.get(lotId) ?? [];
  chain.push({
    id: `trc_${lotId}_${chain.length + 1}` as import('../domain/ids.js').TraceabilityRecordId,
    lotId,
    sequence: chain.length + 1,
    event,
    at: now(),
    actorUserId: actorId(session),
    actorRole,
    detail,
    evidenceKeys,
    demo: true,
  });
  state.trace.set(lotId, chain);
}

function transition(
  session: DemoReScrapSession,
  lot: Lot,
  trigger: LotTransitionTrigger,
  actorRole: Role,
  reason?: string,
): Lot {
  const result = nextState({
    state: lot.state,
    trigger,
    actorRole,
    actorUserId: actorId(session),
    at: now(),
    ...(reason ? { reason } : {}),
    preconditions: { hasAtLeastOneItem: lot.items.length > 0 },
  });

  if (!result.ok) {
    throw new DemoError({
      code: 'ILLEGAL_TRANSITION',
      message: 'message' in result ? result.message : 'Transition rejected',
      field: 'state',
    });
  }

  const updated: Lot = { ...lot, state: result.to, updatedAt: now() };
  state.lots.set(lot.id, updated);
  appendTrace(session, lot.id, traceEventFor(trigger), actorRole, reason ?? trigger);
  return updated;
}

function traceEventFor(trigger: LotTransitionTrigger): TraceabilityEventType {
  switch (trigger) {
    case 'SUBMIT':
      return 'LOT_CREATED';
    case 'MATCH_RUN':
      return 'RECYCLER_MATCHED';
    case 'OFFER_MADE':
      return 'OFFER_MADE';
    case 'OFFER_ACCEPTED':
      return 'OFFER_ACCEPTED';
    case 'PICKUP_SCHEDULED':
      return 'PICKUP_SCHEDULED';
    case 'HANDOVER_EXECUTED':
      return 'HANDOVER_EXECUTED';
    case 'HANDOVER_CONFIRMED':
      return 'COLLECTOR_VERIFIED';
    case 'DISPUTED':
      return 'COLLECTOR_VERIFIED';
    default:
      return 'WEIGHT_CAPTURED';
  }
}

function totalWeight(lot: Lot): WeightKg {
  const sum = lot.items.reduce((acc, item) => acc + item.declaredWeightKg, 0);
  return Math.round(sum * 100) / 100 as WeightKg;
}

function recomputeEstimate(lot: Lot): Money {
  // Rule PRICE-04: server-side. The client never supplies an estimate.
  const areaFactor = lot.collectionArea;
  let total = 0;
  for (const item of lot.items) {
    const lookup = findReferencePrice(item.materialId, areaFactor, state.prices, new Date());
    if (!lookup.record) {
      continue;
    }
    const breakdown = estimateValue({
      weightKg: item.declaredWeightKg,
      condition: item.condition,
      area: areaFactor,
      buyingPricePerKg: lookup.record.buyingPricePerKg,
    });
    total += breakdown.estimatedValue;
  }
  return money(total);
}

/* ------------------------------------------------------------------ *
 * Projections - role-specific views of the ONE shared lot
 * ------------------------------------------------------------------ */

function toCollectorView(lot: Lot): CollectorLotView {
  const offers = [...state.offers.values()].filter((o) => o.lotId === lot.id);
  const best = offers
    .filter((o) => o.state === 'PENDING' || o.state === 'ACCEPTED')
    .sort((a, b) => b.amount - a.amount)[0];
  const accepted = offers.find((o) => o.state === 'ACCEPTED');
  const handover = lot.handoverId ? state.handovers.get(lot.handoverId) : undefined;
  const payment = lot.paymentId ? state.payments.get(lot.paymentId) : undefined;
  const acceptedRecycler = accepted ? state.recyclers.get(accepted.recyclerId) : undefined;

  return {
    id: lot.id,
    state: lot.state,
    stateLabel: LOT_STATE_PRESENTATION[lot.state].collector,
    items: lot.items.map((item) => {
      const material = materialById(item.materialId);
      return {
        materialId: item.materialId,
        materialLabel: material.label,
        materialIcon: material.icon,
        hazardFlags: material.hazardFlags,
        declaredWeightKg: item.declaredWeightKg,
        condition: item.condition,
        photoCount: item.photoKeys.length,
      };
    }),
    totalWeightKg: totalWeight(lot),
    collectionArea: lot.collectionArea,
    sourceType: lot.sourceType,
    estimatedValue: lot.estimatedValue,
    estimateMethod: lot.estimateMethod,
    estimateComputedAt: lot.estimateComputedAt,
    offerCount: offers.filter((o) => o.state === 'PENDING' || o.state === 'ACCEPTED').length,
    ...(best ? { bestOfferAmount: best.amount } : {}),
    ...(acceptedRecycler ? { acceptedRecyclerName: acceptedRecycler.businessName } : {}),
    ...(handover ? { handoverState: handover.state } : {}),
    ...(payment ? { paymentState: payment.state, paymentAmount: payment.amount } : {}),
    createdAt: lot.createdAt,
    updatedAt: lot.updatedAt,
    demo: lot.demo,
  };
}

function toRecyclerView(lot: Lot, viewerRecyclerId: string): RecyclerLotView {
  const offers = [...state.offers.values()].filter((o) => o.lotId === lot.id);
  const mine = offers.find((o) => o.recyclerId === viewerRecyclerId);

  return {
    id: lot.id,
    state: lot.state,
    stateLabel: LOT_STATE_PRESENTATION[lot.state].recycler,
    items: lot.items.map((item) => {
      const material = materialById(item.materialId);
      return {
        materialId: item.materialId,
        materialLabel: material.label,
        materialIcon: material.icon,
        hazardFlags: material.hazardFlags,
        declaredWeightKg: item.declaredWeightKg,
        condition: item.condition,
        photoKeys: item.photoKeys,
      };
    }),
    totalWeightKg: totalWeight(lot),
    collectionArea: lot.collectionArea,
    estimatedValue: lot.estimatedValue,
    ...(mine ? { myOffer: mine.state, myOfferAmount: mine.amount } : {}),
    offerCount: offers.length,
    collectorName: undefined as never,
    createdAt: lot.createdAt,
    demo: lot.demo,
  };
}

function toAdminView(lot: Lot): AdminLotView {
  const offers = [...state.offers.values()].filter((o) => o.lotId === lot.id);
  const handover = lot.handoverId ? state.handovers.get(lot.handoverId) : undefined;
  const payment = lot.paymentId ? state.payments.get(lot.paymentId) : undefined;
  const transaction = lot.transactionId ? state.transactions.get(lot.transactionId) : undefined;

  return {
    id: lot.id,
    state: lot.state,
    collectorId: lot.collectorId,
    ...(lot.acceptedOfferId
      ? { recyclerId: state.offers.get(lot.acceptedOfferId)?.recyclerId }
      : {}),
    items: lot.items.map((i) => ({
      materialId: i.materialId,
      declaredWeightKg: i.declaredWeightKg,
      condition: i.condition,
    })),
    totalWeightKg: totalWeight(lot),
    estimatedValue: lot.estimatedValue,
    offerCount: offers.length,
    ...(handover ? { handoverState: handover.state } : {}),
    ...(payment ? { paymentState: payment.state } : {}),
    ...(transaction ? { transactionStatus: transaction.status } : {}),
    requiresReview: handover?.requiresReview ?? false,
    anomalyFlags: [],
    createdAt: lot.createdAt,
    updatedAt: lot.updatedAt,
    demo: lot.demo,
  };
}

/* ------------------------------------------------------------------ *
 * The service
 * ------------------------------------------------------------------ */

export class DemoReScrapService implements ReScrapService, DemoReScrapSession {
  /**
   * Identity for THIS client only. The data store is shared so collector,
   * recycler and admin all see the same Lot; the session is not.
   */
  current: { role: Role; userId: string } | null = null;

  /** Test/demo affordance: wipe all state back to seed. */
  reset(): void {
    resetDemoState();
  }

  /* --- Auth --- */

  async requestOtp(phone: string, _role: Role): Promise<OtpRequestResult> {
    await delay();
    if (!/^\+?[1-9]\d{7,14}$/.test(phone.trim())) {
      throw invalid('Enter a valid mobile number.', 'phone');
    }
    return {
      sent: true,
      devCode: DEMO_OTP_CODE,
      retryAfterSeconds: 30,
      demo: true,
    };
  }

  async verifyOtp(phone: string, role: Role, code: string): Promise<AuthSession> {
    await delay();
    if (code.trim() !== DEMO_OTP_CODE) {
      throw new DemoError({ code: 'INVALID_OTP', message: 'That code is not correct.', field: 'code' });
    }
    const user = demoUsers.find((u) => u.phone === phone.trim() && u.role === role);
    if (!user) {
      throw notFound('Account');
    }
    this.current = { role, userId: user.id };
    return this.currentUser() as Promise<AuthSession>;
  }

  async refresh(_refreshToken: string): Promise<AuthSession> {
    await delay();
    if (!this.current) {
      throw new DemoError({ code: 'UNAUTHENTICATED', message: 'Please sign in to continue.' });
    }
    return this.currentUser() as Promise<AuthSession>;
  }

  async logout(): Promise<void> {
    await delay();
    this.current = null;
  }

  async currentUser(): Promise<AuthSession | null> {
    if (!this.current) {
      return null;
    }
    const user = state.users.get(this.current.userId);
    if (!user) {
      return null;
    }
    return this.buildSession(user.id, user.role);
  }

  async completeProfile(input: {
    displayName: string;
    locale: 'en' | 'hi' | 'mr';
    baseArea?: string;
  }): Promise<AuthSession> {
    await delay();
    const user = currentUser(this);
    if (user.role === 'COLLECTOR') {
      const collector = currentCollector(this);
      const updated: Collector = {
        ...collector,
        displayName: input.displayName,
        locale: input.locale,
        ...(input.baseArea !== undefined ? { baseArea: input.baseArea } : {}),
        updatedAt: now(),
      };
      state.collectors.set(updated.id, updated);
    }
    const userRecord = state.users.get(user.id);
    if (userRecord) {
      state.users.set(user.id, {
        ...userRecord,
        displayName: input.displayName,
        locale: input.locale,
        profileComplete: true,
        updatedAt: now(),
      });
    }
    return this.buildSession(user.id, user.role);
  }

  private buildSession(userId: string, _role: Role): AuthSession {
    const user = state.users.get(userId);
    if (!user) {
      throw notFound('Account');
    }
    const collector = [...state.collectors.values()].find((c) => c.userId === userId);
    const recycler = [...state.recyclers.values()].find((r) => r.userId === userId);
    return {
      accessToken: `demo-access-${userId}`,
      refreshToken: `demo-refresh-${userId}`,
      expiresInSeconds: 900,
      user,
      ...(collector ? { collector } : {}),
      ...(recycler ? { recycler } : {}),
      demo: true,
    };
  }

  /* --- Catalogue --- */

  async listMaterialCategories(): Promise<MaterialCategory[]> {
    await delay();
    return state.categories;
  }

  async listMaterials(): Promise<Material[]> {
    await delay();
    return state.materials.filter((m) => m.active);
  }

  async getSafetyContent(materialId: string): Promise<SafetyContent[]> {
    await delay();
    return state.safety.filter((s) => s.materialId === materialId);
  }

  /* --- Pricing --- */

  async priceBoard(area: string): Promise<PriceBoardRow[]> {
    await delay();
    const nowDate = new Date();
    const rows: PriceBoardRow[] = [];
    const seen = new Set<string>();

    for (const record of state.prices) {
      if (seen.has(record.materialId)) {
        continue;
      }
      const lookup = findReferencePrice(record.materialId, area, state.prices, nowDate);
      if (!lookup.record) {
        continue;
      }
      seen.add(record.materialId);
      const material = materialById(record.materialId);
      rows.push({
        materialId: material.id,
        materialLabel: material.label,
        materialIcon: material.icon,
        hazardFlags: material.hazardFlags,
        buyingPricePerKg: lookup.record.buyingPricePerKg,
        effectiveFrom: lookup.record.effectiveFrom,
        stale: lookup.stale,
        demo: true,
      });
    }

    return rows.sort((a, b) => a.materialLabel.en.localeCompare(b.materialLabel.en));
  }

  async priceHistory(materialId: string): Promise<PriceRecord[]> {
    await delay();
    return state.prices
      .filter((p) => p.materialId === materialId)
      .sort((a, b) => Date.parse(b.effectiveFrom) - Date.parse(a.effectiveFrom));
  }

  /* --- Collector --- */

  async createLot(input: {
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
  }): Promise<CollectorLotView> {
    await delay();
    const collector = currentCollector(this);

    // Rule FRD-03: an idempotency key already seen returns the ORIGINAL lot.
    const existing = state.idempotency.get(input.idempotencyKey);
    if (existing && existing.entity === 'LOT') {
      return toCollectorView(lotById(existing.id));
    }

    if (input.items.length === 0) {
      throw invalid('A scrap lot needs at least one item.', 'items');
    }
    for (const item of input.items) {
      if (!item.materialConfirmed) {
        throw invalid('Confirm the material before saving.', 'materialConfirmed');
      }
      materialById(item.materialId);
      if (!(item.declaredWeightKg > 0)) {
        throw invalid('Weight must be more than zero.', 'declaredWeightKg');
      }
    }

    const sequence = state.lotSequence;
    state.lotSequence += 1;
    const id = formatLotId(sequence) as LotId;
    const timestamp = now();

    const items: LotItem[] = input.items.map((item, index) => ({
      id: `li_${sequence}_${index + 1}` as LotItemId,
      lotId: id,
      materialId: item.materialId as LotItem['materialId'],
      materialConfirmed: true,
      declaredWeightKg: item.declaredWeightKg,
      condition: item.condition,
      photoKeys: item.photoKeys,
      ...(item.notes !== undefined ? { notes: item.notes } : {}),
      demo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    }));

    const draft: Lot = {
      id,
      sequence,
      collectorId: collector.id,
      state: 'DRAFT',
      items,
      sourceType: input.items[0]?.sourceType ?? 'MIXED',
      collectionArea: input.collectionArea,
      estimatedValue: money(0),
      estimateComputedAt: timestamp,
      estimateMethod: 'rule',
      idempotencyKey: input.idempotencyKey,
      demo: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    draft.estimatedValue = recomputeEstimate(draft);
    state.lots.set(id, draft);
    state.idempotency.set(input.idempotencyKey, { entity: 'LOT', id });

    for (const item of items) {
      appendTrace(this, id, 'PHOTO_CAPTURED', 'COLLECTOR', `Photo attached for ${item.materialId}`);
      appendTrace(this, id, 'MATERIAL_IDENTIFIED', 'COLLECTOR', `Material confirmed: ${item.materialId}`);
      appendTrace(this, id, 'WEIGHT_CAPTURED', 'COLLECTOR', `Declared weight: ${item.declaredWeightKg} kg`);
    }
    appendTrace(this, id, 'ESTIMATE_COMPUTED', 'COLLECTOR', `Estimated value: ${draft.estimatedValue} paise (rule-based)`);

    return toCollectorView(draft);
  }

  async submitLot(lotId: string, idempotencyKey: string): Promise<CollectorLotView> {
    await delay();
    const collector = currentCollector(this);
    const replay = replayIfSeen(idempotencyKey, 'LOT_SUBMIT', (id) => toCollectorView(lotById(id)));
    if (replay) {
      return replay;
    }
    let lot = lotById(lotId);
    if (lot.collectorId !== collector.id) {
      throw forbidden('scrap');
    }
    if (lot.state === 'DRAFT') {
      lot = transition(this, lot, 'SUBMIT', 'COLLECTOR', 'Collector submitted the scrap');
      lot = transition(this, lot, 'MATCH_RUN', 'COLLECTOR', 'Searching for verified recyclers');
    }
    state.idempotency.set(idempotencyKey, { entity: 'LOT_SUBMIT', id: lot.id });
    return toCollectorView(lot);
  }

  async listMyLots(): Promise<CollectorLotView[]> {
    await delay();
    const collector = currentCollector(this);
    return [...state.lots.values()]
      .filter((l) => l.collectorId === collector.id)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map(toCollectorView);
  }

  async getMyLot(lotId: string): Promise<CollectorLotView> {
    await delay();
    const collector = currentCollector(this);
    const lot = lotById(lotId);
    if (lot.collectorId !== collector.id) {
      throw forbidden('scrap');
    }
    return toCollectorView(lot);
  }

  async matchRecyclers(lotId: string): Promise<RecyclerMatch[]> {
    await delay();
    currentCollector(this);
    const lot = lotById(lotId);
    const categoryIds = [
      ...new Set(lot.items.map((i) => materialById(i.materialId).categoryId)),
    ];

    return rankRecyclerMatches(
      [...state.recyclers.values()].map((recycler) => {
        const areaMatch = recycler.serviceAreas.find((a) =>
          lot.collectionArea.toLowerCase().includes((a.split(' - ').pop() ?? '').toLowerCase()),
        );
        return {
          recycler,
          lotCategoryIds: categoryIds,
          ...(areaMatch !== undefined
            ? { distanceKm: estimateDistanceKm(lot.collectionArea, areaMatch) }
            : {}),
        };
      }),
      { limit: 10 },
    );

    function estimateDistanceKm(from: string, to: string): number {
      // Demo-only stand-in for a real geocode. NOT a real distance.
      // [DATA REQUIRED] - replace with a real geocoding provider in Phase 6.
      const same = from.toLowerCase() === to.toLowerCase();
      return same ? 3.2 : 12.5;
    }
  }

  async acceptOffer(offerId: string, idempotencyKey: string): Promise<CollectorLotView> {
    await delay();
    const collector = currentCollector(this);
    const replay = replayIfSeen(idempotencyKey, 'OFFER_ACCEPT', (id) => {
      const offer = state.offers.get(id);
      return offer ? toCollectorView(lotById(offer.lotId)) : toCollectorView(lotById(id));
    });
    if (replay) {
      return replay;
    }
    const offer = state.offers.get(offerId);
    if (!offer) {
      throw notFound('Offer');
    }
    const lot = lotById(offer.lotId);
    if (lot.collectorId !== collector.id) {
      throw forbidden('offer');
    }
    if (offer.state !== 'PENDING' && offer.state !== 'COUNTERED') {
      throw new DemoError({ code: 'INVALID_STATE', message: 'This offer can no longer be accepted.' });
    }
    if (Date.parse(offer.validUntil) < Date.now()) {
      offer.state = 'EXPIRED';
      state.offers.set(offer.id, offer);
      throw new DemoError({ code: 'OFFER_EXPIRED', message: 'This offer has expired.' });
    }

    // Rule OFFER-06: atomic. Supersede rivals, accept this one, transition.
    for (const other of state.offers.values()) {
      if (other.lotId === lot.id && other.id !== offer.id && other.state === 'PENDING') {
        other.state = 'SUPERSEDED';
        other.respondedAt = now();
        state.offers.set(other.id, other);
      }
    }
    const accepted: RecyclerOffer = {
      ...offer,
      state: 'ACCEPTED',
      respondedAt: now(),
      respondedBy: (state.users.get(collector.userId)?.id ?? 'usr_system') as UserId,
      updatedAt: now(),
    };
    state.offers.set(accepted.id, accepted);

    let updated = lotById(offer.lotId);
    updated = { ...updated, acceptedOfferId: accepted.id, updatedAt: now() };
    state.lots.set(updated.id, updated);
    updated = transition(this, updated, 'OFFER_ACCEPTED', 'COLLECTOR', `Accepted offer of ${accepted.amount} paise`);
    state.idempotency.set(idempotencyKey, { entity: 'OFFER_ACCEPT', id: offer.id });

    return toCollectorView(updated);
  }

  async declineOffer(offerId: string, idempotencyKey: string): Promise<CollectorLotView> {
    await delay();
    const collector = currentCollector(this);
    const replay = replayIfSeen(idempotencyKey, 'OFFER_DECLINE', (id) => {
      const offer = state.offers.get(id);
      return offer ? toCollectorView(lotById(offer.lotId)) : toCollectorView(lotById(id));
    });
    if (replay) {
      return replay;
    }
    const offer = state.offers.get(offerId);
    if (!offer) {
      throw notFound('Offer');
    }
    const lot = lotById(offer.lotId);
    if (lot.collectorId !== collector.id) {
      throw forbidden('offer');
    }
    const declined: RecyclerOffer = { ...offer, state: 'REJECTED', respondedAt: now(), updatedAt: now() };
    state.offers.set(declined.id, declined);
    state.idempotency.set(idempotencyKey, { entity: 'OFFER_DECLINE', id: offer.id });
    return toCollectorView(lot);
  }

  async verifyHandover(
    handoverId: string,
    acknowledgeDiscrepancy: boolean,
    idempotencyKey: string,
  ): Promise<CollectorLotView> {
    await delay();
    const collector = currentCollector(this);
    const replay = replayIfSeen(idempotencyKey, 'HANDOVER_VERIFY', (id) => {
      const handover = state.handovers.get(id);
      return handover ? toCollectorView(lotById(handover.lotId)) : toCollectorView(lotById(id));
    });
    if (replay) {
      return replay;
    }
    const handover = state.handovers.get(handoverId);
    if (!handover) {
      throw notFound('Handover');
    }
    const ownedLot = lotById(handover.lotId);
    if (ownedLot.collectorId !== collector.id) {
      throw forbidden('handover');
    }
    if (handover.state !== 'EXECUTED') {
      throw new DemoError({ code: 'INVALID_STATE', message: 'This handover is not ready to verify.' });
    }
    if (handover.requiresReview && !acknowledgeDiscrepancy) {
      // Rule HAND-04: a discrepancy must be acknowledged before proceeding.
      throw new DemoError({
        code: 'DISCREPANCY_REQUIRES_ACK',
        message: 'The weight changed. Please check the details and confirm.',
        field: 'acknowledgeDiscrepancy',
      });
    }

    const verified: Handover = {
      ...handover,
      state: 'CONFIRMED',
      collectorVerifiedAt: now(),
      collectorVerifiedBy: (state.users.get(collector.userId)?.id ?? 'usr_system') as UserId,
      updatedAt: now(),
    };
    state.handovers.set(verified.id, verified);

    let lot = state.lots.get(verified.lotId) ?? ownedLot;
    lot = transition(this, lot, 'HANDOVER_CONFIRMED', 'COLLECTOR', 'Collector verified the handover');
    appendTrace(this, lot.id, 'RECYCLER_CONFIRMED', 'RECYCLER', 'Recycler confirmed receipt');

    // Payment record is created here. Amount is server-computed.
    const offer = lot.acceptedOfferId ? state.offers.get(lot.acceptedOfferId) : undefined;
    if (offer && verified.finalWeightKg) {
      const amount = computeFinalAmount(offer.amountPerKg, verified.finalWeightKg);
      const paymentId = `pay_${lot.id}` as PaymentId;
      const payment = {
        id: paymentId,
        lotId: lot.id,
        offerId: offer.id,
        recyclerId: offer.recyclerId,
        state: 'CONFIRMED' as const,
        method: 'CASH' as const,
        amount,
        amountPerKg: offer.amountPerKg,
        // Rule PAY-07 / HON-02: no real money moves in the MVP.
        confirmationReference: `DEMO-${lot.id}`,
        simulated: true,
        confirmedAt: now(),
        paidAt: now(),
        demo: true,
        createdAt: now(),
        updatedAt: now(),
      };
      state.payments.set(paymentId, payment);
      lot = { ...lot, paymentId, updatedAt: now() };
      state.lots.set(lot.id, lot);
      appendTrace(this, lot.id, 'PAYMENT_RECORDED', 'COLLECTOR', `Payment recorded (SIMULATED): ${amount} paise`);

      // Rule TXN-01/02: one lot yields at most one transaction.
      const transactionId = `txn_${lot.id}` as TransactionId;
      const existing = state.transactions.get(transactionId);
      if (!existing) {
        const transaction: Transaction = {
          id: transactionId,
          lotId: lot.id,
          collectorId: lot.collectorId,
          recyclerId: offer.recyclerId,
          offerId: offer.id,
          handoverId: verified.id,
          paymentId,
          // Rule TXN-03: status is DERIVED, never set independently.
          status: deriveTransactionStatus({ handover: verified, payment }),
          quantityKg: verified.finalWeightKg,
          amount,
          method: 'CASH',
          completedAt: now(),
          adjustments: [],
          demo: true,
          createdAt: now(),
          updatedAt: now(),
        };
        state.transactions.set(transactionId, transaction);
        lot = { ...lot, transactionId, updatedAt: now() };
        state.lots.set(lot.id, lot);
      }
    }

    state.idempotency.set(idempotencyKey, { entity: 'HANDOVER_VERIFY', id: handover.id });

    return toCollectorView(lot);
  }

  async getPassport(lotId: string): Promise<LotPassportView> {
    await delay();
    const collector = currentCollector(this);
    const lot = lotById(lotId);
    if (lot.collectorId !== collector.id) {
      throw forbidden('scrap');
    }
    const chain = state.trace.get(lotId) ?? [];
    const offer = lot.acceptedOfferId ? state.offers.get(lot.acceptedOfferId) : undefined;
    const payment = lot.paymentId ? state.payments.get(lot.paymentId) : undefined;
    const recycler = offer ? state.recyclers.get(offer.recyclerId) : undefined;

    const eventLabels: Record<TraceabilityEventType, Record<'en' | 'hi' | 'mr', string>> = {
      LOT_CREATED: { en: 'Scrap added', hi: 'स्क्रैप जोड़ा', mr: 'स्क्रॅप जोडले' },
      MATERIAL_IDENTIFIED: { en: 'Material confirmed', hi: 'सामग्री पक्की', mr: 'साहित्य निश्चित' },
      PHOTO_CAPTURED: { en: 'Photo added', hi: 'फ़ोटो जोड़ी', mr: 'फोटो जोडली' },
      WEIGHT_CAPTURED: { en: 'Weight noted', hi: 'वज़न दर्ज', mr: 'वजन नोंदवले' },
      ESTIMATE_COMPUTED: { en: 'Approximate value calculated', hi: 'अनुमानित कीमत निकाली', mr: 'अंदाजे किंमत काढली' },
      RECYCLER_MATCHED: { en: 'Recycler found', hi: 'रीसायकलर मिला', mr: 'रीसायकलर सापडला' },
      OFFER_MADE: { en: 'Offer received', hi: 'ऑफ़र मिला', mr: 'ऑफर मिळाला' },
      OFFER_ACCEPTED: { en: 'Offer accepted', hi: 'ऑफ़र स्वीकारा', mr: 'ऑफर स्वीकारला' },
      PICKUP_SCHEDULED: { en: 'Pickup scheduled', hi: 'पिकअप तय हुआ', mr: 'पिकअप निश्चित झाला' },
      HANDOVER_EXECUTED: { en: 'Scrap handed over', hi: 'स्क्रैप दिया', mr: 'स्क्रॅप दिले' },
      RECYCLER_CONFIRMED: { en: 'Recycler confirmed', hi: 'रीसायकलर ने पुष्टि की', mr: 'रीसायकलरने खात्री केली' },
      COLLECTOR_VERIFIED: { en: 'You confirmed handover', hi: 'आपने पुष्टि की', mr: 'तुम्ही खात्री केली' },
      PAYMENT_RECORDED: { en: 'Payment recorded', hi: 'भुगतान दर्ज हुआ', mr: 'पेमेंट नोंदवले' },
      RECYCLING_STATUS_UPDATED: { en: 'Recycling updated', hi: 'रीसायकलिंग अपडेट', mr: 'रीसायक्लिंग अपडेट' },
    };

    const materialSummary = lot.items
      .map((i) => materialById(i.materialId).label.en)
      .join(', ');

    const handover = lot.handoverId ? state.handovers.get(lot.handoverId) : undefined;
    const completedAt = handover?.collectorVerifiedAt ?? handover?.scheduledFor;

    return {
      lotId: lot.id,
      chain: chain.map((r) => ({
        event: r.event,
        label: eventLabels[r.event],
        at: r.at,
        detail: r.detail,
      })),
      summary: {
        materialSummary,
        totalWeightKg: totalWeight(lot),
        ...(recycler ? { recyclerName: recycler.businessName } : {}),
        ...(offer ? { quotedAmount: offer.amount } : {}),
        ...(payment ? { finalAmount: payment.amount, method: payment.method } : {}),
        // Rule HON-02: whether the amount shown came from a simulated payment
        // is always stated, never implied.
        paymentSimulated: payment?.simulated ?? false,
        ...(completedAt !== undefined ? { completedAt } : {}),
      },
      demo: lot.demo,
    };
  }

  async getEarnings(): Promise<EarningsView> {
    await delay();
    const collector = currentCollector(this);
    const lotIds = new Set(
      [...state.lots.values()].filter((l) => l.collectorId === collector.id).map((l) => l.id),
    );
    const payments = [...state.payments.values()].filter((p) => lotIds.has(p.lotId));

    let confirmedTotal = 0;
    let pendingTotal = 0;
    let disputedTotal = 0;
    const ledger: EarningsView['ledger'] = [];

    for (const payment of payments) {
      // Rule EARN-01: only CONFIRMED counts as earned.
      if (payment.state === 'CONFIRMED') {
        confirmedTotal += payment.amount;
      } else if (payment.state === 'PENDING') {
        pendingTotal += payment.amount;
      } else if (payment.state === 'DISPUTED') {
        disputedTotal += payment.amount;
      }
      const lot = state.lots.get(payment.lotId);
      ledger.push({
        lotId: payment.lotId,
        at: payment.paidAt ?? payment.createdAt,
        amount: payment.amount,
        method: payment.method,
        simulated: payment.simulated,
        materialSummary: lot
          ? lot.items.map((i) => materialById(i.materialId).label.en).join(', ')
          : '',
      });
    }

    const lotIdsWithConfirmed = payments.filter((p) => p.state === 'CONFIRMED').length;

    return {
      confirmedTotal: money(confirmedTotal),
      pendingTotal: money(pendingTotal),
      disputedTotal: money(disputedTotal),
      lotCount: lotIdsWithConfirmed,
      ledger: ledger.sort((a, b) => Date.parse(b.at) - Date.parse(a.at)),
      demo: true,
    };
  }

  async listMyNotifications(): Promise<AppNotification[]> {
    await delay();
    const user = currentUser(this);
    return state.notifications.get(user.id) ?? [];
  }

  /* --- Recycler --- */

  async recyclerDashboard(): Promise<RecyclerDashboardView> {
    await delay();
    const recycler = currentRecycler(this);
    const openLots = [...state.lots.values()].filter((l) => isOfferEligible(l.state));
    const myOffers = [...state.offers.values()].filter((o) => o.recyclerId === recycler.id);
    const myDeals = myOffers.filter((o) => o.state === 'ACCEPTED');
    const pickups = [...state.handovers.values()].filter((h) => {
      if (h.recyclerId !== recycler.id || h.state !== 'SCHEDULED') {
        return false;
      }
      return Date.parse(h.scheduledFor) > Date.now() - 86_400_000;
    });
    const completed = [...state.transactions.values()].filter((t) => t.recyclerId === recycler.id);
    const decided = myOffers.filter((o) => o.state !== 'PENDING' && o.state !== 'COUNTERED');
    const accepted = decided.filter((o) => o.state === 'ACCEPTED');
    const acceptanceRate =
      decided.length === 0 ? 0 : Math.round((accepted.length / decided.length) * 100);

    return {
      newLotsCount: openLots.length,
      pendingOffersCount: myOffers.filter((o) => o.state === 'PENDING').length,
      activeDealsCount: myDeals.filter((o) => {
        const lot = state.lots.get(o.lotId);
        return lot && !['CLOSED', 'CANCELLED'].includes(lot.state);
      }).length,
      upcomingPickupsCount: pickups.length,
      completedCount: completed.length,
      acceptanceRate,
      metricRationale: [
        { metric: 'newLots', decision: { en: 'Should I bid on these now?', hi: 'क्या अभी बोली लगानी है?', mr: 'आता बोली लावायची का?' } },
        { metric: 'pendingOffers', decision: { en: 'What needs my reply?', hi: 'किसका जवाब देना है?', mr: 'कोणाला उत्तर द्यायचे?' } },
        { metric: 'activeDeals', decision: { en: 'What needs scheduling?', hi: 'किसकी तारीख तय करनी है?', mr: 'कोणाची वेळ ठरवायची?' } },
        { metric: 'upcomingPickups', decision: { en: 'What needs logistics today?', hi: 'आज क्या उठाना है?', mr: 'आज काय उचलायचे?' } },
        { metric: 'completed', decision: { en: 'Is this channel working for me?', hi: 'क्या यह रास्ता काम का है?', mr: 'हा मार्ग उपयोगी आहे का?' } },
        { metric: 'acceptanceRate', decision: { en: 'Should I change my pricing?', hi: 'क्या भाव बदलना चाहिए?', mr: 'भाव बदलायचा का?' } },
      ],
      upcomingPickups: pickups.map((h) => {
        const lot = state.lots.get(h.lotId);
        return {
          lotId: h.lotId,
          scheduledFor: h.scheduledFor,
          collectionArea: lot?.collectionArea ?? '',
        };
      }),
      pendingActions: myOffers
        .filter((o) => o.state === 'COUNTERED')
        .map((o) => ({ lotId: o.lotId, action: 'Respond to counter-offer', at: o.updatedAt })),
      demo: true,
    };
  }

  async listAvailableLots(filters: {
    materialCategoryId?: string;
    area?: string;
    minWeightKg?: number;
    maxWeightKg?: number;
  }): Promise<RecyclerLotView[]> {
    await delay();
    const recycler = currentRecycler(this);

    // Rule RECY-02: only VERIFIED recyclers are served at all.
    if (recycler.authorizationStatus !== 'VERIFIED') {
      return [];
    }

    return [...state.lots.values()]
      .filter((l) => isOfferEligible(l.state))
      .map((l) => toRecyclerView(l, recycler.id))
      .filter((view) => {
        if (filters.area && !view.collectionArea.toLowerCase().includes(filters.area.toLowerCase())) {
          return false;
        }
        if (filters.minWeightKg !== undefined && view.totalWeightKg < filters.minWeightKg) {
          return false;
        }
        if (filters.maxWeightKg !== undefined && view.totalWeightKg > filters.maxWeightKg) {
          return false;
        }
        if (filters.materialCategoryId) {
          const categoryIds = view.items.map((i) => materialById(i.materialId).categoryId);
          if (!categoryIds.includes(filters.materialCategoryId as never)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  async getRecyclerLot(lotId: string): Promise<RecyclerLotView> {
    await delay();
    const recycler = currentRecycler(this);
    if (recycler.authorizationStatus !== 'VERIFIED') {
      throw forbidden('scrap listings');
    }
    return toRecyclerView(lotById(lotId), recycler.id);
  }

  async makeOffer(input: {
    lotId: string;
    amount: Money;
    validUntil: string;
    message?: string;
    justification?: string;
    idempotencyKey: string;
  }): Promise<RecyclerOffer> {
    await delay();
    const recycler = currentRecycler(this);

    // Rule RECY-01: only VERIFIED recyclers may submit offers.
    if (recycler.authorizationStatus !== 'VERIFIED') {
      throw forbidden('offering');
    }

    const existing = state.idempotency.get(input.idempotencyKey);
    if (existing && existing.entity === 'OFFER') {
      const prior = state.offers.get(existing.id);
      if (prior) {
        return prior;
      }
    }

    const lot = lotById(input.lotId);
    if (!isOfferEligible(lot.state)) {
      throw new DemoError({ code: 'LOT_NOT_OPEN', message: 'This scrap is no longer accepting offers.' });
    }
    if (!(input.amount > 0)) {
      throw invalid('Offer amount must be more than zero.', 'amount');
    }

    const weight = totalWeight(lot);
    const amountPerKg = scaleMoney(input.amount, 1 / weight);

    const ratio = lot.estimatedValue > 0 ? input.amount / lot.estimatedValue : 1;
    const outsideBand = ratio < 0.5 || ratio > 1.75;
    if (outsideBand && !input.justification) {
      // Rule OFFER-04: out-of-band offers require explicit justification.
      throw invalid('This amount is far from the usual rate. Add a reason.', 'justification');
    }

    const id = `off_${lot.id}_${state.offers.size + 1}` as OfferId;
    const offer: RecyclerOffer = {
      id,
      lotId: lot.id,
      recyclerId: recycler.id,
      state: 'PENDING',
      amount: input.amount,
      amountPerKg,
      validUntil: input.validUntil,
      ...(input.message !== undefined ? { message: input.message } : {}),
      outsideSanityBand: outsideBand,
      ...(input.justification !== undefined ? { justification: input.justification } : {}),
      demo: true,
      createdAt: now(),
      updatedAt: now(),
    };
    state.offers.set(id, offer);
    state.idempotency.set(input.idempotencyKey, { entity: 'OFFER', id });

    if (lot.state === 'MATCHING') {
      transition(this, lot, 'OFFER_MADE', 'RECYCLER', 'Offer submitted');
    }

    return offer;
  }

  async listMyOffers(): Promise<RecyclerOffer[]> {
    await delay();
    const recycler = currentRecycler(this);
    return [...state.offers.values()]
      .filter((o) => o.recyclerId === recycler.id)
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  async schedulePickup(
    lotId: string,
    scheduledFor: string,
    idempotencyKey: string,
  ): Promise<Handover> {
    await delay();
    const recycler = currentRecycler(this);
    const replay = state.idempotency.get(idempotencyKey);
    if (replay && replay.entity === 'HANDOVER') {
      const prior = state.handovers.get(replay.id);
      if (prior) {
        return prior;
      }
    }
    let lot = lotById(lotId);
    if (lot.state !== 'ACCEPTED') {
      throw new DemoError({ code: 'INVALID_STATE', message: 'Accept an offer before scheduling a pickup.' });
    }
    const offer = lot.acceptedOfferId ? state.offers.get(lot.acceptedOfferId) : undefined;
    if (!offer || offer.recyclerId !== recycler.id) {
      throw forbidden('scheduling');
    }

    const id = `hnd_${lot.id}` as HandoverId;
    const handover: Handover = {
      id,
      lotId: lot.id,
      recyclerId: recycler.id,
      state: 'SCHEDULED',
      scheduledFor,
      declaredWeightKg: totalWeight(lot),
      requiresReview: false,
      photos: [],
      reference: `HND-${lot.id}`,
      demo: true,
      createdAt: now(),
      updatedAt: now(),
    };
    state.handovers.set(id, handover);
    lot = { ...lot, handoverId: id, updatedAt: now() };
    state.lots.set(lot.id, lot);
    transition(this, lot, 'PICKUP_SCHEDULED', 'RECYCLER', `Pickup scheduled for ${scheduledFor}`);
    state.idempotency.set(idempotencyKey, { entity: 'HANDOVER', id });

    return handover;
  }

  async executeHandover(input: {
    handoverId: string;
    finalWeightKg: WeightKg;
    photoKeys: string[];
    location: Coordinates;
    idempotencyKey: string;
  }): Promise<Handover> {
    await delay();
    const recycler = currentRecycler(this);

    // Rule FRD-03: a replayed execution returns the original record rather
    // than a second set of evidence.
    const replay = state.idempotency.get(input.idempotencyKey);
    if (replay && replay.entity === 'HANDOVER_EXECUTE') {
      const prior = state.handovers.get(replay.id);
      if (prior) {
        return prior;
      }
    }

    const handover = state.handovers.get(input.handoverId);
    if (!handover) {
      throw notFound('Handover');
    }
    if (handover.recyclerId !== recycler.id) {
      throw forbidden('handover');
    }
    // Rule HAND-06: cannot execute twice.
    if (handover.state !== 'SCHEDULED') {
      throw new DemoError({ code: 'INVALID_STATE', message: 'This handover has already been recorded.' });
    }
    if (input.photoKeys.length === 0) {
      throw invalid('At least one handover photo is required.', 'photoKeys');
    }

    const discrepancyPercent = weightDiscrepancyPercent(handover.declaredWeightKg, input.finalWeightKg);
    const requiresReview = requiresWeightReview(handover.declaredWeightKg, input.finalWeightKg);

    const executed: Handover = {
      ...handover,
      state: 'EXECUTED',
      executedAt: now(),
      executedBy: (state.users.get(recycler.userId)?.id ?? 'usr_system') as UserId,
      finalWeightKg: input.finalWeightKg,
      discrepancyPercent,
      requiresReview,
      photos: input.photoKeys.map((key) => ({
        key,
        capturedAt: now(),
        capturedByRole: 'RECYCLER' as Role,
      })),
      location: input.location,
      updatedAt: now(),
    };
    state.handovers.set(executed.id, executed);

    let lot = lotById(executed.lotId);
    lot = transition(this, lot, 'HANDOVER_EXECUTED', 'RECYCLER', `Final weight ${input.finalWeightKg} kg`);
    state.idempotency.set(input.idempotencyKey, { entity: 'HANDOVER_EXECUTE', id: executed.id });

    return executed;
  }

  async confirmHandover(handoverId: string, idempotencyKey: string): Promise<Handover> {
    await delay();
    const recycler = currentRecycler(this);
    const replay = state.idempotency.get(idempotencyKey);
    if (replay && replay.entity === 'HANDOVER_CONFIRM') {
      const prior = state.handovers.get(replay.id);
      if (prior) {
        return prior;
      }
    }
    const handover = state.handovers.get(handoverId);
    if (!handover) {
      throw notFound('Handover');
    }
    if (handover.recyclerId !== recycler.id) {
      throw forbidden('handover');
    }
    const confirmed: Handover = {
      ...handover,
      state: 'CONFIRMED',
      recyclerConfirmedAt: now(),
      recyclerConfirmedBy: (state.users.get(recycler.userId)?.id ?? 'usr_system') as UserId,
      updatedAt: now(),
    };
    state.handovers.set(confirmed.id, confirmed);
    state.idempotency.set(idempotencyKey, { entity: 'HANDOVER_CONFIRM', id: confirmed.id });
    return confirmed;
  }

  async listTransactions(): Promise<Transaction[]> {
    await delay();
    const recycler = currentRecycler(this);
    return [...state.transactions.values()].filter((t) => t.recyclerId === recycler.id);
  }

  async getMyRecyclerProfile(): Promise<Recycler> {
    await delay();
    return currentRecycler(this);
  }

  /* --- Shared --- */

  async getHandover(handoverId: string): Promise<Handover> {
    await delay();
    const handover = state.handovers.get(handoverId);
    if (!handover) {
      throw notFound('Handover');
    }
    return handover;
  }

  async listTraceability(lotId: string): Promise<TraceabilityRecord[]> {
    await delay();
    lotById(lotId);
    return state.trace.get(lotId) ?? [];
  }

  async classifyMaterial(input: {
    keywordHints: string[];
    explicitMaterialKey?: string;
  }): Promise<ClassificationResultView> {
    await delay();
    const result = classifyMaterial(
      {
        keywordHints: input.keywordHints,
        ...(input.explicitMaterialKey !== undefined ? { explicitMaterialKey: input.explicitMaterialKey } : {}),
      },
      state.materials,
    );

    const predictions: AiPrediction[] = result.suggestions.slice(0, 1).map((s) => ({
      id: `aip_${Date.now()}` as AiPrediction['id'],
      capability: 'MATERIAL_CLASSIFICATION',
      method: 'rule' as const,
      confidence: s.confidence,
      result: s.materialKey,
      createdAt: now(),
      demo: true,
    }));
    state.predictions.push(...predictions);

    return {
      suggestions: result.suggestions.map((s) => {
        const material = materialById(s.materialId);
        return {
          materialId: s.materialId,
          materialLabel: material.label,
          confidence: s.confidence,
          method: s.method,
          rationale: s.rationale,
        };
      }),
      requiresManualSelection: result.requiresManualSelection,
      demo: true,
    };
  }

  /* --- Admin --- */

  async adminDashboard(): Promise<AdminDashboardView> {
    await delay();
    currentUser(this);
    const lots = [...state.lots.values()];
    const lotsByState: Record<string, number> = {};
    for (const lot of lots) {
      lotsByState[lot.state] = (lotsByState[lot.state] ?? 0) + 1;
    }
    const confirmedPayments = [...state.payments.values()]
      .filter((p) => p.state === 'CONFIRMED')
      .reduce((acc, p) => acc + p.amount, 0);

    return {
      totalLots: lots.length,
      lotsByState,
      verificationQueueDepth: [...state.recyclers.values()].filter(
        (r) => r.authorizationStatus === 'PENDING_REVIEW',
      ).length,
      openDisputes: lots.filter((l) => l.state === 'DISPUTED').length,
      exceptions: lots.filter((l) => {
        const handover = l.handoverId ? state.handovers.get(l.handoverId) : undefined;
        return handover?.requiresReview ?? false;
      }).length,
      confirmedPayments: money(confirmedPayments),
      demo: true,
    };
  }

  async listPendingVerification(): Promise<Recycler[]> {
    await delay();
    currentUser(this);
    return [...state.recyclers.values()].filter((r) => r.authorizationStatus === 'PENDING_REVIEW');
  }

  async decideVerification(recyclerId: string, decision: string, reason: string): Promise<Recycler> {
    await delay();
    const admin = currentUser(this);
    if (admin.role !== 'ADMIN') {
      throw forbidden('verification');
    }
    const recycler = state.recyclers.get(recyclerId);
    if (!recycler) {
      throw notFound('Recycler');
    }
    const status =
      decision === 'APPROVE'
        ? 'VERIFIED'
        : decision === 'REJECT'
          ? 'REJECTED'
          : decision === 'SUSPEND'
            ? 'SUSPENDED'
            : 'VERIFIED';
    const updated: Recycler = { ...recycler, authorizationStatus: status, updatedAt: now() };
    state.recyclers.set(recyclerId, updated);

    // Rule AUD-04: every decision is audit-logged, including rejections.
    state.audit.push({
      id: `aud_${state.audit.length + 1}` as AuditEvent['id'],
      at: now(),
      actorUserId: admin.id,
      actorRole: 'ADMIN',
      action:
        decision === 'APPROVE'
          ? 'RECYCLER_APPROVED'
          : decision === 'REJECT'
            ? 'RECYCLER_REJECTED'
            : decision === 'SUSPEND'
              ? 'RECYCLER_SUSPENDED'
              : 'RECYCLER_REACTIVATED',
      targetType: 'Recycler',
      targetId: recyclerId,
      before: `authorizationStatus=${recycler.authorizationStatus}`,
      after: `authorizationStatus=${status}`,
      reason,
      demo: true,
    });

    return updated;
  }

  async listLotsForAdmin(): Promise<AdminLotView[]> {
    await delay();
    currentUser(this);
    return [...state.lots.values()]
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .map(toAdminView);
  }

  async listAuditEvents(): Promise<AuditEvent[]> {
    await delay();
    currentUser(this);
    return [...state.audit].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  }

  async recordPrice(input: {
    materialId: string;
    area: string;
    buyingPricePerKg: Money;
    effectiveFrom: string;
    sourceLabel: string;
  }): Promise<PriceRecord> {
    await delay();
    const admin = currentUser(this);
    if (admin.role !== 'ADMIN') {
      throw forbidden('price management');
    }
    materialById(input.materialId);
    const record: PriceRecord = {
      id: `prc_${state.prices.length + 1}` as PriceRecordId,
      materialId: input.materialId as PriceRecord['materialId'],
      area: input.area,
      buyingPricePerKg: input.buyingPricePerKg,
      effectiveFrom: input.effectiveFrom,
      // Rule HON-01: the source is labelled so demo pricing is never passed off as real.
      sourceLabel: `DEMO - ${input.sourceLabel}`,
      demo: true,
      createdAt: now(),
      updatedAt: now(),
    };
    state.prices.push(record);
    state.audit.push({
      id: `aud_${state.audit.length + 1}` as AuditEvent['id'],
      at: now(),
      actorUserId: admin.id,
      actorRole: 'ADMIN',
      action: 'PRICE_RECORDED',
      targetType: 'PriceRecord',
      targetId: record.id,
      after: `${input.materialId} @ ${input.buyingPricePerKg} paise/kg from ${input.effectiveFrom}`,
      reason: input.sourceLabel,
      demo: true,
    });
    return record;
  }

  async listAnomalyFlags(): Promise<Array<{ lotId: string; code: string; severity: string; message: string }>> {
    await delay();
    currentUser(this);
    const flags: Array<{ lotId: string; code: string; severity: string; message: string }> = [];
    for (const lot of state.lots.values()) {
      const handover = lot.handoverId ? state.handovers.get(lot.handoverId) : undefined;
      if (handover?.requiresReview) {
        flags.push({
          lotId: lot.id,
          code: 'WEIGHT_OUTLIER',
          severity: 'MEDIUM',
          message: `Final weight differed from declared by ${handover.discrepancyPercent}%.`,
        });
      }
    }
    return flags;
  }

  async listAiPredictions(): Promise<AiPrediction[]> {
    await delay();
    currentUser(this);
    return [...state.predictions].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  /* --- Offline sync --- */

  async syncBatch(operations: SyncOperation[]): Promise<SyncResult[]> {
    await delay();
    const results: SyncResult[] = [];

    for (const op of operations) {
      // Rule FRD-03: a repeated key returns DUPLICATE, never a second entity.
      const seen = state.idempotency.get(op.idempotencyKey);
      if (seen) {
        results.push({
          idempotencyKey: op.idempotencyKey,
          status: 'DUPLICATE',
          entityId: seen.id,
          demo: true,
        });
        continue;
      }

      try {
        switch (op.entity) {
          case 'LOT': {
            if (op.operation === 'CREATE') {
              const view = await this.createLot(op.payload as never);
              results.push({
                idempotencyKey: op.idempotencyKey,
                status: 'APPLIED',
                entityId: view.id,
                demo: true,
              });
            } else if (op.operation === 'SUBMIT') {
              const lotId = String(op.payload.lotId ?? '');
              await this.submitLot(lotId, op.idempotencyKey);
              results.push({
                idempotencyKey: op.idempotencyKey,
                status: 'APPLIED',
                entityId: lotId,
                demo: true,
              });
            } else {
              results.push({
                idempotencyKey: op.idempotencyKey,
                status: 'REJECTED',
                error: { code: 'UNSUPPORTED', message: 'Unsupported lot operation.' },
                demo: true,
              });
            }
            break;
          }
          case 'OFFER_RESPONSE': {
            const offerId = String(op.payload.offerId ?? '');
            if (op.payload.action === 'ACCEPT') {
              await this.acceptOffer(offerId, op.idempotencyKey);
            } else {
              await this.declineOffer(offerId, op.idempotencyKey);
            }
            state.idempotency.set(op.idempotencyKey, { entity: 'OFFER', id: offerId });
            results.push({
              idempotencyKey: op.idempotencyKey,
              status: 'APPLIED',
              entityId: offerId,
              demo: true,
            });
            break;
          }
          case 'HANDOVER_VERIFICATION': {
            const handoverId = String(op.payload.handoverId ?? '');
            const lot = await this.verifyHandover(
              handoverId,
              op.payload.acknowledgeDiscrepancy === true,
              op.idempotencyKey,
            );
            state.idempotency.set(op.idempotencyKey, { entity: 'HANDOVER', id: handoverId });
            results.push({
              idempotencyKey: op.idempotencyKey,
              status: 'APPLIED',
              entityId: lot.id,
              demo: true,
            });
            break;
          }
          default:
            results.push({
              idempotencyKey: op.idempotencyKey,
              status: 'REJECTED',
              error: { code: 'UNSUPPORTED', message: 'Unsupported entity.' },
              demo: true,
            });
        }
      } catch (error) {
        const shape =
          error instanceof DemoError
            ? error.shape
            : { code: 'UNKNOWN', message: 'Could not apply this change.' };
        results.push({
          idempotencyKey: op.idempotencyKey,
          status: 'REJECTED',
          error: shape,
          demo: true,
        });
      }
    }

    return results;
  }
}

/** Threshold re-export so screens can highlight low-confidence suggestions. */
export { AUTO_SUGGEST_CONFIDENCE_THRESHOLD };

export type { OfferState, LotState, AdminId, CollectorId };
