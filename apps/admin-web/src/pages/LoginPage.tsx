/**
 * Admin sign-in: phone -> OTP -> session.
 *
 * The OTP is displayed on screen when the server says delivery was `console`.
 * In a real deployment that block simply never appears, because the server
 * sends no `devCode` outside a non-production environment.
 */
import { useState, type FormEvent } from 'react';
import { session, useSession } from '../lib/session';
import { DemoBanner } from '../components/DemoBanner';
import { DemoTag, ErrorNotice, Loading } from '../components/ui';

export function LoginPage() {
  const state = useSession();
  const [phone, setPhone] = useState('+919000000004');
  const [code, setCode] = useState('');
  const [stage, setStage] = useState<'phone' | 'code'>('phone');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await session.client.requestOtp(phone.trim(), 'ADMIN');
      setDevCode(result.data.devCode ?? null);
      setStage('code');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  async function confirm(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await session.signIn(phone.trim(), code.trim());
    } catch {
      // The message is rendered from `state.error`; nothing to add here.
    } finally {
      setBusy(false);
    }
  }

  if (state.phase === 'loading') {
    return (
      <div className="mx-auto max-w-md p-8 text-stone-300">
        <Loading label="Checking admin session..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070F0B] text-[#F5EFE6] flex flex-col selection:bg-[#2FBF71] selection:text-[#070F0B]">
      <DemoBanner reality={state.reality} />
      <main className="mx-auto flex max-w-md w-full flex-col gap-4 px-4 py-12">
        <div className="text-center mb-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1E8E53] to-[#2FBF71] mb-3 shadow-lg shadow-emerald-950/60">
            <svg className="w-7 h-7 text-[#07130D]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
            </svg>
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-xl font-black text-white">ReScrap</h1>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#4FD68C] bg-[#163324] px-2.5 py-0.5 rounded-full border border-[#2FBF71]/30">
              Admin Console
            </span>
          </div>
          <p className="mt-1 text-xs text-stone-400">
            Operations oversight, recycler verification, immutable audit trail &amp; price governance.
          </p>
          <div className="mt-2.5">
            <DemoTag label="DEMO ACCESS" />
          </div>
        </div>

        {error ? <ErrorNotice error={error} /> : null}
        {state.error && !error ? <ErrorNotice error={new Error(state.error)} /> : null}

        {stage === 'phone' ? (
          <form onSubmit={sendCode} className="rounded-3xl border border-[#1E3A2B] bg-[#12231B] p-6 shadow-2xl">
            <label className="block text-xs font-mono uppercase tracking-wider text-stone-300 font-semibold mb-1" htmlFor="phone">
              Admin Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
              required
              className="w-full rounded-xl border border-[#1E3A2B] bg-[#0C1A14] px-3.5 py-2.5 text-sm text-white placeholder-stone-500 focus:border-[#2FBF71] focus:ring-1 focus:ring-[#2FBF71] focus:outline-none font-mono"
            />
            <button
              type="submit"
              disabled={busy}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#1E8E53] to-[#2FBF71] px-4 py-2.5 text-sm font-extrabold text-[#07130D] hover:brightness-110 active:brightness-95 disabled:opacity-50 transition-all shadow-md"
            >
              {busy ? 'Sending...' : 'Send One-Time Code'}
            </button>
            <p className="mt-3 text-center text-xs text-stone-400 font-mono">
              Seeded admin account: <span className="text-[#4FD68C] font-bold">+919000000004</span>
            </p>
          </form>
        ) : (
          <form onSubmit={confirm} className="rounded-3xl border border-[#1E3A2B] bg-[#12231B] p-6 shadow-2xl">
            <label className="block text-xs font-mono uppercase tracking-wider text-stone-300 font-semibold mb-1" htmlFor="code">
              One-Time Code
            </label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="one-time-code"
              required
              autoFocus
              className="w-full rounded-xl border border-[#1E3A2B] bg-[#0C1A14] px-3.5 py-2.5 text-sm text-white placeholder-stone-500 focus:border-[#2FBF71] focus:ring-1 focus:ring-[#2FBF71] focus:outline-none font-mono"
            />
            {devCode ? (
              <p className="mt-3 rounded-xl border border-amber-600/40 bg-amber-950/40 px-3.5 py-2 text-xs text-amber-300">
                <strong>Demo Only:</strong> The server delivered code to console:{' '}
                <span className="font-mono font-bold text-amber-200">{devCode}</span>
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="mt-4 w-full rounded-xl bg-gradient-to-r from-[#1E8E53] to-[#2FBF71] px-4 py-2.5 text-sm font-extrabold text-[#07130D] hover:brightness-110 active:brightness-95 disabled:opacity-50 transition-all shadow-md"
            >
              {busy ? 'Verifying...' : 'Sign in & Enter Console'}
            </button>
            <button
              type="button"
              onClick={() => setStage('phone')}
              className="mt-3 w-full text-center text-xs text-stone-400 hover:text-white transition-colors"
            >
              Use a different number
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
