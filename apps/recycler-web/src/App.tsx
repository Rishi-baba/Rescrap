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
      <div className="min-h-screen bg-[#08130E] text-[#F5EFE6]">
        <DemoBanner reality={session.reality} />
        <LoadingState label="Starting ReScrap Recycler Portal..." className="py-24 text-stone-300" />
      </div>
    );
  }

  if (session.phase === 'signed-out') {
    return <LoginPage />;
  }

  const activeScreen = SCREENS.find((s) => s.id === screen) ?? SCREENS[0]!;

  return (
    <div className="min-h-screen bg-[#08130E] text-[#F5EFE6] flex flex-col selection:bg-[#2FBF71] selection:text-[#08130E]">
      <DemoBanner reality={session.reality} />

      {/* Header */}
      <header className="border-b border-[#1E3A2B] bg-[#0C1A14]/95 backdrop-blur-md sticky top-0 z-30 shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            {/* Logo Emblem */}
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1E8E53] to-[#2FBF71] flex items-center justify-center shadow-md">
              <svg className="w-5 h-5 text-[#07130D]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black tracking-tight text-white">ReScrap</span>
                <span className="text-xs font-semibold text-[#4FD68C] tracking-wide uppercase px-2 py-0.5 rounded bg-[#163324] border border-[#2FBF71]/30">
                  Recycler Portal
                </span>
              </div>
              <span className="text-[10px] text-stone-400 font-medium block">अच्छा कबाड़, बेहतर कल</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-white block">{session.name ?? 'Apex E-Waste Recyclers'}</span>
              <span className="text-[10px] font-mono text-stone-400">CPCB Registered Tier-1</span>
            </div>
            <button
              type="button"
              onClick={() => void recyclerSession.signOut()}
              className="rounded-xl border border-[#1E3A2B] bg-[#12231B] px-3 py-1.5 text-xs font-semibold text-stone-300 hover:text-white hover:bg-[#163324] hover:border-[#2FBF71]/40 transition-all shadow-sm"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Body: Sidebar + Main Workspace */}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 px-4 py-6 lg:flex-row">
        {/* Sidebar Nav */}
        <aside className="lg:w-64 lg:shrink-0" aria-label="Portal Navigation">
          <nav className="sticky top-24">
            <ul className="flex flex-col gap-1.5">
              {SCREENS.map((item) => {
                const isCurrent = item.id === screen;
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => go(item.id)}
                      aria-current={isCurrent ? 'page' : undefined}
                      className={`w-full rounded-2xl p-3 text-left transition-all border ${
                        isCurrent
                          ? 'bg-[#163324] border-[#2FBF71]/50 text-white shadow-lg shadow-emerald-950/40'
                          : 'border-transparent text-stone-300 hover:bg-[#12231B] hover:border-[#1E3A2B]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-sm font-bold ${isCurrent ? 'text-[#4FD68C]' : 'text-white'}`}>
                          {item.label}
                        </span>
                        {isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-[#4FD68C]" />}
                      </div>
                      <span
                        className={`block text-[11px] mt-0.5 ${
                          isCurrent ? 'text-stone-300' : 'text-stone-400'
                        }`}
                      >
                        {item.blurb}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Regulatory note in sidebar */}
            <div className="mt-8 p-3.5 rounded-2xl bg-[#0C1A14] border border-[#1E3A2B] text-[11px] text-stone-400">
              <span className="font-mono text-[9px] uppercase tracking-wider text-[#4FD68C] block mb-1">
                Formal Recovery
              </span>
              All bids are legally binding purchase orders under CPCB E-Waste Rules 2022.
            </div>
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
      <footer className="mx-auto w-full max-w-7xl px-4 py-6 text-xs text-stone-500 border-t border-[#1E3A2B] mt-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          <span className="font-semibold text-stone-400">{activeScreen.label}</span> &bull; ReScrap Recycler Portal &bull; Certified E-Waste Management
        </div>
        <div className="text-[11px] font-mono text-stone-500">
          Simulating verified transactions connecting informal collectors with formal recovery streams.
        </div>
      </footer>
    </div>
  );
}
