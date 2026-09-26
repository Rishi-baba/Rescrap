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
      <div className="mx-auto max-w-md p-8">
        <Loading label="Checking session..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-100">
      <DemoBanner reality={state.reality} />
      <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-10">
        <header className="rounded-lg border border-stone-200 bg-white px-5 py-4 shadow-sm">
          <h1 className="text-lg font-semibold text-stone-900">ReScrap Admin Console</h1>
          <p className="mt-1 text-sm text-stone-600">
            Operations, recycler verification, audit trail and price governance.
          </p>
          <div className="mt-2">
            <DemoTag label="DEMO ACCESS" />
          </div>
        </header>

        {error ? <ErrorNotice error={error} /> : null}
        {state.error && !error ? <ErrorNotice error={new Error(state.error)} /> : null}

        {stage === 'phone' ? (
          <form onSubmit={sendCode} className="rounded-lg border border-stone-200 bg-white px-5 py-4 shadow-sm">
            <label className="block text-sm font-medium text-stone-700" htmlFor="phone">
              Admin phone number
            </label>
            <input
              id="phone"
              name="phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              autoComplete="tel"
              required
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="mt-3 w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {busy ? 'Sending...' : 'Send one-time code'}
            </button>
            <p className="mt-2 text-xs text-stone-500">
              Seeded admin account: <span className="font-mono">+919000000004</span>
            </p>
          </form>
        ) : (
          <form onSubmit={confirm} className="rounded-lg border border-stone-200 bg-white px-5 py-4 shadow-sm">
            <label className="block text-sm font-medium text-stone-700" htmlFor="code">
              One-time code
            </label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="one-time-code"
              required
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2 text-sm focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 focus:outline-none"
            />
            {devCode ? (
              <p className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-950">
                <strong>Demo only.</strong> The server delivered this code to the console instead of by
                SMS: <span className="font-mono font-bold">{devCode}</span>
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="mt-3 w-full rounded-md bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {busy ? 'Verifying...' : 'Sign in'}
            </button>
            <button
              type="button"
              onClick={() => setStage('phone')}
              className="mt-2 w-full text-xs text-stone-500 underline"
            >
              Use a different number
            </button>
          </form>
        )}
      </main>
    </div>
  );
}
