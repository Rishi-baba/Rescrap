/**
 * Response envelope. Every successful reply carries the data plus an explicit
 * `demo` flag, so a client can never render demo content as if it were real
 * (rules-and-risk-controls.md HON-01).
 */
import type { ApiEnvelope } from '@rescrap/shared';

export function envelope<T>(data: T, demo = true): ApiEnvelope<T> {
  return { data, demo, at: new Date().toISOString() };
}
