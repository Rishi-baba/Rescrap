/**
 * The normalized error envelope (technical-approach.md 7.4).
 *
 * One shape for every failure: a stable `code` the UI maps to a plain,
 * language-appropriate message. Never a stack trace, never internal detail.
 */
import { DemoError, type ApiErrorShape } from '@rescrap/shared';

export class ApiHttpError extends Error {
  readonly status: number;
  readonly shape: ApiErrorShape;

  constructor(status: number, shape: ApiErrorShape) {
    super(shape.message);
    this.name = 'ApiHttpError';
    this.status = status;
    this.shape = shape;
  }
}

/**
 * Business `code` to HTTP status. A code the API does not recognise becomes a
 * 400 rather than leaking a 500 with internals attached.
 */
const STATUS_BY_CODE: Readonly<Record<string, number>> = {
  UNAUTHENTICATED: 401,
  INVALID_TOKEN: 401,
  TOKEN_EXPIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  IDEMPOTENCY_MISMATCH: 409,
  DUPLICATE: 409,
  RATE_LIMITED: 429,
  INVALID_INPUT: 400,
  VALIDATION_FAILED: 400,
  INVALID_OTP: 400,
  INVALID_STATE: 409,
  ILLEGAL_TRANSITION: 409,
  OFFER_EXPIRED: 409,
  DISCREPANCY_REQUIRES_ACK: 409,
  INTERNAL: 500,
};

/** Report which field failed validation without exposing the whole payload. */
export function validationError(field: string): ApiHttpError {
  return new ApiHttpError(400, {
    code: 'VALIDATION_FAILED',
    message: 'Some details were not valid. Please check and try again.',
    field,
  });
}

export function toHttpError(err: unknown): { status: number; shape: ApiErrorShape } {
  if (err instanceof ApiHttpError) {
    return { status: err.status, shape: err.shape };
  }
  if (err instanceof DemoError) {
    return { status: STATUS_BY_CODE[err.shape.code] ?? 400, shape: err.shape };
  }
  if (err && typeof err === 'object' && 'statusCode' in err && typeof (err as { statusCode: unknown }).statusCode === 'number') {
    const status = (err as { statusCode: number }).statusCode;
    return {
      status,
      shape: { code: status === 400 ? 'INVALID_INPUT' : 'INTERNAL', message: (err as Error).message || 'Invalid request' },
    };
  }
  return {
    status: 500,
    shape: { code: 'INTERNAL', message: 'Something went wrong on our side. Please try again.' },
  };
}
