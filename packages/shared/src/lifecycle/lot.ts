/**
 * ReScrap Lot lifecycle state machine.
 *
 * Implemented ONCE here and consumed by the API and all three interfaces
 * (system-architecture.md 9, decision D-03). Illegal transitions are
 * rejected at this layer, so no consumer can drift.
 *
 * Rule LOT-09 / AUD-01: history is append-only. `nextState` never mutates;
 * it returns a NEW lot state and a transition record for the audit trail.
 */

import type { LotState } from '../domain/types.js';
import type { Role } from '../domain/types.js';
import type { UserId } from '../domain/ids.js';

export const LOT_STATES = [
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
] as const satisfies readonly LotState[];

export const TERMINAL_LOT_STATES: readonly LotState[] = ['CLOSED', 'CANCELLED'];

export type LotTransitionTrigger =
  | 'SUBMIT'
  | 'MATCH_RUN'
  | 'OFFER_MADE'
  | 'COUNTER_MADE'
  | 'OFFER_ACCEPTED'
  | 'PICKUP_SCHEDULED'
  | 'HANDOVER_EXECUTED'
  | 'HANDOVER_CONFIRMED'
  | 'RECEIVED_BY_RECYCLER'
  | 'PROCESSED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'DISPUTED'
  | 'DISPUTE_RESOLVED';

interface TransitionRule {
  from: LotState;
  trigger: LotTransitionTrigger;
  to: LotState;
  /** Which role is permitted to cause this transition. */
  actor: Role;
}

/**
 * The complete legal transition set. Anything absent is illegal by definition.
 * Enforced centrally per FRD-04.
 */
export const LOT_TRANSITIONS: readonly TransitionRule[] = [
  { from: 'DRAFT', trigger: 'SUBMIT', to: 'CREATED', actor: 'COLLECTOR' },
  { from: 'CREATED', trigger: 'MATCH_RUN', to: 'MATCHING', actor: 'COLLECTOR' },
  { from: 'MATCHING', trigger: 'OFFER_MADE', to: 'OFFER_RECEIVED', actor: 'RECYCLER' },
  { from: 'OFFER_RECEIVED', trigger: 'COUNTER_MADE', to: 'NEGOTIATION', actor: 'RECYCLER' },
  { from: 'OFFER_RECEIVED', trigger: 'OFFER_ACCEPTED', to: 'ACCEPTED', actor: 'COLLECTOR' },
  {
    from: 'NEGOTIATION',
    trigger: 'OFFER_ACCEPTED',
    to: 'ACCEPTED',
    actor: 'COLLECTOR',
  },
  {
    from: 'ACCEPTED',
    trigger: 'PICKUP_SCHEDULED',
    to: 'HANDOVER_SCHEDULED',
    actor: 'RECYCLER',
  },
  {
    from: 'HANDOVER_SCHEDULED',
    trigger: 'HANDOVER_EXECUTED',
    to: 'HANDED_OVER',
    actor: 'RECYCLER',
  },
  {
    from: 'HANDED_OVER',
    trigger: 'HANDOVER_CONFIRMED',
    to: 'RECEIVED',
    actor: 'COLLECTOR',
  },
  { from: 'RECEIVED', trigger: 'PROCESSED', to: 'PROCESSED', actor: 'RECYCLER' },
  { from: 'PROCESSED', trigger: 'CLOSED', to: 'CLOSED', actor: 'ADMIN' },
  {
    from: 'CREATED',
    trigger: 'CANCELLED',
    to: 'CANCELLED',
    actor: 'COLLECTOR',
  },
  { from: 'DRAFT', trigger: 'CANCELLED', to: 'CANCELLED', actor: 'COLLECTOR' },
  { from: 'MATCHING', trigger: 'CANCELLED', to: 'CANCELLED', actor: 'COLLECTOR' },
  { from: 'OFFER_RECEIVED', trigger: 'CANCELLED', to: 'CANCELLED', actor: 'COLLECTOR' },
  { from: 'NEGOTIATION', trigger: 'CANCELLED', to: 'CANCELLED', actor: 'COLLECTOR' },
  {
    from: 'HANDOVER_SCHEDULED',
    trigger: 'DISPUTED',
    to: 'DISPUTED',
    actor: 'COLLECTOR',
  },
  {
    from: 'HANDED_OVER',
    trigger: 'DISPUTED',
    to: 'DISPUTED',
    actor: 'RECYCLER',
  },
  {
    from: 'DISPUTED',
    trigger: 'DISPUTE_RESOLVED',
    to: 'RECEIVED',
    actor: 'ADMIN',
  },
];

