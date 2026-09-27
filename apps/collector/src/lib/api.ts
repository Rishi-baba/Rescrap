/**
 * Collector API Client.
 *
 * Implements communication with Fastify backend. If offline or network unavailable,
 * errors cleanly so caller can queue operations in offline-db outbox.
 */
import { offlineDb } from './offline-db.js';

export interface Envelope<T> {
  data: T;
  demo?: boolean;
  at?: string;
  error?: {
    code: string;
    message: string;
    field?: string;
  };
}

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface CollectorUser {
  id: string;
  phone: string;
  role: 'COLLECTOR';
  name: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface CollectorSessionData extends AuthTokens {
  user: CollectorUser;
}

export interface CollectorHomeData {
  activeLot?: {
    id: string;
    materialName: string;
    declaredWeightKg: number;
    lifecycleState: string;
    estimatedValuePaise: number;
    offersCount: number;
  };
  recentLots: readonly {
    id: string;
    materialName: string;
    declaredWeightKg: number;
    lifecycleState: string;
    createdAt: string;
  }[];
  priceTeasers: readonly {
    materialName: string;
    buyingPricePerKgPaise: number;
  }[];
}

export interface SubmitLotPayload {
  items: readonly {
    materialId: string;
    materialConfirmed: boolean;
    declaredWeightKg: number;
    condition: string;
    sourceType: string;
    photoKeys: readonly string[];
  }[];
  collectionArea: string;
  idempotencyKey: string;
}

export interface CollectorApiClientOptions {
  baseUrl?: string;
  tokens?: { accessToken: string; refreshToken: string } | null;
  onTokens?: (tokens: { accessToken: string; refreshToken: string } | null) => void;
  fetchImpl?: typeof fetch;
}

export class CollectorApiClient {
  private readonly baseUrl: string;
  private tokens: { accessToken: string; refreshToken: string } | null;
  private readonly onTokens?: (tokens: { accessToken: string; refreshToken: string } | null) => void;
  private readonly fetchImpl: typeof fetch;

  constructor(options: CollectorApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? 'http://127.0.0.1:3000').replace(/\/+$/, '');
    this.tokens = options.tokens ?? null;
    this.onTokens = options.onTokens;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  setTokens(tokens: { accessToken: string; refreshToken: string } | null): void {
    this.tokens = tokens;
    this.onTokens?.(tokens);
  }

  get hasSession(): boolean {
    return Boolean(this.tokens?.accessToken);
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<Envelope<T>> {
    // If user has toggled simulated offline mode, reject immediately
    if (!offlineDb.isOnline()) {
      throw new ApiError('OFFLINE', 'No internet connection', 0);
    }

    const headers = new Headers(init.headers);
    if (!headers.has('content-type') && init.body) {
      headers.set('content-type', 'application/json');
    }
    if (this.tokens?.accessToken && !headers.has('authorization')) {
      headers.set('authorization', `Bearer ${this.tokens.accessToken}`);
    }

    try {
      let res = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        headers,
      });

      // If token expired (401), attempt rotating refresh and retry once
      if (res.status === 401 && this.tokens?.refreshToken && !path.startsWith('/auth/')) {
        try {
          const refreshRes = await this.fetchImpl(`${this.baseUrl}/auth/refresh`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ refreshToken: this.tokens.refreshToken }),
          });
          if (refreshRes.ok) {
            const refreshBody = (await refreshRes.json()) as Envelope<AuthTokens>;
            if (refreshBody.data?.accessToken) {
              this.setTokens({
                accessToken: refreshBody.data.accessToken,
                refreshToken: refreshBody.data.refreshToken,
              });
              headers.set('authorization', `Bearer ${refreshBody.data.accessToken}`);
              res = await this.fetchImpl(`${this.baseUrl}${path}`, {
                ...init,
                headers,
              });
            }
          } else {
            this.setTokens(null);
          }
        } catch {
          this.setTokens(null);
        }
      }

      const body = (await res.json()) as Envelope<T>;
      if (!res.ok || body.error) {
        if (res.status === 401) {
          this.setTokens(null);
        }
        const err = body.error ?? { code: 'UNKNOWN_ERROR', message: `Server error ${res.status}` };
        throw new ApiError(err.code, err.message, res.status);
      }
      return body;
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError('NETWORK_ERROR', 'Network connection unavailable', 0);
    }
  }

  async refresh(): Promise<AuthTokens | null> {
    if (!this.tokens?.refreshToken) return null;
    try {
      const refreshRes = await this.fetchImpl(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.tokens.refreshToken }),
      });
      if (!refreshRes.ok) {
        this.setTokens(null);
        return null;
      }
      const body = (await refreshRes.json()) as Envelope<AuthTokens>;
      this.setTokens(body.data);
      return body.data;
    } catch {
      this.setTokens(null);
      return null;
    }
  }

  async meta(): Promise<Envelope<{ demo: boolean; reality: Record<string, string> }>> {
    return this.request('/meta');
  }

  async requestOtp(phone: string): Promise<Envelope<{ status: string; devOtp?: string }>> {
    return this.request('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ phone, role: 'COLLECTOR' }),
    });
  }

  async verifyOtp(phone: string, code: string): Promise<CollectorSessionData> {
    const res = await this.request<CollectorSessionData>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, role: 'COLLECTOR', code }),
    });
    this.setTokens({ accessToken: res.data.accessToken, refreshToken: res.data.refreshToken });
    return res.data;
  }

  async logout(): Promise<void> {
    try {
      if (this.tokens?.refreshToken) {
        await this.request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: this.tokens.refreshToken }),
        });
      }
    } finally {
      this.setTokens(null);
    }
  }

  async getHome(): Promise<Envelope<CollectorHomeData>> {
    return this.request('/collector/home');
  }

  async submitLot(payload: SubmitLotPayload): Promise<Envelope<{ id: string; state: string }>> {
    return this.request('/collector/lots', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getLot(id: string): Promise<Envelope<Record<string, unknown>>> {
    return this.request(`/collector/lots/${encodeURIComponent(id)}`);
  }

  async acceptOffer(offerId: string, idempotencyKey: string): Promise<Envelope<Record<string, unknown>>> {
    return this.request(`/collector/offers/${encodeURIComponent(offerId)}/accept`, {
      method: 'POST',
      body: JSON.stringify({ idempotencyKey }),
    });
  }

  async verifyHandover(handoverId: string, acknowledged: boolean, idempotencyKey: string): Promise<Envelope<Record<string, unknown>>> {
    return this.request(`/collector/handovers/${encodeURIComponent(handoverId)}/verify`, {
      method: 'POST',
      body: JSON.stringify({ acknowledged, idempotencyKey }),
    });
  }

  async getEarnings(): Promise<Envelope<{ confirmedTotal: number; pendingTotal: number; ledger: readonly Record<string, unknown>[] }>> {
    return this.request('/collector/earnings');
  }

  async getPriceBoard(area = 'all'): Promise<Envelope<readonly Record<string, unknown>[]>> {
    return this.request(`/prices?area=${encodeURIComponent(area)}`);
  }

  async syncBatch(operations: readonly Record<string, unknown>[]): Promise<Envelope<{ results: readonly Record<string, unknown>[] }>> {
    return this.request('/collector/sync/batch', {
      method: 'POST',
      body: JSON.stringify({ operations }),
    });
  }
}
