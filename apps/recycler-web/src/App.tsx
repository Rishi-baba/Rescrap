/**
 * Recycler Portal App Shell.
 *
 * Hash-based routing matching the admin console for simple static serving.
 * Source of truth: frontend-requirements.md PART B
 */
import { useCallback, useEffect, useState } from 'react';
import { DemoBanner, LoadingState } from '@rescrap/design-system';
import { recyclerSession, useRecyclerSession } from './lib/session.js';
import { LoginPage } from './pages/LoginPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { AvailableLotsPage } from './pages/AvailableLotsPage.js';
import { OffersPage } from './pages/OffersPage.js';
import { DealsPage } from './pages/DealsPage.js';
import { TransactionsPage } from './pages/TransactionsPage.js';
import { ProfilePage } from './pages/ProfilePage.js';

export type RecyclerScreen =
  | 'dashboard'
  | 'available-lots'
  | 'offers'
  | 'deals'
  | 'transactions'
  | 'profile';

const SCREENS: ReadonlyArray<{ id: RecyclerScreen; label: string; blurb: string }> = [
  { id: 'dashboard', label: 'Dashboard', blurb: 'Operational metrics & actions' },
  { id: 'available-lots', label: 'Available Lots', blurb: 'Open supply matching' },
  { id: 'offers', label: 'My Offers', blurb: 'Bids & negotiation status' },
  { id: 'deals', label: 'Active Deals', blurb: 'Pickup & custody transfer' },
  { id: 'transactions', label: 'Transactions', blurb: 'Immutable settlement ledger' },
  { id: 'profile', label: 'Facility Profile', blurb: 'Permits & authorization' },
];

function screenFromHash(): RecyclerScreen {
  const raw = globalThis.location?.hash.replace(/^#\/?/, '') ?? '';
  return SCREENS.some((screen) => screen.id === raw) ? (raw as RecyclerScreen) : 'dashboard';
}

export function App() {
  const session = useRecyclerSession();
  const [screen, setScreen] = useState<RecyclerScreen>(screenFromHash);

  useEffect(() => {
    void recyclerSession.restore();
  }, []);

  useEffect(() => {
    const onHashChange = () => setScreen(screenFromHash());
    globalThis.addEventListener('hashchange', onHashChange);
    return () => globalThis.removeEventListener('hashchange', onHashChange);
  }, []);

  const go = useCallback((next: RecyclerScreen) => {
    globalThis.location.hash = `#/${next}`;
    setScreen(next);
  }, []);

  if (session.phase === 'loading') {
    return (
      <div className="min-h-screen bg-stone-100">
        <DemoBanner reality={session.reality} />
        <LoadingState label="Starting ReScrap Recycler Portal..." className="py-24" />
      </div>
    );
  }

  if (session.phase === 'signed-out') {
    return <LoginPage />;
  }

  const activeScreen = SCREENS.find((s) => s.id === screen) ?? SCREENS[0]!;

  return (
    <div className="min-h-screen bg-stone-100 flex flex-col">
      <DemoBanner reality={session.reality} />

      {/* Header */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-30 shadow-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-black tracking-tight text-emerald-800">ReScrap</h1>
            <span className="text-sm font-semibold text-stone-600">Recycler Portal</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
              RECYCLER
            </span>
            <span className="text-xs font-medium text-stone-700">{session.name ?? 'Demo Recycler'}</span>
            <button
              type="button"
              onClick={() => void recyclerSession.signOut()}
              className="rounded-md border border-stone-300 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Body: Sidebar + Main Workspace */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 px-4 py-5 lg:flex-row">
        {/* Sidebar Nav */}
        <aside className="lg:w-60 lg:shrink-0" aria-label="Portal Navigation">
          <nav className="sticky top-20">
            <ul className="flex flex-col gap-1.5">
              {SCREENS.map((item) => {
                const isCurrent = item.id === screen;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => go(item.id)}
                      aria-current={isCurrent ? 'page' : undefined}
                      className={`w-full rounded-xl px-3.5 py-2.5 text-left transition-all ${
                        isCurrent
                          ? 'bg-emerald-800 text-white shadow-sm'
                          : 'text-stone-700 hover:bg-stone-200/70'
                      }`}
                    >
                      <span className="block text-sm font-semibold">{item.label}</span>
                      <span
                        className={`block text-[11px] ${
                          isCurrent ? 'text-emerald-200' : 'text-stone-500'
                        }`}
                      >
                        {item.blurb}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </aside>

        {/* Content Pane */}
        <main className="min-w-0 flex-1">
          {screen === 'dashboard' ? <DashboardPage onNavigate={go} /> : null}
          {screen === 'available-lots' ? <AvailableLotsPage /> : null}
          {screen === 'offers' ? <OffersPage /> : null}
          {screen === 'deals' ? <DealsPage /> : null}
          {screen === 'transactions' ? <TransactionsPage /> : null}
          {screen === 'profile' ? <ProfilePage /> : null}
        </main>
      </div>

      {/* Footer */}
      <footer className="mx-auto w-full max-w-7xl px-4 py-6 text-xs text-stone-400 border-t border-stone-200 mt-auto">
        {activeScreen.label} &bull; ReScrap Recycler Portal &bull; Demonstration build. Simulating
        verified transactions connecting informal collectors with formal recovery streams.
      </footer>
    </div>
  );
}
