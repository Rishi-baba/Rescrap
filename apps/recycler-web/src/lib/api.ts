/**
 * Recycler Web API Client — DEMO MODE (no backend required).
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
  authorizationIsDemo?: boolean;
  pickupAvailable?: boolean;
}

export interface MakeOfferInput {
  lotId: string;
  amount: number;
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

const delay = (ms = 400) => new Promise((r) => setTimeout(r, ms));

const DEMO_USER: RecyclerUser = {
  id: 'u_recycler_1',
  phone: '+91 90000 00002',
  role: 'RECYCLER',
  name: 'GreenCycle Pvt Ltd',
};

const DEMO_PROFILE: RecyclerProfileData = {
  id: 'u_recycler_1',
  businessName: 'GreenCycle Pvt Ltd',
  verificationStatus: 'VERIFIED',
  authorizedMaterials: ['Computing & IT Equipment', 'Telecom & Smartphones', 'Printed Circuit Boards', 'Lithium-ion Batteries'],
  serviceAreas: ['Pune - Hadapsar', 'Pune - Magarpatta', 'Pune - Kharadi'],
  contactPhone: '+91 90000 00002',
  facilityAddress: 'MIDC Industrial Estate, Phase II, Hadapsar, Pune - 411028',
  authorizationIsDemo: true,
  pickupAvailable: true,
};

const DEMO_DASHBOARD: RecyclerDashboardData = {
  newLotsCount: 7,
  pendingOffersCount: 3,
  activeDealsCount: 2,
  upcomingPickupsCount: 1,
  completedThisMonthCount: 12,
  acceptanceRatePercent: 84,
  recentMatchingLots: [
    { id: 'LOT00042', materialName: 'Mixed E-Waste (IT)', categoryName: 'Computing & IT Equipment', declaredWeightKg: 18.5, condition: 'GOOD', collectionArea: 'Pune - Kharadi', estimatedValuePaise: 185000, photoKeys: [], createdAt: '2026-09-28T10:00:00Z', status: 'SUBMITTED' },
    { id: 'LOT00041', materialName: 'Smartphones Batch', categoryName: 'Telecom & Smartphones', declaredWeightKg: 5.2, condition: 'FAIR', collectionArea: 'Pune - Viman Nagar', estimatedValuePaise: 286000, photoKeys: [], createdAt: '2026-09-27T14:00:00Z', status: 'SUBMITTED' },
    { id: 'LOT00040', materialName: 'PCBs & Motherboards', categoryName: 'Printed Circuit Boards', declaredWeightKg: 8.8, condition: 'GOOD', collectionArea: 'Pune - Hadapsar', estimatedValuePaise: 281600, photoKeys: [], createdAt: '2026-09-26T09:00:00Z', status: 'SUBMITTED' },
    { id: 'LOT00038', materialName: 'Lithium Battery Pack', categoryName: 'Lithium-ion Batteries', declaredWeightKg: 12.0, condition: 'MIXED', collectionArea: 'Pune - Magarpatta', estimatedValuePaise: 264000, photoKeys: [], createdAt: '2026-09-25T16:00:00Z', status: 'SUBMITTED' },
  ],
  pendingActions: [
    { id: 'ACT001', type: 'SCHEDULE_PICKUP', lotId: 'LOT00039', title: 'Schedule pickup for Copper Wire lot', deadline: '2026-10-02T00:00:00Z' },
    { id: 'ACT002', type: 'EXECUTE_HANDOVER', lotId: 'LOT00036', title: 'Complete handover for Motherboards lot', deadline: '2026-09-30T00:00:00Z' },
  ],
};

export class RecyclerApiClient {
  private tokens: AuthTokens | null;
  private readonly onTokens?: (tokens: AuthTokens | null) => void;

  constructor(options: ApiClientOptions = {}) {
    this.tokens = options.tokens ?? null;
    this.onTokens = options.onTokens;
  }

  setTokens(tokens: AuthTokens | null): void {
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

  async verifyOtp(_phone: string, _code: string): Promise<RecyclerSessionData> {
    await delay(800);
    const tokens = { accessToken: 'demo_access_token', refreshToken: 'demo_refresh_token' };
    this.setTokens(tokens);
    return { ...tokens, user: DEMO_USER };
  }

  async logout(): Promise<void> {
    await delay(200);
    this.setTokens(null);
  }

  async getDashboard(): Promise<Envelope<RecyclerDashboardData>> {
    await delay(500);
    return { data: DEMO_DASHBOARD, demo: true };
  }

  async getAvailableLots(_filters: {
    materialCategoryId?: string;
    area?: string;
    minWeightKg?: number;
    maxWeightKg?: number;
  } = {}): Promise<Envelope<readonly RecyclerLotItem[]>> {
    await delay(400);
    return { data: DEMO_DASHBOARD.recentMatchingLots, demo: true };
  }

  async getLot(_lotId: string): Promise<Envelope<RecyclerLotItem>> {
    await delay(300);
    return { data: DEMO_DASHBOARD.recentMatchingLots[0]!, demo: true };
  }

  async makeOffer(_input: MakeOfferInput): Promise<Envelope<RecyclerOfferItem>> {
    await delay(900);
    return {
      data: {
        id: 'OFR' + Date.now(),
        lotId: _input.lotId,
        materialName: 'E-Waste Material',
        amountPaise: _input.amount,
        status: 'PENDING',
        validUntil: _input.validUntil,
        createdAt: new Date().toISOString(),
      },
      demo: true,
    };
  }

  async listMyOffers(): Promise<Envelope<readonly RecyclerOfferItem[]>> {
    await delay(400);
    return {
      data: [
        { id: 'OFR001', lotId: 'LOT00042', materialName: 'Mixed E-Waste (IT)', amountPaise: 195000, status: 'PENDING', validUntil: '2026-10-05T00:00:00Z', createdAt: '2026-09-28T12:00:00Z' },
        { id: 'OFR002', lotId: 'LOT00041', materialName: 'Smartphones Batch', amountPaise: 290000, status: 'ACCEPTED', validUntil: '2026-10-04T00:00:00Z', createdAt: '2026-09-27T15:00:00Z' },
        { id: 'OFR003', lotId: 'LOT00038', materialName: 'Lithium Battery Pack', amountPaise: 260000, status: 'PENDING', validUntil: '2026-10-03T00:00:00Z', createdAt: '2026-09-26T10:00:00Z' },
      ],
      demo: true,
    };
  }

  async schedulePickup(_input: SchedulePickupInput): Promise<Envelope<RecyclerDealItem>> {
    await delay(800);
    return {
      data: {
        id: 'DEAL' + Date.now(),
        lotId: _input.lotId,
        materialName: 'E-Waste Material',
        collectorArea: 'Pune - Kharadi',
        agreedAmountPaise: 195000,
        status: 'PICKUP_SCHEDULED',
        pickupDate: _input.scheduledFor,
        declaredWeightKg: 18.5,
      },
      demo: true,
    };
  }

  async executeHandover(_input: ExecuteHandoverInput): Promise<Envelope<RecyclerDealItem>> {
    await delay(1000);
    return {
      data: {
        id: 'DEAL001',
        lotId: 'LOT00039',
        materialName: 'Copper Wire',
        collectorArea: 'Pune - Hadapsar',
        agreedAmountPaise: 165000,
        status: 'HANDOVER_EXECUTED',
        declaredWeightKg: 6.2,
        finalWeightKg: _input.finalWeightKg,
      },
      demo: true,
    };
  }

  async getProfile(): Promise<Envelope<RecyclerProfileData>> {
    await delay(300);
    return { data: DEMO_PROFILE, demo: true };
  }

  async listTransactions(): Promise<Envelope<readonly RecyclerTransactionItem[]>> {
    await delay(400);
    return {
      data: [
        { id: 'TXN001', lotId: 'LOT00035', materialName: 'Motherboards', finalWeightKg: 4.8, finalAmountPaise: 153600, paymentMethod: 'UPI', paymentStatus: 'COMPLETED', completedAt: '2026-09-17T10:00:00Z', traceabilityHash: 'a3f8b2c1d4e5f6a7b8c9d0e1f2a3b4c5' },
        { id: 'TXN002', lotId: 'LOT00031', materialName: 'Smartphones', finalWeightKg: 2.1, finalAmountPaise: 115500, paymentMethod: 'UPI', paymentStatus: 'COMPLETED', completedAt: '2026-09-12T12:00:00Z', traceabilityHash: 'b4c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3' },
        { id: 'TXN003', lotId: 'LOT00028', materialName: 'Copper Wire', finalWeightKg: 9.3, finalAmountPaise: 446400, paymentMethod: 'BANK_TRANSFER', paymentStatus: 'COMPLETED', completedAt: '2026-09-05T09:00:00Z', traceabilityHash: 'c5d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4' },
      ],
      demo: true,
    };
  }
}
