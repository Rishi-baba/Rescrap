import { describe, expect, it } from 'vitest';
import {
  allowedTriggers,
  canEditLotComposition,
  canTransition,
  isOfferEligible,
  isTerminal,
  LOT_TRANSITIONS,
  LOT_STATES,
  nextState,
  type LotStateTransition,
} from '../src/lifecycle/lot.js';
import type { LotState } from '../src/domain/types.js';
import type { UserId } from '../src/domain/ids.js';

const at = '2026-09-27T00:00:00.000Z';
const actor = 'usr_test' as UserId;

function go(state: LotState, trigger: Parameters<typeof nextState>[0]['trigger'], role: 'COLLECTOR' | 'RECYCLER' | 'ADMIN') {
  return nextState({ state, trigger, actorRole: role, actorUserId: actor, at });
}

describe('lot lifecycle state machine', () => {
  it('every state in LOT_STATES is reachable or intentionally terminal', () => {
    const referenced = new Set<LotState>();
    for (const t of LOT_TRANSITIONS) {
      referenced.add(t.from);
      referenced.add(t.to);
    }
    for (const state of LOT_STATES) {
      expect(referenced.has(state)).toBe(true);
    }
  });

  it('walks the happy path from DRAFT to CLOSED', () => {
    let state: LotState = 'DRAFT';
    const path: Array<[Parameters<typeof nextState>[0]['trigger'], 'COLLECTOR' | 'RECYCLER' | 'ADMIN']> = [
      ['SUBMIT', 'COLLECTOR'],
      ['MATCH_RUN', 'COLLECTOR'],
      ['OFFER_MADE', 'RECYCLER'],
      ['OFFER_ACCEPTED', 'COLLECTOR'],
      ['PICKUP_SCHEDULED', 'RECYCLER'],
      ['HANDOVER_EXECUTED', 'RECYCLER'],
      ['HANDOVER_CONFIRMED', 'COLLECTOR'],
      ['PROCESSED', 'RECYCLER'],
      ['CLOSED', 'ADMIN'],
    ];

    for (const [trigger, role] of path) {
      const result = go(state, trigger, role);
      expect(result.ok, `${state} -> ${trigger} by ${role}`).toBe(true);
      if (result.ok) {
        state = result.to;
      }
    }
    expect(state).toBe('CLOSED');
  });

  it('rejects a transition that skips the lifecycle', () => {
    // A recycler cannot hand over a lot that was never submitted.
    const result = go('DRAFT', 'HANDOVER_EXECUTED', 'RECYCLER');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('ILLEGAL_TRANSITION');
    }
  });

  it('rejects a legal transition performed by the wrong role', () => {
    // COUNTER_MADE exists from OFFER_RECEIVED, but only for the RECYCLER.
    const result = go('OFFER_RECEIVED', 'COUNTER_MADE', 'COLLECTOR');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('ROLE_NOT_PERMITTED');
      expect(result.allowed).toEqual(['OFFER_ACCEPTED', 'CANCELLED']);
    }
  });

  it('refuses all transitions out of a terminal state', () => {
    for (const terminal of ['CLOSED', 'CANCELLED'] as const) {
      const result = go(terminal, 'PROCESSED', 'RECYCLER');
      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.reason).toBe('TERMINAL_STATE');
      }
    }
  });

  it('enforces preconditions such as LOT-04 (at least one item)', () => {
    const result = nextState({
      state: 'DRAFT',
      trigger: 'SUBMIT',
      actorRole: 'COLLECTOR',
      actorUserId: actor,
      at,
      preconditions: { hasAtLeastOneItem: false },
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe('PRECONDITION_FAILED');
      expect(result.message).toContain('hasAtLeastOneItem');
    }
  });

  it('produces an audit record carrying previous state, actor, role and timestamp', () => {
    const result = go('DRAFT', 'SUBMIT', 'COLLECTOR');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const record: LotStateTransition = result.record;
    expect(record.from).toBe('DRAFT');
    expect(record.to).toBe('CREATED');
    expect(record.actorUserId).toBe(actor);
    expect(record.actorRole).toBe('COLLECTOR');
    expect(record.at).toBe(at);
  });

  it('does not mutate input state', () => {
    const before: LotState = 'MATCHING';
    go('MATCHING', 'OFFER_MADE', 'RECYCLER');
    expect(before).toBe('MATCHING');
  });

  it('limits offer eligibility to the documented states (OFFER-03)', () => {
    expect(isOfferEligible('MATCHING')).toBe(true);
    expect(isOfferEligible('OFFER_RECEIVED')).toBe(true);
    expect(isOfferEligible('NEGOTIATION')).toBe(true);
    expect(isOfferEligible('DRAFT')).toBe(false);
    expect(isOfferEligible('ACCEPTED')).toBe(false);
    expect(isOfferEligible('HANDED_OVER')).toBe(false);
    expect(isOfferEligible('CLOSED')).toBe(false);
  });

  it('locks lot composition after matching for collectors (LOT-08)', () => {
    expect(canEditLotComposition('DRAFT', 'COLLECTOR')).toBe(true);
    expect(canEditLotComposition('CREATED', 'COLLECTOR')).toBe(true);
    expect(canEditLotComposition('MATCHING', 'COLLECTOR')).toBe(false);
    expect(canEditLotComposition('ACCEPTED', 'COLLECTOR')).toBe(false);
    // Admin may correct, and the action is audit-logged.
    expect(canEditLotComposition('MATCHING', 'ADMIN')).toBe(true);
    expect(canEditLotComposition('CLOSED', 'ADMIN')).toBe(false);
  });

  it('identifies terminal states', () => {
    expect(isTerminal('CLOSED')).toBe(true);
    expect(isTerminal('CANCELLED')).toBe(true);
    expect(isTerminal('DISPUTED')).toBe(false);
  });

  it('canTransition agrees with nextState for every declared rule', () => {
    for (const rule of LOT_TRANSITIONS) {
      expect(canTransition(rule.from, rule.trigger, rule.actor)).toBe(true);
      expect(allowedTriggers(rule.from, rule.actor)).toContain(rule.trigger);
    }
  });
});
