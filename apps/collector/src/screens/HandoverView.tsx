import React, { useState } from 'react';
import { offlineDb } from '../lib/offline-db.js';
import { collectorSession } from '../lib/session.js';


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
  const traceabilityHash = `0x9c64d608e4a91fbc327c1973...${lotId.slice(-6)}`;

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
    <div className="flex flex-col gap-5 max-w-md mx-auto p-4 pb-24 text-stone-100">
      <div className="flex items-center justify-between border-b border-[#1E3A2B] pb-3">
        <button
          type="button"
          onClick={onBack}
          className="text-stone-400 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back</span>
        </button>
        <span className="text-[10px] font-mono tracking-widest uppercase text-[#4FD68C] font-semibold bg-[#12281D] px-2.5 py-0.5 rounded-full border border-[#1E3A2B]">
          Handover &amp; Custody
        </span>
      </div>

      {/* Screen A-14: Handover Tracking Timeline */}
      {step === 'tracking' ? (
        <div className="flex flex-col gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#4FD68C]">
              Logistics Dispatch
            </span>
            <h2 className="text-xl font-bold text-white mt-0.5">Pickup in Progress</h2>
            <p className="text-xs text-stone-400 mt-1">
              Apex E-Waste Recycler van en route to Hadapsar collection point
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-[#12231B] border border-[#1E3A2B] flex flex-col gap-4 shadow-lg">
            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-full bg-[#1E8E53]/20 border border-[#2FBF71]/40 text-[#4FD68C] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Offer Accepted &amp; Locked</span>
                <span className="text-[10px] font-mono text-stone-400">Formal agreement signed by both parties</span>
              </div>
            </div>

            <div className="h-4 w-0.5 bg-[#1E3A2B] ml-4 -my-2" />

            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-full bg-[#1E8E53]/20 border border-[#2FBF71]/40 text-[#4FD68C] flex items-center justify-center shrink-0">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Logistics Vehicle Dispatched</span>
                <span className="text-[10px] font-mono text-stone-400">Equipped with calibrated electronic platform scale</span>
              </div>
            </div>

            <div className="h-4 w-0.5 bg-[#1E3A2B] ml-4 -my-2" />

            <div className="flex items-center gap-3.5">
              <div className="w-8 h-8 rounded-full bg-[#2FBF71] text-[#08130E] flex items-center justify-center font-bold text-xs shrink-0 animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-[#08130E]" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-[#4FD68C]">On-Site Digital Weighing</span>
                <span className="text-[10px] font-mono text-stone-300">Ready at your scrap aggregation spot</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#0D1F17] border border-[#1E3A2B] flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] uppercase font-mono text-stone-400 block">Assigned Recycler</span>
              <strong className="text-white font-semibold">Apex E-Waste Recyclers</strong>
            </div>
            <span className="text-[10px] font-mono bg-[#163324] text-[#4FD68C] px-2.5 py-1 rounded-md border border-[#2FBF71]/30">
              VEHICLE MH-12-QC-4012
            </span>
          </div>

          <button
            type="button"
            onClick={() => setStep('verify')}
            className="w-full min-h-[52px] bg-gradient-to-r from-[#1E8E53] to-[#2FBF71] hover:brightness-110 active:brightness-95 text-[#07130D] font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 mt-2 shadow-lg shadow-emerald-950/50"
          >
            <span>Proceed to Weight Verification</span>
            <span>&rarr;</span>
          </button>
        </div>
      ) : null}

      {/* Screen A-15: Verify Handover (HAND-04) */}
      {step === 'verify' ? (
        <div className="flex flex-col gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#4FD68C]">
              Scale Verification
            </span>
            <h2 className="text-xl font-bold text-white mt-0.5">Verify Final Weight</h2>
            <p className="text-xs text-stone-400 mt-1">
              Cross-check recycler&apos;s digital platform scale reading with your initial estimate
            </p>
          </div>

          <div className="p-3 rounded-xl bg-[#0D1F17] border border-[#1E3A2B] flex items-center justify-between text-xs font-mono">
            <div>
              <span className="text-[10px] text-stone-400 block uppercase">Lot ID: {lotId}</span>
              <span className="text-[#4FD68C] text-[11px]">GPS: 18.5089° N, 73.9259° E</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-stone-400 block uppercase">Handover Timestamp</span>
              <span className="text-stone-300 text-[11px]">28 Sep 2026, 17:42 IST</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 p-4 rounded-2xl bg-[#12231B] border border-[#1E3A2B]">
            <div className="text-center p-3.5 rounded-xl bg-[#0C1A14] border border-[#1A3325]">
              <span className="text-[10px] text-stone-400 uppercase font-mono font-bold block mb-1">
                Your Declared
              </span>
              <span className="text-2xl font-black text-white font-mono">
                {declaredWeight} <span className="text-xs font-normal text-stone-400">kg</span>
              </span>
            </div>
            <div className="text-center p-3.5 rounded-xl bg-[#163324] border border-[#2FBF71]/40">
              <span className="text-[10px] text-[#4FD68C] uppercase font-mono font-bold block mb-1">
                Recycler Scale
              </span>
              <span className="text-2xl font-black text-[#4FD68C] font-mono">
                {measuredWeight} <span className="text-xs font-normal text-[#2FBF71]">kg</span>
              </span>
            </div>
          </div>

          <div className="p-4 rounded-xl border border-[#1E3A2B] bg-[#0E2018] text-xs flex justify-between items-center">
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-mono">Reconciled Payout</span>
              <span className="text-white font-bold">Direct UPI / Cash Settlement:</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-black font-mono text-[#4FD68C]">
                ₹{Math.round(finalAmountPaise / 100).toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-[#1E3A2B] bg-[#12231B] text-xs text-stone-300 cursor-pointer hover:border-[#2FBF71]/50 transition-colors">
            <input
              type="checkbox"
              checked={discrepancyAcknowledged}
              onChange={(e) => setDiscrepancyAcknowledged(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-[#2FBF71] focus:ring-[#2FBF71] bg-[#0C1A14] border-[#1E3A2B]"
            />
            <span>
              I have checked the scale reading ({measuredWeight} kg) and agree to hand over this
              material for formal certified recycling.
            </span>
          </label>

          <button
            type="button"
            onClick={handleConfirmVerification}
            disabled={!discrepancyAcknowledged || isVerifying}
            className="w-full min-h-[56px] bg-gradient-to-r from-[#1E8E53] to-[#2FBF71] hover:brightness-110 active:brightness-95 disabled:opacity-40 text-[#07130D] font-black text-sm rounded-xl flex items-center justify-center gap-2 mt-2 shadow-lg shadow-emerald-950/60"
          >
            {isVerifying ? 'Confirming Handover...' : 'Confirm Handover & Release / पुष्टि करें'}
          </button>
        </div>
      ) : null}

      {/* Screen A-16: Payment Confirmation */}
      {step === 'payment' ? (
        <div className="flex flex-col gap-4 text-center">
          <div className="p-6 rounded-2xl bg-[#F5EFE6] text-[#0C1A14] border border-[#E6DFD5] shadow-2xl flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-full bg-[#1E8E53]/15 text-[#1E8E53] flex items-center justify-center mb-1 border border-[#1E8E53]/30">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#1E8E53] bg-[#1E8E53]/10 px-3 py-1 rounded-full">
              Payment Successful / भुगतान सफल
            </span>

            <div className="text-3xl font-black text-[#0B1914] font-mono mt-1">
              ₹{Math.round(finalAmountPaise / 100).toLocaleString('en-IN')}
            </div>

            <div className="px-3 py-1 rounded-md bg-[#FAF6EF] border border-[#DED7CB] text-[11px] text-stone-700 font-mono font-medium">
              Direct Settlement &bull; Instant UPI Credit
            </div>

            <p className="text-xs text-stone-600 max-w-xs mt-1">
              Payment credited to your collector earnings ledger. Formal channelization completed with zero middleman deductions.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setStep('passport')}
            className="w-full min-h-[52px] bg-[#163324] hover:bg-[#1E4330] border border-[#2FBF71]/40 text-[#4FD68C] font-bold rounded-xl text-sm flex items-center justify-center gap-2 transition-colors"
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
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#4FD68C]">
              CPCB E-Waste Rules 2022
            </span>
            <h2 className="text-xl font-black text-white mt-0.5">Digital Lot Passport</h2>
            <p className="text-xs text-stone-400">Cryptographically verifiable proof of formal e-waste recovery</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#12231B] border-2 border-[#2FBF71] shadow-2xl flex flex-col gap-4 relative overflow-hidden">
            {/* Guilloche border decoration background pattern */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#2FBF71]/5 rounded-bl-full pointer-events-none" />

            <div className="flex justify-between items-start border-b border-[#1E3A2B] pb-3">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase text-[#4FD68C] tracking-wider">
                  ReScrap Official Certificate
                </span>
                <h3 className="font-bold text-white text-sm">Formal E-Waste Channelization</h3>
              </div>
              <span className="text-[10px] font-mono bg-[#1E8E53]/20 border border-[#2FBF71]/40 text-[#4FD68C] px-2.5 py-0.5 rounded font-bold">
                PASSPORT
              </span>
            </div>

            <div className="flex flex-col gap-2.5 text-xs text-stone-300">
              <div className="flex justify-between">
                <span className="text-stone-400">Scrap ID:</span>
                <span className="font-mono font-bold text-white">{lotId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Material Stream:</span>
                <strong className="text-white">{lot?.materialName ?? 'Laptop / E-Waste Scrap'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Reconciled Weight:</span>
                <span className="font-mono font-bold text-[#4FD68C]">{measuredWeight} kg</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Recycler Facility:</span>
                <span className="font-semibold text-white">Apex E-Waste Recyclers</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Timestamp:</span>
                <span className="font-mono text-stone-200">28 Sep 2026, 17:42:18 IST</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">GPS Handover Fix:</span>
                <span className="font-mono text-[#4FD68C]">18.5089° N, 73.9259° E (Hadapsar Hub)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Settled Value:</span>
                <span className="font-mono font-bold text-[#4FD68C]">
                  ₹{Math.round(finalAmountPaise / 100).toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex flex-col gap-1 border-t border-[#1E3A2B] pt-2.5">
                <span className="text-stone-400 text-[10px] uppercase font-mono">Traceability Hash:</span>
                <code className="text-[10px] text-[#4FD68C] font-mono break-all bg-[#0C1A14] p-2 rounded-lg border border-[#1E3A2B]">
                  {traceabilityHash}
                </code>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onDone}
            className="w-full min-h-[52px] bg-gradient-to-r from-[#1E8E53] to-[#2FBF71] hover:brightness-110 active:brightness-95 text-[#07130D] font-extrabold rounded-xl text-sm flex items-center justify-center mt-2 shadow-lg"
          >
            Done &bull; Return to Home
          </button>
        </div>
      ) : null}
    </div>
  );
};