export type TransitionRejectionReason =
  | 'ILLEGAL_TRANSITION'
  | 'ROLE_NOT_PERMITTED'
  | 'TERMINAL_STATE'
  | 'PRECONDITION_FAILED';

export type TransitionResult =
  | {
      ok: true;
      to: LotState;
      record: LotStateTransition;
    }
  | {
      ok: false;
      reason: TransitionRejectionReason;
      message: string;
      allowed: readonly LotTransitionTrigger[];
    };

/** Persisted on every transition. Rule AUD-01. */
export interface LotStateTransition {
  from: LotState;
  to: LotState;
  trigger: LotTransitionTrigger;
  at: string;
  actorUserId: UserId;
  actorRole: Role;
  reason?: string;
  evidenceKeys: readonly string[];
}

export function allowedTriggers(state: LotState, actorRole: Role): readonly LotTransitionTrigger[] {
  return LOT_TRANSITIONS.filter((t) => t.from === state && t.actor === actorRole).map(
    (t) => t.trigger,
  );
}

export function isTerminal(state: LotState): boolean {
  return TERMINAL_LOT_STATES.includes(state);
}

export function canTransition(
  state: LotState,
  trigger: LotTransitionTrigger,
  actorRole: Role,
): boolean {
  return LOT_TRANSITIONS.some((t) => t.from === state && t.trigger === trigger && t.actor === actorRole);
}

export interface TransitionInput {
  state: LotState;
  trigger: LotTransitionTrigger;
  actorRole: Role;
  actorUserId: UserId;
  at: string;
  reason?: string;
  evidenceKeys?: readonly string[];
  /**
   * Extra guards that a rule alone cannot express, e.g. LOT-04
   * (a lot must have at least one item before leaving DRAFT).
   */
  preconditions?: Readonly<Record<string, boolean>>;
}

/**
 * Pure transition function. Returns a new state and an audit record, or a
 * typed rejection. Never mutates and never throws for a business rejection.
 */
export function nextState(input: TransitionInput): TransitionResult {
  const { state, trigger, actorRole, actorUserId, at } = input;

  if (isTerminal(state)) {
    return {
      ok: false,
      reason: 'TERMINAL_STATE',
      message: `Lot is in terminal state ${state} and cannot transition further.`,
      allowed: [],
    };
  }

  const rule = LOT_TRANSITIONS.find(
    (t) => t.from === state && t.trigger === trigger && t.actor === actorRole,
  );

  if (!rule) {
    const stateExists = LOT_TRANSITIONS.some((t) => t.from === state && t.trigger === trigger);
    return {
      ok: false,
      reason: stateExists ? 'ROLE_NOT_PERMITTED' : 'ILLEGAL_TRANSITION',
      message: stateExists
        ? `Role ${actorRole} may not trigger ${trigger} from ${state}.`
        : `No transition from ${state} via ${trigger}.`,
      allowed: allowedTriggers(state, actorRole),
    };
  }

  if (input.preconditions) {
    const failed = Object.entries(input.preconditions).filter(([, ok]) => !ok);
    if (failed.length > 0) {
      return {
        ok: false,
        reason: 'PRECONDITION_FAILED',
        message: `Precondition(s) not met: ${failed.map(([k]) => k).join(', ')}.`,
        allowed: allowedTriggers(state, actorRole),
      };
    }
  }

  return {
    ok: true,
    to: rule.to,
    record: {
      from: state,
      to: rule.to,
      trigger,
      at,
      actorUserId,
      actorRole,
      ...(input.reason !== undefined ? { reason: input.reason } : {}),
      evidenceKeys: input.evidenceKeys ?? [],
    },
  };
}

/**
 * Rule LOT-08: material composition is immutable after MATCHING.
 * Admin corrections are permitted and generate an audit event.
 */
export function canEditLotComposition(state: LotState, actorRole: Role): boolean {
  if (actorRole === 'ADMIN') {
    return !isTerminal(state);
  }
  return actorRole === 'COLLECTOR' && (state === 'DRAFT' || state === 'CREATED');
}

