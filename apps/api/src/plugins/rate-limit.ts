/**
 * Fixed-window rate limiter (workflow-and-security.md 5).
 *
 * In-memory and per-process. Adequate for a single-instance demo; a real
 * deployment must move the counters to shared storage, otherwise the limit is
 * per-pod and therefore not a limit at all. Recorded as a Phase 6 item.
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ApiHttpError } from '../lib/errors.js';

interface Bucket {
  count: number;
  resetAt: number;
}

export interface RateLimitOptions {
  max: number;
  windowMs: number;
  /** Distinguishes the auth budget from the list budget. */
  bucket: string;
}

export function createRateLimiter() {
  const buckets = new Map<string, Bucket>();

  function hit(key: string, options: RateLimitOptions, nowMs: number): { allowed: boolean; retryAfterSeconds: number } {
    const id = `${options.bucket}:${key}`;
    const existing = buckets.get(id);

    if (!existing || existing.resetAt <= nowMs) {
      buckets.set(id, { count: 1, resetAt: nowMs + options.windowMs });
      return { allowed: true, retryAfterSeconds: 0 };
    }
    existing.count += 1;
    if (existing.count > options.max) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - nowMs) / 1000)),
      };
    }
    return { allowed: true, retryAfterSeconds: 0 };
  }

  /** Evict expired buckets so the map cannot grow without bound. */
  function sweep(nowMs: number): void {
    for (const [id, bucket] of buckets) {
      if (bucket.resetAt <= nowMs) {
        buckets.delete(id);
      }
    }
  }

  return { hit, sweep, buckets };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;

export function rateLimit(limiter: RateLimiter, options: RateLimitOptions) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const key = request.ip;
    const nowMs = Date.now();
    if (nowMs % 10_000 < 1_000) {
      limiter.sweep(nowMs);
    }
    const result = limiter.hit(key, options, nowMs);
    if (!result.allowed) {
      reply.header('retry-after', String(result.retryAfterSeconds));
      throw new ApiHttpError(429, {
        code: 'RATE_LIMITED',
        message: 'Too many attempts. Please wait a moment and try again.',
      });
    }
  };
}
