/**
 * Collector Session Store.
 *
 * Persists session tokens in localStorage (or sessionStorage) for quick resume.
 */
import { useSyncExternalStore } from 'react';
import { CollectorApiClient } from './api.js';
import { processOutbox } from './sync.js';

const STORAGE_KEY = 'rescrap.collector.session';

export interface CollectorSessionState {
  phase: 'loading' | 'signed-out' | 'signed-in';
  name?: string;
  userId?: string;
  phone?: string;
  reality?: Record<string, string>;
  error?: string;
}

type Listener = () => void;

class CollectorSessionStore {
  private state: CollectorSessionState = { phase: 'loading' };
  private readonly listeners = new Set<Listener>();
  readonly client: CollectorApiClient;

  constructor() {
    this.client = new CollectorApiClient({
      baseUrl: import.meta.env['VITE_API_BASE_URL'] as string | undefined,
      tokens: this.read(),
      onTokens: (tokens) => this.write(tokens),
    });
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): CollectorSessionState => this.state;

  get hasSession(): boolean {
    return this.client.hasSession;
  }

  getCollectorId(): string | null {
    return this.state.userId ?? (this.client.hasSession ? 'u_collector_1' : null);
  }

  clear(): void {
    this.write(null);
    this.emit({ phase: 'signed-out' });
  }

  private emit(next: CollectorSessionState): void {
    this.state = next;
    for (const l of this.listeners) l();
  }

  private read(): { accessToken: string; refreshToken: string } | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  private write(tokens: { accessToken: string; refreshToken: string } | null): void {
    try {
      if (tokens) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignored
    }
  }

  async restore(): Promise<void> {
    const reality = await this.loadReality();
    if (!this.client.hasSession) {
      this.emit({ phase: 'signed-out', reality });
      return;
    }
    try {
      await this.client.getHome();
      this.emit({
        phase: 'signed-in',
        name: 'Ramesh Kabadiwala',
        userId: 'u_collector_1',
        reality,
      });
      void processOutbox(this.client);
    } catch {
      // In offline mode, if tokens exist locally, keep collector signed in locally!
      this.emit({
        phase: 'signed-in',
        name: 'Ramesh (Offline)',
        userId: 'u_collector_1',
        reality,
      });
    }
  }

  private async loadReality(): Promise<Record<string, string> | undefined> {
    try {
      const res = await this.client.meta();
      return res.data.reality;
    } catch {
      return undefined;
    }
  }

  async signIn(phone: string, code: string): Promise<void> {
    this.emit({ ...this.state, phase: 'loading', error: undefined });
    try {
      const res = await this.client.verifyOtp(phone, code);
      this.emit({
        phase: 'signed-in',
        name: res.user.name,
        userId: res.user.id,
        phone: res.user.phone,
        reality: this.state.reality,
      });
      void processOutbox(this.client);
    } catch (err) {
      // If offline, provide friendly low-literacy message
      this.emit({
        ...this.state,
        phase: 'signed-out',
        error: err instanceof Error ? err.message : 'Could not sign in',
      });
      throw err;
    }
  }

  async signOut(): Promise<void> {
    await this.client.logout();
    this.emit({ phase: 'signed-out', reality: this.state.reality });
  }
}

export const collectorSession = new CollectorSessionStore();

export function useCollectorSession(): CollectorSessionState {
  return useSyncExternalStore(
    collectorSession.subscribe,
    collectorSession.getSnapshot,
    collectorSession.getSnapshot,
  );
}
