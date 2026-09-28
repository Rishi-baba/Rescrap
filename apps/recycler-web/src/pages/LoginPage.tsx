import React, { useState } from 'react';
import { Button, Input } from '@rescrap/design-system';
import { recyclerSession, useRecyclerSession } from '../lib/session.js';

export const LoginPage: React.FC = () => {
  const session = useRecyclerSession();
  const [phone, setPhone] = useState('+919000000002');
  const [code, setCode] = useState('1234');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [isLoading, setIsLoading] = useState(false);
  const [localError, setLocalError] = useState<string | undefined>(session.error);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    setIsLoading(true);
    setLocalError(undefined);
    try {
      await recyclerSession.client.requestOtp(phone);
      setStep('otp');
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Failed to request OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) return;
    setIsLoading(true);
    setLocalError(undefined);
    try {
      await recyclerSession.signIn(phone, code);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Invalid OTP code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (demoPhone: string) => {
    setPhone(demoPhone);
    setCode('1234');
    setStep('otp');
  };

  return (
    <div className="min-h-screen bg-[#08130E] text-[#F5EFE6] flex flex-col items-center justify-center p-4 selection:bg-[#2FBF71] selection:text-[#08130E]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#1E8E53] to-[#2FBF71] flex items-center justify-center shadow-lg shadow-emerald-950/60">
              <svg className="w-7 h-7 text-[#07130D]" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z" />
              </svg>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-white">ReScrap</h1>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#4FD68C] bg-[#163324] px-2.5 py-0.5 rounded-full border border-[#2FBF71]/30">
              Recycler Portal
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-2">
            Authorized recycling facility access for bidding, logistics and verified handovers
          </p>
        </div>

        <div className="p-6 rounded-3xl bg-[#12231B] border border-[#1E3A2B] shadow-2xl">
          <h2 className="text-base font-bold text-white mb-1">
            {step === 'phone' ? 'Sign in with Mobile' : 'Verify Mobile OTP'}
          </h2>
          <p className="text-xs text-stone-400 mb-5">
            {step === 'phone'
              ? 'Enter your registered facility phone number.'
              : `Enter the 4-digit code sent to ${phone}.`}
          </p>

          {localError ? (
            <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/40 text-xs text-rose-300">
              {localError}
            </div>
          ) : null}

          {step === 'phone' ? (
            <form onSubmit={handleRequestOtp} className="flex flex-col gap-4">
              <Input
                label="Facility Phone Number"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919000000002"
                required
              />
              <Button type="submit" variant="primary" isLoading={isLoading} className="w-full">
                Request OTP
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="flex flex-col gap-4">
              <Input
                label="One-Time Password"
                type="text"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="1234"
                helperText="Demo environment standard code: 1234"
                required
                autoFocus
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('phone')}
                  className="w-1/3"
                >
                  Back
                </Button>
                <Button type="submit" variant="primary" isLoading={isLoading} className="w-2/3">
                  Verify &amp; Enter
                </Button>
              </div>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-[#1E3A2B]">
            <span className="text-[10px] font-mono uppercase tracking-wider text-[#4FD68C] font-bold block mb-3">
              Quick Demo Facility Profiles
            </span>
            <div className="flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => handleQuickLogin('+919000000002')}
                className="w-full text-left p-3 rounded-xl border border-[#1E3A2B] bg-[#0C1A14] hover:bg-[#163324] hover:border-[#2FBF71]/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    Apex E-Waste Recyclers
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-[#163324] text-[#4FD68C] px-2 py-0.5 rounded border border-[#2FBF71]/40">
                    VERIFIED
                  </span>
                </div>
                <span className="text-[11px] text-stone-400 font-mono mt-0.5 block">+919000000002 &bull; Pune Hub</span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('+919000000003')}
                className="w-full text-left p-3 rounded-xl border border-[#1E3A2B] bg-[#0C1A14] hover:bg-[#163324] hover:border-[#2FBF71]/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white">
                    Maharashtra Scrap Recovery
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-amber-950/40 text-amber-300 px-2 py-0.5 rounded border border-amber-600/40">
                    PENDING REVIEW
                  </span>
                </div>
                <span className="text-[11px] text-stone-400 font-mono mt-0.5 block">+919000000003 &bull; Magarpatta</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
