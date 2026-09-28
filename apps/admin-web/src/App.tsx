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
import { DemoTag, Loading } from './components/ui';
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
      <div className="min-h-screen bg-[#070F0B] text-[#F5EFE6]">
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
    <div className="min-h-screen bg-[#070F0B] text-[#F5EFE6] flex flex-col selection:bg-[#2FBF71] selection:text-[#070F0B]">
      <DemoBanner reality={state.reality} />

      <header className="border-b border-[#1E3A2B] bg-[#0C1A14]/95 backdrop-blur-md sticky top-0 z-30 shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1E8E53] to-[#2FBF71] flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-[#07130D]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white">ReScrap</h1>
                <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#4FD68C] bg-[#163324] px-2.5 py-0.5 rounded-full border border-[#2FBF71]/30">
                  Admin Console
                </span>
              </div>
              <span className="text-[10px] text-stone-400 font-medium block">अच्छा कबाड़, बेहतर कल</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <DemoTag label="DEMO" />
            {state.role ? (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-[#163324] text-[#4FD68C] border border-[#2FBF71]/30">
                {state.role}
              </span>
            ) : null}
            <span className="text-xs font-semibold text-stone-300 hidden sm:inline">{state.name}</span>
            <button
              type="button"
              onClick={() => void session.signOut()}
              className="rounded-xl border border-[#1E3A2B] bg-[#12231B] px-3 py-1.5 text-xs font-semibold text-stone-300 hover:text-white hover:bg-[#163324] hover:border-[#2FBF71]/40 transition-all shadow-sm"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 lg:flex-row">
        <nav className="lg:w-64 lg:shrink-0" aria-label="Console sections">
          <ul className="flex flex-col gap-1.5">
            {SCREENS.map((item) => {
              const current = item.id === screen;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => go(item.id)}
                    aria-current={current ? 'page' : undefined}
                    className={`w-full rounded-2xl p-3 text-left transition-all border ${
                      current
                        ? 'bg-[#163324] border-[#2FBF71]/50 text-white shadow-lg shadow-emerald-950/40'
                        : 'border-transparent text-stone-300 hover:bg-[#12231B] hover:border-[#1E3A2B]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-sm font-bold ${current ? 'text-[#4FD68C]' : 'text-white'}`}>
                        {item.label}
                      </span>
                      {current && <span className="w-1.5 h-1.5 rounded-full bg-[#4FD68C]" />}
                    </div>
                    <span
                      className={`block text-[11px] mt-0.5 ${
                        current ? 'text-stone-300' : 'text-stone-400'
                      }`}
                    >
                      {item.blurb}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <div className="mt-8 p-3.5 rounded-2xl bg-[#0C1A14] border border-[#1E3A2B] text-[11px] text-stone-400">
            <span className="font-mono text-[9px] uppercase tracking-wider text-[#4FD68C] block mb-1">
              Supervisory Authority
            </span>
            Decisions recorded here commit immutable audit trails under CPCB regulatory oversight.
          </div>
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

      <footer className="mx-auto w-full max-w-7xl px-4 py-6 text-xs text-stone-500 border-t border-[#1E3A2B] mt-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-stone-400">{active.label}</span> &middot; ReScrap Admin Console &middot; Certified Supervisory Oversight
        </div>
        <div className="text-[11px] font-mono text-stone-500">
          Demonstration build. No real pollution control certification or commercial payout is represented.
        </div>
      </footer>
    </div>
  );
}