/**
 * Rule OFFER-03: offers may only be created while the lot is offer-eligible.
 */
export const OFFER_ELIGIBLE_STATES: readonly LotState[] = [
  'MATCHING',
  'OFFER_RECEIVED',
  'NEGOTIATION',
];

export function isOfferEligible(state: LotState): boolean {
  return OFFER_ELIGIBLE_STATES.includes(state);
}

/** Collector-facing wording. Kept here so no interface re-invents it. */
export const LOT_STATE_PRESENTATION: Record<
  LotState,
  { collector: Record<'en' | 'hi' | 'mr', string>; recycler: Record<'en' | 'hi' | 'mr', string> }
> = {
  DRAFT: {
    collector: { en: 'Not sent yet', hi: 'अभी भेजा नहीं', mr: 'अजून पाठवलेले नाही' },
    recycler: { en: 'Not published', hi: 'प्रकाशित नहीं', mr: 'प्रकाशित नाही' },
  },
  CREATED: {
    collector: { en: 'Added', hi: 'जोड़ा गया', mr: 'जोडलेले' },
    recycler: { en: 'New', hi: 'नया', mr: 'नवीन' },
  },
  MATCHING: {
    collector: { en: 'Finding recyclers', hi: 'रीसायकलर खोज रहे हैं', mr: 'रीसायकलर शोधत आहेत' },
    recycler: { en: 'Open for offers', hi: 'ऑफ़र के लिए खुला', mr: 'ऑफरसाठी खुले' },
  },
  OFFER_RECEIVED: {
    collector: { en: 'New offer', hi: 'नया ऑफ़र', mr: 'नवीन ऑफर' },
    recycler: { en: 'Offer sent', hi: 'ऑफ़र भेजा', mr: 'ऑफर पाठवला' },
  },
  NEGOTIATION: {
    collector: { en: 'Negotiating', hi: 'बातचीत हो रही है', mr: 'करार होत आहे' },
    recycler: { en: 'Negotiating', hi: 'बातचीत हो रही है', mr: 'करार होत आहे' },
  },
  ACCEPTED: {
    collector: { en: 'Offer accepted', hi: 'ऑफ़र स्वीकार हुआ', mr: 'ऑफर स्वीकारले गेले' },
    recycler: { en: 'Accepted', hi: 'स्वीकृत', mr: 'स्वीकृत' },
  },
  HANDOVER_SCHEDULED: {
    collector: { en: 'Pickup scheduled', hi: 'पिकअप तय है', mr: 'पिकअप निश्चित आहे' },
    recycler: { en: 'Pickup scheduled', hi: 'पिकअप तय है', mr: 'पिकअप निश्चित आहे' },
  },
  HANDED_OVER: {
    collector: { en: 'Confirm handover', hi: 'हस्तांतरण की पुष्टि करें', mr: 'हस्तांतरणाची खात्री करा' },
    recycler: { en: 'Awaiting collector', hi: 'कलेक्टर की प्रतीक्षा', mr: 'कलेक्टरची वाट बघत आहे' },
  },
  RECEIVED: {
    collector: { en: 'Handover complete', hi: 'हस्तांतरण पूरा', mr: 'हस्तांतरण पूर्ण' },
    recycler: { en: 'Received', hi: 'प्राप्त', mr: 'प्राप्त' },
  },
  PROCESSED: {
    collector: { en: 'Being recycled', hi: 'रीसायकलिंग जारी', mr: 'रीसायक्लिंग सुरू' },
    recycler: { en: 'Processed', hi: 'प्रसंस्कृत', mr: 'प्रक्रिया केलेले' },
  },
  CLOSED: {
    collector: { en: 'Completed', hi: 'पूरा हुआ', mr: 'पूर्ण झाले' },
    recycler: { en: 'Closed', hi: 'बंद', mr: 'बंद' },
  },
  CANCELLED: {
    collector: { en: 'Cancelled', hi: 'रद्द', mr: 'रद्द' },
    recycler: { en: 'Cancelled', hi: 'रद्द', mr: 'रद्द' },
  },
  DISPUTED: {
    collector: { en: 'Needs review', hi: 'समीक्षा आवश्यक', mr: 'तपासणी आवश्यक' },
    recycler: { en: 'Needs review', hi: 'समीक्षा आवश्यक', mr: 'तपासणी आवश्यक' },
  },
};
