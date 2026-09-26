/**
 * Recycler Web API Client.
 *
 * Direct typed HTTP communication with the Fastify backend, unwrapping
 * standardized envelopes and handling errors.
 */

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
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RecyclerUser {
  id: string;
  phone: string;
  role: 'RECYCLER';
  name: string;
}

export interface RecyclerSessionData {
  accessToken: string;
  refreshToken: string;
  user: RecyclerUser;
}

export interface RecyclerDashboardData {
  newLotsCount: number;
  pendingOffersCount: number;
  activeDealsCount: number;
  upcomingPickupsCount: number;
  completedThisMonthCount: number;
  acceptanceRatePercent: number;
  recentMatchingLots: readonly RecyclerLotItem[];
  pendingActions: readonly PendingActionItem[];
}

export interface RecyclerLotItem {
  id: string;
  materialName: string;
  categoryName: string;
  declaredWeightKg: number;
  condition: string;
  collectionArea: string;
  estimatedValuePaise: number;
  photoKeys: readonly string[];
  createdAt: string;
  status: string;
}

export interface PendingActionItem {
  id: string;
  type: 'SCHEDULE_PICKUP' | 'EXECUTE_HANDOVER' | 'COUNTER_OFFER';
  lotId: string;
  title: string;
  deadline?: string;
}

export interface RecyclerOfferItem {
  id: string;
  lotId: string;
  materialName: string;
  amountPaise: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'SUPERSEDED' | 'EXPIRED';
  validUntil: string;
  createdAt: string;
  justification?: string;
}

export interface RecyclerDealItem {
  id: string;
  lotId: string;
  materialName: string;
  collectorArea: string;
  agreedAmountPaise: number;
  status: 'OFFER_ACCEPTED' | 'PICKUP_SCHEDULED' | 'HANDOVER_EXECUTED' | 'VERIFIED' | 'COMPLETED';
  pickupDate?: string;
  handoverId?: string;
  declaredWeightKg: number;
  finalWeightKg?: number;
}

export interface RecyclerTransactionItem {
  id: string;
  lotId: string;
  materialName: string;
  finalWeightKg: number;
  finalAmountPaise: number;
  paymentMethod: string;
  paymentStatus: string;
  completedAt: string;
  traceabilityHash: string;
}

export interface RecyclerProfileData {
  id: string;
  businessName: string;
  verificationStatus: 'VERIFIED' | 'PENDING_REVIEW' | 'REJECTED';
  authorizedMaterials: readonly string[];
  serviceAreas: readonly string[];
  contactPhone: string;
  facilityAddress: string;
}

export interface MakeOfferInput {
  lotId: string;
  amount: number; // in integer paise
  validUntil: string;
  justification?: string;
  idempotencyKey: string;
}

export interface SchedulePickupInput {
  lotId: string;
  scheduledFor: string;
  teamNotes?: string;
  idempotencyKey: string;
}

export interface ExecuteHandoverInput {
  handoverId: string;
  finalWeightKg: number;
  photoKeys: readonly string[];
  location: { lat: number; lng: number };
  idempotencyKey: string;
}

export interface ApiClientOptions {
  baseUrl?: string;
  tokens?: AuthTokens | null;
  onTokens?: (tokens: AuthTokens | null) => void;
  fetchImpl?: typeof fetch;
}

export class RecyclerApiClient {
  private readonly baseUrl: string;
  private tokens: AuthTokens | null;
  private readonly onTokens?: (tokens: AuthTokens | null) => void;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = (options.baseUrl ?? 'http://127.0.0.1:3000').replace(/\/+$/, '');
    this.tokens = options.tokens ?? null;
    this.onTokens = options.onTokens;
    this.fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  }

  setTokens(tokens: AuthTokens | null): void {
    this.tokens = tokens;
    this.onTokens?.(tokens);
  }

  get hasSession(): boolean {
    return Boolean(this.tokens?.accessToken);
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<Envelope<T>> {
    const headers = new Headers(init.headers);
    if (!headers.has('content-type') && init.body) {
      headers.set('content-type', 'application/json');
    }
    if (this.tokens?.accessToken && !headers.has('authorization')) {
      headers.set('authorization', `Bearer ${this.tokens.accessToken}`);
    }

    const res = await this.fetchImpl(`${this.baseUrl}${path}`, {
      ...init,
      headers,
    });

    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new ApiError('COMMUNICATION_ERROR', 'The service sent an unexpected reply.', res.status);
    }

    const envelope = body as Envelope<T>;
    if (!res.ok || envelope.error) {
      const err = envelope.error ?? { code: 'UNKNOWN_ERROR', message: `Server error (${res.status})` };
      throw new ApiError(err.code, err.message, res.status, err.field);
    }

    return envelope;
  }

  async meta(): Promise<Envelope<{ demo: boolean; reality: Record<string, string> }>> {
    return this.request('/meta');
  }

  async requestOtp(phone: string): Promise<Envelope<{ status: string; devOtp?: string }>> {
    return this.request('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ phone, role: 'RECYCLER' }),
    });
  }

  async verifyOtp(phone: string, code: string): Promise<RecyclerSessionData> {
    const res = await this.request<RecyclerSessionData>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, role: 'RECYCLER', code }),
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

  async getDashboard(): Promise<Envelope<RecyclerDashboardData>> {
    return this.request('/recycler/dashboard');
  }

  async getAvailableLots(filters: {
    materialCategoryId?: string;
    area?: string;
    minWeightKg?: number;
    maxWeightKg?: number;
  } = {}): Promise<Envelope<readonly RecyclerLotItem[]>> {
    const params = new URLSearchParams();
    if (filters.materialCategoryId) params.set('materialCategoryId', filters.materialCategoryId);
    if (filters.area) params.set('area', filters.area);
    if (filters.minWeightKg) params.set('minWeightKg', String(filters.minWeightKg));
    if (filters.maxWeightKg) params.set('maxWeightKg', String(filters.maxWeightKg));
    const qs = params.toString();
    return this.request(`/recycler/lots${qs ? `?${qs}` : ''}`);
  }

  async getLot(lotId: string): Promise<Envelope<RecyclerLotItem>> {
    return this.request(`/recycler/lots/${encodeURIComponent(lotId)}`);
  }

  async makeOffer(input: MakeOfferInput): Promise<Envelope<RecyclerOfferItem>> {
    return this.request('/recycler/offers', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async listMyOffers(): Promise<Envelope<readonly RecyclerOfferItem[]>> {
    return this.request('/recycler/offers');
  }

  async schedulePickup(input: SchedulePickupInput): Promise<Envelope<RecyclerDealItem>> {
    return this.request('/recycler/handovers/schedule', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async executeHandover(input: ExecuteHandoverInput): Promise<Envelope<RecyclerDealItem>> {
    return this.request('/recycler/handovers/execute', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getProfile(): Promise<Envelope<RecyclerProfileData>> {
    return this.request('/recycler/profile');
  }

  async listTransactions(): Promise<Envelope<readonly RecyclerTransactionItem[]>> {
    return this.request('/recycler/transactions');
  }
}
