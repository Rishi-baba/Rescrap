/**
 * Offline Database & Outbox Store for Collector App.
 *
 * Implements local-first storage (matching SQLite semantics in browser localStorage).
 * All collector actions persist here first before attempting network transmission (FD-06, D-07).
 */

export interface QueuedOperation {
  id: string;
  operation: 'SUBMIT_LOT' | 'ACCEPT_OFFER' | 'DECLINE_OFFER' | 'VERIFY_HANDOVER';
  lotId?: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  createdAt: string;
  retryCount: number;
}

export interface LocalScrapLot {
  id: string;
  materialId: string;
  materialName: string;
  categoryName: string;
  declaredWeightKg: number;
  condition: string;
  sourceType: string;
  photoDataUrl?: string;
  estimatedValuePaise: number;
  collectionArea: string;
  createdAt: string;
  syncStatus: 'SAVED_LOCALLY' | 'SYNCED';
  lifecycleState: 'DRAFT' | 'SUBMITTED' | 'OFFER_RECEIVED' | 'OFFER_ACCEPTED' | 'PICKUP_SCHEDULED' | 'HANDOVER_EXECUTED' | 'VERIFIED' | 'COMPLETED';
}

const LOTS_KEY = 'rescrap.collector.lots';
const OUTBOX_KEY = 'rescrap.collector.outbox';
const LOCALE_KEY = 'rescrap.collector.locale';
const NETWORK_KEY = 'rescrap.collector.isOnline';

const memoryStore = new Map<string, string>();
const storage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof localStorage !== 'undefined') return localStorage.getItem(key);
    } catch {}
    return memoryStore.get(key) ?? null;
  },
  setItem: (key: string, val: string): void => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, val);
        return;
      }
    } catch {}
    memoryStore.set(key, val);
  },
  removeItem: (key: string): void => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
        return;
      }
    } catch {}
    memoryStore.delete(key);
  },
};

export const offlineDb = {
  // Locale
  getLocale(): 'en' | 'hi' | 'mr' {
    const raw = storage.getItem(LOCALE_KEY);
    return raw === 'hi' || raw === 'mr' ? raw : 'en';
  },

  setLocale(locale: 'en' | 'hi' | 'mr'): void {
    storage.setItem(LOCALE_KEY, locale);
  },

  // Simulated Network Toggle (Allows instant offline/online testing)
  isOnline(): boolean {
    const raw = storage.getItem(NETWORK_KEY);
    return raw !== 'false';
  },

  setOnline(online: boolean): void {
    storage.setItem(NETWORK_KEY, String(online));
  },

  // Local Lots
  getLots(): LocalScrapLot[] {
    try {
      const raw = storage.getItem(LOTS_KEY);
      return raw ? (JSON.parse(raw) as LocalScrapLot[]) : [];
    } catch {
      return [];
    }
  },

  saveLot(lot: LocalScrapLot): void {
    const lots = this.getLots();
    const existingIdx = lots.findIndex((l) => l.id === lot.id);
    if (existingIdx >= 0) {
      lots[existingIdx] = lot;
    } else {
      lots.unshift(lot);
    }
    storage.setItem(LOTS_KEY, JSON.stringify(lots));
  },

  getLot(id: string): LocalScrapLot | undefined {
    return this.getLots().find((l) => l.id === id);
  },

  // Outbox Queue
  getOutbox(): QueuedOperation[] {
    try {
      const raw = storage.getItem(OUTBOX_KEY);
      return raw ? (JSON.parse(raw) as QueuedOperation[]) : [];
    } catch {
      return [];
    }
  },

  enqueue(op: Omit<QueuedOperation, 'status' | 'retryCount' | 'createdAt'>): QueuedOperation {
    const queue = this.getOutbox();
    const item: QueuedOperation = {
      ...op,
      status: 'PENDING',
      retryCount: 0,
      createdAt: new Date().toISOString(),
    };
    queue.push(item);
    storage.setItem(OUTBOX_KEY, JSON.stringify(queue));
    return item;
  },

  updateOutboxItem(id: string, updates: Partial<QueuedOperation>): void {
    const queue = this.getOutbox();
    const idx = queue.findIndex((q) => q.id === id);
    if (idx >= 0 && queue[idx]) {
      queue[idx] = { ...queue[idx], ...updates };
      storage.setItem(OUTBOX_KEY, JSON.stringify(queue));
    }
  },

  clearOutbox(): void {
    storage.removeItem(OUTBOX_KEY);
  },
};
