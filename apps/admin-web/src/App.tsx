/**
 * App shell and navigation.
 *
 * Hash-based routing on purpose: this is a static build with no server, so
 * there is no rewrite rule to depend on, and a refresh on any screen must
 * work from a plain file server.
 */
import { useCallback, useEffect, useState } from 'react';
import { session, useSession } from './lib/session';
import { DemoBanner } from './components/DemoBanner';
import { Badge, DemoTag, Loading } from './components/ui';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { VerificationPage } from './pages/VerificationPage';
import { LotsPage } from './pages/LotsPage';
import { AuditPage } from './pages/AuditPage';
import { PricesPage } from './pages/PricesPage';
import { ExceptionsPage } from './pages/ExceptionsPage';

type Screen = 'dashboard' | 'verification' | 'lots' | 'audit' | 'prices' | 'exceptions';

const SCREENS: ReadonlyArray<{ id: Screen; label: string; blurb: string }> = [
  { id: 'dashboard', label: 'Overview', blurb: 'Aggregated operational counts' },
  { id: 'verification', label: 'Verification queue', blurb: 'Recycler review decisions' },
  { id: 'lots', label: 'Transaction monitoring', blurb: 'One row per Lot, all roles' },
  { id: 'audit', label: 'Audit trail', blurb: 'Append-only record of decisions' },
  { id: 'prices', label: 'Price management', blurb: 'Buying prices and their sources' },
  { id: 'exceptions', label: 'Exceptions', blurb: 'Anomaly flags and AI output log' },
];

function screenFromHash(): Screen {
  const raw = globalThis.location?.hash.replace(/^#\/?/, '') ?? '';
  return SCREENS.some((screen) => screen.id === raw) ? (raw as Screen) : 'dashboard';
}

export function App() {
  const state = useSession();
  const [screen, setScreen] = useState<Screen>(screenFromHash);

  useEffect(() => {
    void session.restore();
  }, []);

  useEffect(() => {
    const onHashChange = () => setScreen(screenFromHash());
    globalThis.addEventListener('hashchange', onHashChange);
    return () => globalThis.removeEventListener('hashchange', onHashChange);
  }, []);

  const go = useCallback((next: Screen) => {
    globalThis.location.hash = `#/${next}`;
    setScreen(next);
  }, []);

  if (state.phase === 'loading') {
    return (
      <div className="min-h-screen bg-stone-100">
        <DemoBanner reality={state.reality} />
        <Loading label="Starting ReScrap Admin Console..." />
      </div>
    );
  }

  if (state.phase === 'signed-out') {
    return <LoginPage />;
  }

  const active = SCREENS.find((item) => item.id === screen) ?? SCREENS[0]!;

  return (
    <div className="min-h-screen bg-stone-100">
      <DemoBanner reality={state.reality} />

      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg font-semibold text-stone-900">ReScrap</h1>
            <span className="text-sm text-stone-500">Admin Console</span>
          </div>
          <div className="flex items-center gap-3">
            <DemoTag label="DEMO" />
            {state.role ? <Badge tone="bg-violet-100 text-violet-900">{state.role}</Badge> : null}
            <span className="text-sm text-stone-600">{state.name}</span>
            <button
              type="button"
              onClick={() => void session.signOut()}
              className="rounded-md border border-stone-300 px-2.5 py-1 text-xs font-medium text-stone-700 hover:bg-stone-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 lg:flex-row">
        <nav className="lg:w-56 lg:shrink-0" aria-label="Console sections">
          <ul className="flex flex-col gap-1">
            {SCREENS.map((item) => {
              const current = item.id === screen;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => go(item.id)}
                    aria-current={current ? 'page' : undefined}
                    className={`w-full rounded-md px-3 py-2 text-left ${
                      current ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'
                    }`}
                  >
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span
                      className={`block text-xs ${current ? 'text-stone-300' : 'text-stone-500'}`}
                    >
                      {item.blurb}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="min-w-0 flex-1">
          {screen === 'dashboard' ? <DashboardPage /> : null}
          {screen === 'verification' ? <VerificationPage /> : null}
          {screen === 'lots' ? <LotsPage /> : null}
          {screen === 'audit' ? <AuditPage /> : null}
          {screen === 'prices' ? <PricesPage /> : null}
          {screen === 'exceptions' ? <ExceptionsPage /> : null}
        </main>
      </div>

      <footer className="mx-auto max-w-7xl px-4 pb-6 text-xs text-stone-500">
        {active.label} &middot; ReScrap Admin Console &middot; demonstration build. No real recycler
        authorization, price, payment or model inference is represented here.
      </footer>
    </div>
  );
}
