/**
 * ReScrap identifier helpers.
 *
 * Rule LOT-03: Lot IDs are server-generated, sequential and human-readable.
 * They are never client-asserted.
 */

export const LOT_ID_PREFIX = 'LOT-RS-';
export const LOT_ID_DIGITS = 5;

export function formatLotId(sequence: number): string {
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new RangeError(`Lot sequence must be a positive integer, received ${sequence}`);
  }
  return `${LOT_ID_PREFIX}${String(sequence).padStart(LOT_ID_DIGITS, '0')}`;
}

export function parseLotSequence(lotId: string): number {
  if (!lotId.startsWith(LOT_ID_PREFIX)) {
    throw new RangeError(`Not a ReScrap lot id: ${lotId}`);
  }
  const raw = lotId.slice(LOT_ID_PREFIX.length);
  if (!/^\d+$/.test(raw)) {
    throw new RangeError(`Lot id has non-numeric sequence: ${lotId}`);
  }
  return Number.parseInt(raw, 10);
}

export function isLotId(value: string): boolean {
  try {
    parseLotSequence(value);
    return true;
  } catch {
    return false;
  }
}

export type Branded<T, B extends string> = T & { readonly __brand: B };

export type UserId = Branded<string, 'UserId'>;
export type CollectorId = Branded<string, 'CollectorId'>;
export type RecyclerId = Branded<string, 'RecyclerId'>;
export type AdminId = Branded<string, 'AdminId'>;
export type MaterialId = Branded<string, 'MaterialId'>;
export type MaterialCategoryId = Branded<string, 'MaterialCategoryId'>;
export type LotId = Branded<string, 'LotId'>;
export type LotItemId = Branded<string, 'LotItemId'>;
export type OfferId = Branded<string, 'OfferId'>;
export type HandoverId = Branded<string, 'HandoverId'>;
export type PaymentId = Branded<string, 'PaymentId'>;
export type TransactionId = Branded<string, 'TransactionId'>;
export type PriceRecordId = Branded<string, 'PriceRecordId'>;
export type NotificationId = Branded<string, 'NotificationId'>;
export type TraceabilityRecordId = Branded<string, 'TraceabilityRecordId'>;
export type AuditEventId = Branded<string, 'AuditEventId'>;
export type AiPredictionId = Branded<string, 'AiPredictionId'>;
export type IdempotencyKey = Branded<string, 'IdempotencyKey'>;
