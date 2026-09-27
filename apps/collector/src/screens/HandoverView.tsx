import React, { useState } from 'react';
import { offlineDb } from '../lib/offline-db.js';
import { collectorSession } from '../lib/session.js';
import { PriceDisplay } from '@rescrap/design-system';

interface HandoverViewProps {
  lotId: string;
  onBack: () => void;
  onDone: () => void;
}

export const HandoverView: React.FC<HandoverViewProps> = ({ lotId, onBack, onDone }) => {
  const lot = offlineDb.getLot(lotId);
  const [step, setStep] = useState<'tracking' | 'verify' | 'payment' | 'passport'>('tracking');
  const [discrepancyAcknowledged, setDiscrepancyAcknowledged] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Recycler measured weight & final payout (demo handover data)
  const declaredWeight = lot?.declaredWeightKg ?? 12;
  const measuredWeight = 12.5; // Slight calibration difference
  const finalAmountPaise = Math.round((lot?.estimatedValuePaise ?? 140000) * 1.04);
  const traceabilityHash = `0x9c64d608...${lotId}`;

  const handleConfirmVerification = async () => {
    setIsVerifying(true);
    const key = `verify_${lotId}_${Date.now()}`;
    try {
      if (offlineDb.isOnline()) {
        await collectorSession.client.verifyHandover(
          `handover_${lotId}`,
          discrepancyAcknowledged,
          key,
        );
      }
      if (lot) {
        lot.lifecycleState = 'COMPLETED';
        offlineDb.saveLot(lot);
      }
      setStep('payment');
    } catch {
      if (lot) {
        lot.lifecycleState = 'COMPLETED';
        offlineDb.saveLot(lot);
      }
      setStep('payment');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 max-w-md mx-auto p-4 pb-20">
      <div className="flex items-center justify-between border-b border-stone-200 pb-3">
        <button type="button" onClick={onBack} className="text-stone-500 font-semibold text-xs">
          &larr; Back
        </button>
        <span className="text-xs font-bold uppercase text-emerald-800 tracking-wider">
          Handover &amp; Custody
        </span>
      </div>

      {/* Screen A-14: Handover Tracking Timeline */}
      {step === 'tracking' ? (
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <h2 className="text-lg font-bold text-stone-900">Pickup in Progress</h2>
            <p className="text-xs text-stone-500">Recycler team is on the way to Hadapsar</p>
          </div>

          <div className="p-4 rounded-xl bg-white border border-stone-200 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                ✓
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-stone-900">Offer Accepted</span>
                <span className="text-[10px] text-stone-400">Collector signed off</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                ✓
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-stone-900">Pickup Scheduled</span>
                <span className="text-[10px] text-stone-400">Team dispatched with scale</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs animate-pulse">
                &bull;
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-blue-900">On-Site Weighing</span>
                <span className="text-[10px] text-blue-600">Arrived at your collection spot</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep('verify')}
            className="w-full min-h-[52px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 mt-2"
          >
            <span>Proceed to Weight Verification</span>
            <span>&rarr;</span>
          </button>
        </div>
      ) : null}

      {/* Screen A-15: Verify Handover (HAND-04) */}
      {step === 'verify' ? (
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <h2 className="text-lg font-bold text-stone-900">Verify Final Weight</h2>
            <p className="text-xs text-stone-500">Check recycler&apos;s digital scale reading</p>
          </div>

          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-white border border-stone-200">
            <div className="text-center p-3 rounded-lg bg-stone-50">
              <span className="text-[11px] text-stone-400 uppercase font-bold block mb-1">
                Your Declared
              </span>
              <span className="text-2xl font-black text-stone-800 font-mono">
                {declaredWeight} kg
              </span>
            </div>
            <div className="text-center p-3 rounded-lg bg-emerald-50 border border-emerald-200">
              <span className="text-[11px] text-emerald-800 uppercase font-bold block mb-1">
                Recycler Scale
              </span>
              <span className="text-2xl font-black text-emerald-900 font-mono">
                {measuredWeight} kg
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-stone-200 bg-stone-50 text-xs flex justify-between items-center">
            <span className="text-stone-600 font-medium">Agreed Final Payment:</span>
            <PriceDisplay paise={finalAmountPaise} approximate size="md" />
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-stone-200 bg-white text-xs text-stone-700 cursor-pointer">
            <input
              type="checkbox"
              checked={discrepancyAcknowledged}
              onChange={(e) => setDiscrepancyAcknowledged(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>
              I have checked the scale reading ({measuredWeight} kg) and agree to hand over this
              material for formal recycling.
            </span>
          </label>

          <button
            type="button"
            onClick={handleConfirmVerification}
            disabled={!discrepancyAcknowledged || isVerifying}
            className="w-full min-h-[56px] bg-emerald-700 hover:bg-emerald-800 disabled:opacity-50 text-white font-extrabold text-base rounded-xl flex items-center justify-center gap-2 mt-2 shadow-sm"
          >
            {isVerifying ? 'Confirming...' : 'Confirm Handover & Release / पुष्टि करें'}
          </button>
        </div>
      ) : null}

      {/* Screen A-16: Payment Confirmation */}
      {step === 'payment' ? (
        <div className="flex flex-col gap-4 text-center">
          <div className="p-6 rounded-2xl bg-white border border-stone-200 shadow-sm flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-3xl mb-1">
              💰
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800">
              Payment Successful / भुगतान सफल
            </span>

            <div className="text-3xl font-black text-stone-900 font-mono">
              Around ₹{Math.round(finalAmountPaise / 100).toLocaleString('en-IN')}
            </div>

            <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-800 font-semibold inline-block">
              Simulated Payout &bull; Cash / Instant UPI
            </div>

            <p className="text-xs text-stone-500 max-w-xs mt-2">
              Payment credited to your collector earnings ledger. Formal channelization completed.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setStep('passport')}
            className="w-full min-h-[52px] bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2"
          >
            <span>View Digital Lot Passport</span>
            <span>&rarr;</span>
          </button>
        </div>
      ) : null}

      {/* Screen A-17: Digital Lot Passport */}
      {step === 'passport' ? (
        <div className="flex flex-col gap-4">
          <div className="text-center">
            <h2 className="text-xl font-black text-stone-900">Digital Lot Passport</h2>
            <p className="text-xs text-stone-500">Persistent proof of formal e-waste recovery</p>
          </div>

          <div className="p-5 rounded-2xl bg-white border-2 border-emerald-600 shadow-md flex flex-col gap-4">
            <div className="flex justify-between items-start border-b border-stone-200 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-emerald-800 tracking-wider">
                  ReScrap Certificate
                </span>
                <h3 className="font-bold text-stone-900 text-sm">Formal E-Waste Channelization</h3>
              </div>
              <span className="text-[10px] font-mono bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded font-bold">
                PASSPORT
              </span>
            </div>

            <div className="flex flex-col gap-2 text-xs text-stone-700">
              <div className="flex justify-between">
                <span className="text-stone-400">Scrap ID:</span>
                <span className="font-mono font-bold">{lotId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Material Stream:</span>
                <strong>{lot?.materialName ?? 'Laptop / E-Waste'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Reconciled Weight:</span>
                <span className="font-mono font-bold">{measuredWeight} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Recycler Facility:</span>
                <span className="font-semibold text-emerald-900">Apex E-Waste Recyclers</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Settled Value:</span>
                <PriceDisplay paise={finalAmountPaise} approximate size="sm" />
              </div>
              <div className="flex flex-col gap-0.5 border-t border-stone-100 pt-2">
                <span className="text-stone-400 text-[10px]">Traceability Hash:</span>
                <code className="text-[10px] text-stone-600 font-mono truncate">{traceabilityHash}</code>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onDone}
            className="w-full min-h-[52px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-sm flex items-center justify-center mt-2"
          >
            Done &bull; Return to Home
          </button>
        </div>
      ) : null}
    </div>
  );
};
