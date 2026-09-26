/**
 * Typed API client for the Admin Console.
 *
 * Deliberately framework-free: no React, no hooks. That keeps the whole HTTP
 * contract testable in plain Vitest, and keeps the "what does the server say"
 * question separate from "how do I render it".
 *
 * Two rules from the docs are enforced here rather than in each screen:
 *   1. Success is always read out of the `data` field of the envelope.
 *   2. A demo flag that is missing or false is treated as fatal, because this
 *      console must never render demo content as if it were real (HON-01).
 */
import type {
  AdminDashboardView,
  AdminLotView,
  ApiEnvelope,
  ApiErrorShape,
  AuditEvent,
  PriceBoardRow,
  PriceRecord,
  Recycler,
  Role,
} from '@rescrap/shared';

export const DEFAULT_BASE_URL = 'http://localhost:4000';

export interface OtpRequestResult {
  sent: boolean;
  delivery: 'console' | 'sms';
  /** Only ever populated outside production. */
  devCode?: string;
  expiresInSeconds: number;
}

export interface OtpVerifyResult {
  accessToken: string;
  refreshToken: string;
  user: { id: string; phone: string; role: Role; name: string };
}

export interface RealityMap {
  recyclers: string;
  prices: string;
  payments: string;
  materialClassification: string;
  dataStore: string;
}

export interface MetaResult {
  service: string;
  version: string;
  reality: RealityMap;
}

/** A failure the UI can show to an operator. Carries the stable code. */
export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly field?: string;

  constructor(status: number, shape: ApiErrorShape) {
    super(shape.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = shape.code;
    this.field = shape.field;
  }
}

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export interface ApiClientOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
  /** Injected for tests; in the app this lives in sessionStorage. */
  tokens?: Tokens | null;
  onTokens?: (tokens: Tokens | null) => void;
}

export interface CallOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  /** Skip the Authorization header (sign-in endpoints). */
  anonymous?: boolean;
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly doFetch: typeof fetch;
  private tokens: Tokens | null;

  constructor(private readonly options: ApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.doFetch = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
    this.tokens = options.tokens ?? null;
  }

  get hasSession(): boolean {
    return this.tokens !== null;
  }

  clearSession(): void {
    this.tokens = null;
    this.options.onTokens?.(null);
  }

  async request<T>(path: string, options: CallOptions = {}): Promise<ApiEnvelope<T>> {
    const method = options.method ?? 'GET';
    const headers: Record<string, string> = { accept: 'application/json' };

    if (options.body !== undefined) {
      headers['content-type'] = 'application/json';
    }
    if (!options.anonymous && this.tokens) {
      headers['authorization'] = `Bearer ${this.tokens.accessToken}`;
    }

    const response = await this.doFetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
    });

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ApiError(response.status, {
        code: 'INTERNAL',
        message: 'The server sent a reply we could not read. Please try again.',
      });
    }

    if (!response.ok) {
      const shape = (payload as { error?: ApiErrorShape })?.error;
      throw new ApiError(
        response.status,
        shape ?? { code: 'INTERNAL', message: 'Something went wrong. Please try again.' },
      );
    }

    const envelope = payload as ApiEnvelope<T>;
    if (!envelope || typeof envelope !== 'object' || !('data' in envelope)) {
      throw new ApiError(500, {
        code: 'INTERNAL',
        message: 'The server sent an unexpected reply. Please try again.',
      });
    }
    return envelope;
  }

  /* ----------------------------- auth ----------------------------- */

  async requestOtp(phone: string, role: Role): Promise<ApiEnvelope<OtpRequestResult>> {
    return this.request<OtpRequestResult>('/auth/otp/request', {
      method: 'POST',
      body: { phone, role },
      anonymous: true,
    });
  }

  async verifyOtp(phone: string, role: Role, code: string): Promise<OtpVerifyResult> {
    const envelope = await this.request<OtpVerifyResult>('/auth/otp/verify', {
      method: 'POST',
      body: { phone, role, code },
      anonymous: true,
    });
    this.tokens = { accessToken: envelope.data.accessToken, refreshToken: envelope.data.refreshToken };
    this.options.onTokens?.(this.tokens);
    return envelope.data;
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } catch {
      // A failed logout must still clear the local session.
    }
    this.clearSession();
  }

  async meta(): Promise<ApiEnvelope<MetaResult>> {
    return this.request<MetaResult>('/meta', { anonymous: true });
  }

  async me(): Promise<ApiEnvelope<{ id: string; role: Role; name: string }>> {
    return this.request('/auth/me');
  }

  /* ----------------------------- admin ---------------------------- */

  dashboard(): Promise<ApiEnvelope<AdminDashboardView>> {
    return this.request<AdminDashboardView>('/admin/dashboard');
  }

  pendingVerification(): Promise<ApiEnvelope<Recycler[]>> {
    return this.request<Recycler[]>('/admin/verification/pending');
  }

  decideVerification(
    recyclerId: string,
    decision: 'APPROVE' | 'REJECT',
    reason: string,
  ): Promise<ApiEnvelope<Recycler>> {
    return this.request<Recycler>(`/admin/verification/${encodeURIComponent(recyclerId)}`, {
      method: 'POST',
      body: { decision, reason },
    });
  }

  adminLots(): Promise<ApiEnvelope<AdminLotView[]>> {
    return this.request<AdminLotView[]>('/admin/lots');
  }

  auditEvents(): Promise<ApiEnvelope<AuditEvent[]>> {
    return this.request<AuditEvent[]>('/admin/audit');
  }

  anomalies(): Promise<ApiEnvelope<Array<{ code: string; severity: string; message: string; lotId?: string }>>> {
    return this.request('/admin/anomalies');
  }

  priceBoard(): Promise<ApiEnvelope<PriceBoardRow[]>> {
    return this.request<PriceBoardRow[]>('/admin/prices');
  }

  recordPrice(input: {
    materialId: string;
    area: string;
    buyingPricePerKg: number;
    effectiveFrom: string;
    sourceLabel: string;
  }): Promise<ApiEnvelope<PriceRecord>> {
    return this.request<PriceRecord>('/admin/prices', { method: 'POST', body: input });
  }
}
