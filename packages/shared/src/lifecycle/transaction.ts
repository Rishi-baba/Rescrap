/**
 * ReScrap transaction and offer lifecycle rules.
 *
 * Rule TXN-03: transaction status is DERIVED from component state and is
 * never set independently. This module is the only place that derivation
 * happens.
 */

import type {
  Handover,
  HandoverState,
  OfferState,
  Payment,
  PaymentState,
  TransactionStatus,
} from '../domain/types.js';

export const OFFER_STATE_PRESENTATION: Record<OfferState, string> = {
  PENDING: 'Waiting for reply',
  COUNTERED: 'Countered',
  ACCEPTED: 'Accepted',
  REJECTED: 'Declined',
  WITHDRAWN: 'Withdrawn',
  EXPIRED: 'Expired',
  SUPERSEDED: 'Another offer was accepted',
};

export const HANDOVER_STATE_PRESENTATION: Record<HandoverState, string> = {
  SCHEDULED: 'Pickup scheduled',
  EXECUTED: 'Handed over - awaiting your confirmation',
  CONFIRMED: 'Handover complete',
  DISPUTED: 'Needs review',
};

export const PAYMENT_STATE_PRESENTATION: Record<PaymentState, string> = {
  PENDING: 'Payment pending',
  CONFIRMED: 'Paid',
  DISPUTED: 'Needs review',
  CANCELLED: 'Cancelled',
};

export interface TransactionComponents {
  handover: Handover;
  payment: Payment;
  /** True once the recycler reports the material has entered the recycling stream. */
  recyclingStarted?: boolean;
  recyclingComplete?: boolean;
  disputed?: boolean;
}

/**
 * Derive transaction status. Pure. No component can be trusted to carry
 * its own idea of the transaction status.
 */
export function deriveTransactionStatus(components: TransactionComponents): TransactionStatus {
  const { handover, payment } = components;

  if (components.disputed || handover.state === 'DISPUTED' || payment.state === 'DISPUTED') {
    return 'DISPUTED';
  }
  if (components.recyclingComplete) {
    return 'RECYCLED';
  }
  if (components.recyclingStarted) {
    return 'IN_RECYCLED_PROCESS';
  }
  if (handover.state === 'CONFIRMED' && payment.state === 'CONFIRMED') {
    return 'COMPLETED';
  }
  if (handover.state === 'CONFIRMED' || handover.state === 'EXECUTED') {
    return 'AWAITING_PAYMENT';
  }
  return 'AWAITING_HANDOVER';
}

export const TRANSACTION_STATUS_PRESENTATION: Record<TransactionStatus, string> = {
  AWAITING_HANDOVER: 'Waiting for handover',
  AWAITING_PAYMENT: 'Waiting for payment',
  COMPLETED: 'Completed',
  IN_RECYCLED_PROCESS: 'In recycling',
  RECYCLED: 'Recycled',
  DISPUTED: 'Needs review',
};

/**
 * Rule EARN-01: only CONFIRMED payments count as earnings.
 * Pending, offered and accepted amounts are shown separately and are
 * never counted as earned (EARN-02).
 */
export interface EarningsBreakdown {
  confirmed: number;
  pending: number;
  offered: number;
  accepted: number;
  disputed: number;
  lotCount: number;
}

export function computeEarnings(
  payments: readonly Payment[],
  offeredAmounts: readonly number[] = [],
  acceptedAmounts: readonly number[] = [],
): EarningsBreakdown {
  let confirmed = 0;
  let pending = 0;
  let disputed = 0;
  let lotCount = 0;

  for (const p of payments) {
    if (p.state === 'CONFIRMED') {
      confirmed += p.amount;
      lotCount += 1;
    } else if (p.state === 'PENDING') {
      pending += p.amount;
    } else if (p.state === 'DISPUTED') {
      disputed += p.amount;
    }
  }

  return {
    confirmed,
    pending,
    disputed,
    offered: offeredAmounts.reduce((a, b) => a + b, 0),
    accepted: acceptedAmounts.reduce((a, b) => a + b, 0),
    lotCount,
  };
}
