import React, { useState } from 'react';
import { collectorSession } from '../lib/session.js';
import { offlineDb } from '../lib/offline-db.js';

interface LoginViewProps {
  onSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const [phone, setPhone] = useState('+919000000001');
  const [code, setCode] = useState('1234');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setIsLoading(true);
    setError(null);
    try {
      if (offlineDb.isOnline()) {
        await collectorSession.client.requestOtp(phone);
      }
      setStep('otp');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not request OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setIsLoading(true);
    setError(null);
    try {
      await collectorSession.signIn(phone, code);
      onSuccess();
    } catch {
      // If offline, still allow collector into the offline application!
      if (!offlineDb.isOnline()) {
        onSuccess();
      } else {
        setError('Incorrect OTP code. Try 1234.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col justify-between p-5 max-w-md mx-auto">
      <div>
        <div className="pt-8 pb-6">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
            ReScrap &bull; Collector
          </span>
          <h1 className="text-2xl font-black text-stone-900 mt-2">
            {step === 'phone' ? 'Enter Mobile Number' : 'Enter OTP Code'}
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            {step === 'phone'
              ? 'No password needed. We will send an SMS verification code.'
              : `Code sent to ${phone}. (Demo code: 1234)`}
          </p>
        </div>

        {error ? (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        ) : null}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                Your Mobile Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919000000001"
                className="w-full min-h-[56px] text-lg font-mono px-4 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                required
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                Demo Account: +919000000001 (Ramesh Kabadiwala)
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[56px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-base shadow-sm mt-4 flex items-center justify-center transition-colors"
            >
              {isLoading ? 'Sending SMS…' : 'Continue / आगे बढ़ें →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div>
              <label className="text-xs font-semibold text-stone-700 block mb-1">
                4-Digit OTP Code
              </label>
              <input
                type="text"
                maxLength={4}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full min-h-[56px] text-center text-3xl font-mono tracking-widest px-4 rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                autoFocus
                required
              />
              <span className="text-[11px] text-stone-400 mt-1 block text-center">
                Demo default OTP: <strong className="text-stone-700">1234</strong>
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[56px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-base shadow-sm mt-4 flex items-center justify-center transition-colors"
            >
              {isLoading ? 'Verifying…' : 'Verify & Enter / प्रवेश करें'}
            </button>

            <button
              type="button"
              onClick={() => setStep('phone')}
              className="w-full min-h-[48px] text-xs text-stone-500 font-semibold text-center"
            >
              Change Phone Number
            </button>
          </form>
        )}
      </div>

      <div className="py-4 text-center text-xs text-stone-400 border-t border-stone-200">
        ReScrap respects collector safety. No Aadhaar or personal documents required (PRIV-03).
      </div>
    </div>
  );
};
