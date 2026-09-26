import React, { useState } from 'react';
import { Button, Input, Card, CardBody, Badge } from '@rescrap/design-system';
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
    <div className="min-h-screen bg-stone-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <span className="text-2xl font-black tracking-tight text-emerald-800">ReScrap</span>
            <Badge tone="info">Recycler Portal</Badge>
          </div>
          <p className="text-xs text-stone-500">
            Authorized recycling facility access for bidding, logistics and verified handovers
          </p>
        </div>

        <Card variant="elevated" className="overflow-visible shadow-lg">
          <CardBody className="p-6">
            <h2 className="text-base font-bold text-stone-900 mb-1">
              {step === 'phone' ? 'Sign in with Mobile' : 'Verify Mobile OTP'}
            </h2>
            <p className="text-xs text-stone-500 mb-5">
              {step === 'phone'
                ? 'Enter your registered facility phone number.'
                : `Enter the 4-digit code sent to ${phone}.`}
            </p>

            {localError ? (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
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
                    Verify & Enter
                  </Button>
                </div>
              </form>
            )}

            <div className="mt-8 pt-6 border-t border-stone-200">
              <span className="text-[11px] uppercase tracking-wider text-stone-400 font-bold block mb-3">
                Quick Demo Profiles
              </span>
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin('+919000000002')}
                  className="w-full text-left p-2.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-800">
                      Apex E-Waste Recyclers
                    </span>
                    <Badge tone="success">VERIFIED</Badge>
                  </div>
                  <span className="text-[11px] text-stone-500 font-mono">+919000000002</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleQuickLogin('+919000000003')}
                  className="w-full text-left p-2.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-amber-50 hover:border-amber-200 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-stone-800">
                      Maharashtra Scrap Recovery
                    </span>
                    <Badge tone="warning">PENDING REVIEW</Badge>
                  </div>
                  <span className="text-[11px] text-stone-500 font-mono">+919000000003</span>
                </button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
};
