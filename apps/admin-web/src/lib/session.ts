/**
 * Session state.
 *
 * Tokens live in sessionStorage, not localStorage: an operator session should
 * end when the tab closes. The role shown in the UI is the role the server
 * reports, never a value cached locally (rule D-10, SB-2).
 */
import { useSyncExternalStore } from 'react';
import { ApiClient, type MetaResult, type Tokens } from './api';
import type { Role } from '@rescrap/shared';

const STORAGE_KEY = 'rescrap.admin.session';

export interface SessionState {
  phase: 'loading' | 'signed-out' | 'signed-in';
  role?: Role;
  name?: string;
  userId?: string;
  reality?: MetaResult['reality'];
  error?: string;
}

type Listener = () => void;

class SessionStore {
  private state: SessionState = { phase: 'loading' };
  private readonly listeners = new Set<Listener>();
  readonly client: ApiClient;

  constructor() {
    this.client = new ApiClient({
      baseUrl: import.meta.env['VITE_API_BASE_URL'] as string | undefined,
      tokens: this.read(),
      onTokens: (tokens) => this.write(tokens),
    });
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): SessionState => this.state;

  private emit(next: SessionState): void {
    this.state = next;
    for (const listener of this.listeners) {
      listener();
    }
  }

  private read(): Tokens | null {
    try {
      const raw = globalThis.sessionStorage?.getItem(STORAGE_KEY);
      if (!raw) {
        return null;
      }
      const parsed = JSON.parse(raw) as Tokens;
      return typeof parsed.accessToken === 'string' ? parsed : null;
    } catch {
      return null;
    }
  }

  private write(tokens: Tokens | null): void {
    try {
      if (tokens) {
        globalThis.sessionStorage?.setItem(STORAGE_KEY, JSON.stringify(tokens));
      } else {
        globalThis.sessionStorage?.removeItem(STORAGE_KEY);
      }
    } catch {
      // A locked-down browser without storage still works for this tab.
    }
  }

  /** Re-establish the session on a page reload, from the stored token. */
  async restore(): Promise<void> {
    const reality = await this.loadReality();
    if (!this.client.hasSession) {
      this.emit({ phase: 'signed-out', reality });
      return;
    }
    try {
      const me = await this.client.me();
      this.emit({
        phase: 'signed-in',
        role: me.data.role,
        name: me.data.name,
        userId: me.data.id,
        reality,
      });
    } catch {
      this.client.clearSession();
      this.emit({ phase: 'signed-out', reality });
    }
  }

  private async loadReality(): Promise<MetaResult['reality'] | undefined> {
    try {
      const meta = await this.client.meta();
      return meta.data.reality;
    } catch {
      return undefined;
    }
  }

  async signIn(phone: string, code: string): Promise<void> {
    this.emit({ ...this.state, phase: 'loading', error: undefined });
    try {
      const session = await this.client.verifyOtp(phone, 'ADMIN', code);
      this.emit({
        phase: 'signed-in',
        role: session.user.role,
        name: session.user.name,
        userId: session.user.id,
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

export const session = new SessionStore();

export function useSession(): SessionState {
  return useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);
}
