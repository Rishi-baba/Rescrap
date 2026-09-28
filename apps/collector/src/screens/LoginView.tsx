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
    <div className="min-h-screen bg-[#0C1A14] text-stone-100 flex flex-col justify-between p-5 max-w-md mx-auto">
      <div>
        <div className="pt-8 pb-6 flex flex-col gap-2">
          {/* Brand Mark */}
          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#1E8E53] via-[#2FBF71] to-[#4FD68C] flex items-center justify-center p-0.5">
              <svg className="w-full h-full text-[#0C1A14]" viewBox="0 0 32 32" fill="none">
                <path d="M16 4C9.37 4 4 9.37 4 16C4 19.38 5.4 22.44 7.67 24.62L10.5 21.8C9 20.3 8 18.26 8 16C8 11.58 11.58 8 16 8C19.31 8 22.18 10.02 23.4 12.92L20 15H28V7L25.35 9.65C23.23 6.2 19.37 4 16 4Z" fill="currentColor" />
                <path d="M16 28C22.63 28 28 22.63 28 16C28 12.62 26.6 9.56 24.33 7.38L21.5 10.2C23 11.7 24 13.74 24 16C24 20.42 20.42 24 16 24C12.69 24 9.82 21.98 8.6 19.08L12 17H4V25L6.65 22.35C8.77 25.8 12.63 28 16 28Z" fill="currentColor" />
              </svg>
            </div>
            <span className="text-xl font-black text-white">ReScrap</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#4FD68C] bg-[#183B29] px-2 py-0.5 rounded-full border border-[#2B5E43] ml-auto">
              Collector PWA
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white mt-1">
            {step === 'phone' ? 'Enter Mobile Number' : 'Enter OTP Code'}
          </h1>
          <p className="text-xs text-stone-400 font-medium">
            {step === 'phone'
              ? 'No password needed. We will send an SMS verification code.'
              : `Code sent to ${phone}. (Demo code: 1234)`}
          </p>
        </div>

        {error ? (
          <div className="mb-4 p-3.5 rounded-2xl bg-red-950/60 border border-red-800 text-xs text-red-200">
            {error}
          </div>
        ) : null}

        {step === 'phone' ? (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-[#12231B] border border-[#1E3A2B]">
              <label className="text-xs font-semibold text-stone-300 block mb-1.5">
                Your Mobile Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919000000001"
                className="w-full min-h-[56px] text-lg font-mono px-4 rounded-xl border border-[#234533] bg-[#0C1A14] text-white focus:outline-none focus:ring-2 focus:ring-[#2FBF71]"
                required
              />
              <span className="text-[11px] text-[#4FD68C] mt-2 block font-medium">
                Demo Account: +919000000001 (Sunita Devi)
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[56px] bg-gradient-to-r from-[#1E8E53] to-[#2FBF71] hover:from-[#249E5D] hover:to-[#35CD7C] text-white font-extrabold rounded-2xl text-base shadow-lg shadow-emerald-950/50 mt-2 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              {isLoading ? 'Sending SMS…' : 'Continue / आगे बढ़ें →'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
            <div className="p-4 rounded-2xl bg-[#12231B] border border-[#1E3A2B]">
              <label className="text-xs font-semibold text-stone-300 block mb-1.5 text-center">
                4-Digit OTP Code
              </label>
              <input
                type="text"
                maxLength={4}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full min-h-[56px] text-center text-3xl font-mono tracking-widest px-4 rounded-xl border border-[#234533] bg-[#0C1A14] text-white focus:outline-none focus:ring-2 focus:ring-[#2FBF71]"
                autoFocus
                required
              />
              <span className="text-[11px] text-stone-400 mt-2 block text-center">
                Demo default OTP: <strong className="text-emerald-400 font-mono">1234</strong>
              </span>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[56px] bg-gradient-to-r from-[#1E8E53] to-[#2FBF71] hover:from-[#249E5D] hover:to-[#35CD7C] text-white font-extrabold rounded-2xl text-base shadow-lg shadow-emerald-950/50 mt-2 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
            >
              {isLoading ? 'Verifying…' : 'Verify & Enter / प्रवेश करें'}
            </button>

            <button
              type="button"
              onClick={() => setStep('phone')}
              className="w-full min-h-[48px] text-xs text-stone-400 hover:text-stone-200 font-semibold text-center"
            >
              Change Phone Number
            </button>
          </form>
        )}
      </div>

      <div className="py-4 text-center text-xs text-stone-400 border-t border-[#1C3326] flex items-center justify-center gap-2">
        <svg className="w-4 h-4 text-[#2FBF71] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
        <span>No Aadhaar or personal documents required (PRIV-03)</span>
      </div>
    </div>
  );
};
