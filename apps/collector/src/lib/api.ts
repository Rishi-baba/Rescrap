/**
 * Collector API Client — DEMO MODE (no backend required).
 * All methods return realistic mock data instantly.
 */

export interface Envelope<T> {
  data: T;
  demo?: boolean;
  at?: string;
  error?: { code: string; message: string; field?: string };
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

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

const DEMO_USER: CollectorUser = {
  id: 'u_collector_1',
  phone: '+91 98765 43210',
  role: 'COLLECTOR',
  name: 'Sunita Devi',
};

const DEMO_HOME: CollectorHomeData = {
  activeLot: {
    id: 'LOT00042',
    materialName: 'Mixed E-Waste (IT Equipment)',
    declaredWeightKg: 18.5,
    lifecycleState: 'OFFERS_RECEIVED',
    estimatedValuePaise: 185000,
    offersCount: 3,
  },
  recentLots: [
    { id: 'LOT00039', materialName: 'Copper Wire', declaredWeightKg: 6.2, lifecycleState: 'COMPLETED', createdAt: '2026-09-20T10:00:00Z' },
    { id: 'LOT00035', materialName: 'Motherboards', declaredWeightKg: 4.8, lifecycleState: 'COMPLETED', createdAt: '2026-09-15T09:00:00Z' },
    { id: 'LOT00031', materialName: 'Smartphones', declaredWeightKg: 2.1, lifecycleState: 'COMPLETED', createdAt: '2026-09-10T11:00:00Z' },
  ],
  priceTeasers: [
    { materialName: 'Copper Wire', buyingPricePerKgPaise: 48000 },
    { materialName: 'Motherboards', buyingPricePerKgPaise: 32000 },
    { materialName: 'Lithium Batteries', buyingPricePerKgPaise: 22000 },
    { materialName: 'Smartphones', buyingPricePerKgPaise: 55000 },
  ],
};

export class CollectorApiClient {
  private tokens: { accessToken: string; refreshToken: string } | null;
  private readonly onTokens?: (tokens: { accessToken: string; refreshToken: string } | null) => void;

  constructor(options: CollectorApiClientOptions = {}) {
    this.tokens = options.tokens ?? null;
    this.onTokens = options.onTokens;
  }

  setTokens(tokens: { accessToken: string; refreshToken: string } | null): void {
    this.tokens = tokens;
    this.onTokens?.(tokens);
  }

  get hasSession(): boolean {
    return Boolean(this.tokens?.accessToken);
  }

  async meta(): Promise<Envelope<{ demo: boolean; reality: Record<string, string> }>> {
    await delay(100);
    return { data: { demo: true, reality: { mode: 'DEMO', version: '1.0' } }, demo: true };
  }

  async requestOtp(_phone: string): Promise<Envelope<{ status: string; devOtp?: string }>> {
    await delay(600);
    return { data: { status: 'SENT', devOtp: '123456' }, demo: true };
  }

  async verifyOtp(_phone: string, _code: string): Promise<CollectorSessionData> {
    await delay(800);
    const tokens = { accessToken: 'demo_access_token', refreshToken: 'demo_refresh_token' };
    this.setTokens(tokens);
    return { ...tokens, user: DEMO_USER };
  }

  async logout(): Promise<void> {
    await delay(200);
    this.setTokens(null);
  }

  async getHome(): Promise<Envelope<CollectorHomeData>> {
    await delay(500);
    return { data: DEMO_HOME, demo: true };
  }

  async submitLot(_payload: SubmitLotPayload): Promise<Envelope<{ id: string; state: string }>> {
    await delay(1000);
    return { data: { id: 'LOT00099', state: 'SUBMITTED' }, demo: true };
  }

  async getLot(_id: string): Promise<Envelope<Record<string, unknown>>> {
    await delay(400);
    return {
      data: {
        id: 'LOT00042',
        state: 'OFFERS_RECEIVED',
        materialName: 'Mixed E-Waste',
        declaredWeightKg: 18.5,
        estimatedValuePaise: 185000,
        offers: [
          { id: 'OFR001', recyclerName: 'GreenCycle Pvt Ltd', amountPaise: 195000, validUntil: '2026-10-05T00:00:00Z' },
          { id: 'OFR002', recyclerName: 'EcoReclaim India', amountPaise: 180000, validUntil: '2026-10-04T00:00:00Z' },
        ],
      },
      demo: true,
    };
  }

  async acceptOffer(_offerId: string, _idempotencyKey: string): Promise<Envelope<Record<string, unknown>>> {
    await delay(800);
    return { data: { status: 'ACCEPTED' }, demo: true };
  }

  async verifyHandover(_handoverId: string, _acknowledged: boolean, _idempotencyKey: string): Promise<Envelope<Record<string, unknown>>> {
    await delay(800);
    return { data: { status: 'VERIFIED' }, demo: true };
  }

  async getEarnings(): Promise<Envelope<{ confirmedTotal: number; pendingTotal: number; ledger: readonly Record<string, unknown>[] }>> {
    await delay(400);
    return {
      data: {
        confirmedTotal: 425000,
        pendingTotal: 185000,
        ledger: [
          { lotId: 'LOT00039', material: 'Copper Wire', amountPaise: 165000, date: '2026-09-22T10:00:00Z', status: 'PAID' },
          { lotId: 'LOT00035', material: 'Motherboards', amountPaise: 140000, date: '2026-09-17T09:00:00Z', status: 'PAID' },
          { lotId: 'LOT00031', material: 'Smartphones', amountPaise: 120000, date: '2026-09-12T11:00:00Z', status: 'PAID' },
        ],
      },
      demo: true,
    };
  }

  async getPriceBoard(_area = 'all'): Promise<Envelope<readonly Record<string, unknown>[]>> {
    await delay(300);
    return {
      data: [
        { materialName: 'Copper Wire', buyingPricePerKgPaise: 48000, area: 'Pune' },
        { materialName: 'Motherboards', buyingPricePerKgPaise: 32000, area: 'Pune' },
        { materialName: 'Smartphones', buyingPricePerKgPaise: 55000, area: 'Pune' },
        { materialName: 'Lithium Batteries', buyingPricePerKgPaise: 22000, area: 'Pune' },
      ],
      demo: true,
    };
  }

  async syncBatch(_operations: readonly Record<string, unknown>[]): Promise<Envelope<{ results: readonly Record<string, unknown>[] }>> {
    await delay(300);
    return { data: { results: [] }, demo: true };
  }

  async refresh(): Promise<AuthTokens | null> {
    return this.tokens;
  }
}
