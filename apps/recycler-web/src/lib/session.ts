/**
 * Recycler session store.
 *
 * Persists session tokens in sessionStorage and provides reactive state via
 * useSyncExternalStore.
 */
import { useSyncExternalStore } from 'react';
import { RecyclerApiClient, type AuthTokens } from './api.js';

const STORAGE_KEY = 'rescrap.recycler.session';

export interface RecyclerSessionState {
  phase: 'loading' | 'signed-out' | 'signed-in';
  name?: string;
  userId?: string;
  phone?: string;
  reality?: Record<string, string>;
  error?: string;
}

type Listener = () => void;

class RecyclerSessionStore {
  private state: RecyclerSessionState = { phase: 'loading' };
  private readonly listeners = new Set<Listener>();
  readonly client: RecyclerApiClient;

  constructor() {
    this.client = new RecyclerApiClient({
      baseUrl: import.meta.env['VITE_API_BASE_URL'] as string | undefined,
      tokens: this.read(),
      onTokens: (tokens) => this.write(tokens),
    });
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): RecyclerSessionState => this.state;

  private emit(next: RecyclerSessionState): void {
    this.state = next;
    for (const listener of this.listeners) {
      listener();
    }
  }

  private read(): AuthTokens | null {
    try {
      const raw = globalThis.sessionStorage?.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as AuthTokens;
      return typeof parsed.accessToken === 'string' ? parsed : null;
    } catch {
      return null;
    }
  }

  private write(tokens: AuthTokens | null): void {
    try {
      if (tokens) {
        globalThis.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(tokens));
      } else {
        globalThis.sessionStorage?.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignored for restricted environments
    }
  }

  async restore(): Promise<void> {
    const reality = await this.loadReality();
    if (!this.client.hasSession) {
      this.emit({ phase: 'signed-out', reality });
      return;
    }
    try {
      const profile = await this.client.getProfile();
      this.emit({
        phase: 'signed-in',
        name: profile.data.businessName,
        userId: profile.data.id,
        reality,
      });
    } catch {
      this.client.setTokens(null);
      this.emit({ phase: 'signed-out', reality });
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
    } catch (err) {
      this.emit({
        ...this.state,
        phase: 'signed-out',
        error: err instanceof Error ? err.message : 'Sign-in failed. Please try again.',
      });
      throw err;
    }
  }

  async signOut(): Promise<void> {
    await this.client.logout();
    this.emit({ phase: 'signed-out', reality: this.state.reality });
  }
}

export const recyclerSession = new RecyclerSessionStore();

export function useRecyclerSession(): RecyclerSessionState {
  return useSyncExternalStore(
    recyclerSession.subscribe,
    recyclerSession.getSnapshot,
    recyclerSession.getSnapshot,
  );
}
