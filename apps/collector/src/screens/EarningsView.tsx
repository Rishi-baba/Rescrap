import React, { useState } from 'react';
import { DemoBanner } from '@rescrap/design-system';
import { useI18n } from '../lib/i18n.js';
import { offlineDb, type LocalScrapLot } from '../lib/offline-db.js';

interface EarningsViewProps {
  onOpenLotPassport?: (lotId: string) => void;
}

export const EarningsView: React.FC<EarningsViewProps> = ({ onOpenLotPassport }) => {
  const { locale } = useI18n();
  const [selectedPeriod, setSelectedPeriod] = useState<'ALL' | 'MONTH' | 'WEEK'>('ALL');

  const lots = offlineDb.getLots();

  // Baseline completed demo payouts if user has no lots yet
  const defaultHistory: LocalScrapLot[] = [
    {
      id: 'lot_demo_01',
      materialId: 'mat_laptop',
      materialName: 'Laptop / Computer Scrap',
      categoryName: 'Computing',
      declaredWeightKg: 15,
      condition: 'FAIR',
      sourceType: 'HOUSEHOLD',
      estimatedValuePaise: 210000, // ₹2,100.00
      collectionArea: 'Pune - Hadapsar',
      createdAt: '2026-09-24T10:30:00Z',
      syncStatus: 'SYNCED',
      lifecycleState: 'COMPLETED',
    },
    {
      id: 'lot_demo_02',
      materialId: 'mat_mobile_phone',
      materialName: 'Smartphones & Feature Phones',
      categoryName: 'Electronics',
      declaredWeightKg: 4.5,
      condition: 'GOOD',
      sourceType: 'COMMERCIAL',
      estimatedValuePaise: 157500, // ₹1,575.00
      collectionArea: 'Pune - Hadapsar',
      createdAt: '2026-09-22T14:15:00Z',
      syncStatus: 'SYNCED',
      lifecycleState: 'COMPLETED',
    },
    {
      id: 'lot_demo_03',
      materialId: 'mat_circuit_board',
      materialName: 'Printed Circuit Boards',
      categoryName: 'Electronics',
      declaredWeightKg: 8.0,
      condition: 'GOOD',
      sourceType: 'INSTITUTIONAL',
      estimatedValuePaise: 176000, // ₹1,760.00
      collectionArea: 'Pune - Hadapsar',
      createdAt: '2026-09-18T11:00:00Z',
      syncStatus: 'SYNCED',
      lifecycleState: 'COMPLETED',
    },
  ];

  // Combine user lots with demo baseline
  const completedLots = [
    ...lots.filter((l) => l.lifecycleState === 'COMPLETED'),
    ...defaultHistory,
  ];

  const pendingLots = lots.filter(
    (l) =>
      l.lifecycleState === 'OFFER_ACCEPTED' ||
      l.lifecycleState === 'PICKUP_SCHEDULED' ||
      l.lifecycleState === 'HANDOVER_EXECUTED',
  );

  const totalConfirmedPaise = completedLots.reduce((acc, l) => acc + l.estimatedValuePaise, 0);
  const pendingPaise = pendingLots.reduce((acc, l) => acc + l.estimatedValuePaise, 0);
  const totalWeightKg = completedLots.reduce((acc, l) => acc + l.declaredWeightKg, 0);

  return (
    <div className="flex flex-col gap-4 pb-24 text-stone-100">
      {/* Title */}
      <div>
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#4FD68C]">
          Financial Ledger
        </span>
        <h2 className="text-xl font-black text-white mt-0.5">
          {locale === 'hi' ? 'मेरी कमाई व भुगतान' : locale === 'mr' ? 'माझी कमाई आणि पेमेंट्स' : 'Earnings & Settlements'}
        </h2>
        <p className="text-xs text-stone-400 mt-1">
          {locale === 'hi'
            ? 'अधिकृत रीसायकलर्स से सीधे आपके बैंक / UPI खाते में पारदर्शी भुगतान'
            : 'Direct formal payments credited to your account with zero middleman deductions'}
        </p>
      </div>

      <DemoBanner />

      {/* Main Earnings Hero Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-[#122E22] via-[#0E261C] to-[#0A1A13] border border-[#1E3A2B] text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#2FBF71]/10 rounded-bl-full pointer-events-none" />

        <div className="flex justify-between items-start">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider font-semibold text-[#4FD68C]">
              {locale === 'hi' ? 'कुल प्राप्त राशि' : 'Total Confirmed Payouts'}
            </span>
            <div className="text-3xl font-extrabold font-mono mt-1 tracking-tight text-white">
              ₹{Math.round(totalConfirmedPaise / 100).toLocaleString('en-IN')}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-[#163324] text-[#4FD68C] border border-[#2FBF71]/30">
            UPI: sunita@oksbi
          </span>
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-[#1E3A2B]">
          <div className="p-2.5 rounded-xl bg-[#08150F]/60 border border-[#162E21]">
            <span className="text-[10px] font-mono text-stone-400 block uppercase">
              {locale === 'hi' ? 'प्रक्रिया में (लंबित)' : 'Pending Payouts'}
            </span>
            <div className="text-base font-bold font-mono text-stone-200 mt-0.5">
              ₹{Math.round(pendingPaise / 100).toLocaleString('en-IN')}
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-[#08150F]/60 border border-[#162E21]">
            <span className="text-[10px] font-mono text-stone-400 block uppercase">
              {locale === 'hi' ? 'कुल वजन निपटाया' : 'Total Diverted'}
            </span>
            <div className="text-base font-bold font-mono text-[#4FD68C] mt-0.5">
              {totalWeightKg.toFixed(1)} kg
            </div>
          </div>
        </div>
      </div>

      {/* Period Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-[#1E3A2B] pb-2">
        <button
          type="button"
          onClick={() => setSelectedPeriod('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            selectedPeriod === 'ALL'
              ? 'bg-[#1E8E53] text-[#07130D]'
              : 'bg-[#12231B] text-stone-400 hover:text-white border border-[#1E3A2B]'
          }`}
        >
          {locale === 'hi' ? 'सभी समय' : 'All Time'}
        </button>
        <button
          type="button"
          onClick={() => setSelectedPeriod('MONTH')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            selectedPeriod === 'MONTH'
              ? 'bg-[#1E8E53] text-[#07130D]'
              : 'bg-[#12231B] text-stone-400 hover:text-white border border-[#1E3A2B]'
          }`}
        >
          {locale === 'hi' ? 'इस महीने' : 'This Month'}
        </button>
        <button
          type="button"
          onClick={() => setSelectedPeriod('WEEK')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
            selectedPeriod === 'WEEK'
              ? 'bg-[#1E8E53] text-[#07130D]'
              : 'bg-[#12231B] text-stone-400 hover:text-white border border-[#1E3A2B]'
          }`}
        >
          {locale === 'hi' ? 'इस सप्ताह' : 'This Week'}
        </button>
      </div>

      {/* Payment Ledger Section */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-stone-400">
            {locale === 'hi' ? 'लेन-देन इतिहास' : 'Settlement Ledger'}
          </h3>
          <span className="text-[10px] font-mono text-stone-500">
            {completedLots.length} records verified
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          {completedLots.map((lot) => {
            const dateStr = new Date(lot.createdAt).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div
                key={lot.id}
                className="p-3.5 rounded-xl border border-[#1E3A2B] bg-[#12231B] shadow-sm flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-white text-sm">{lot.materialName}</h4>
                    <p className="text-[11px] text-stone-400 mt-0.5">
                      Recycler: <strong className="text-stone-300">Apex E-Waste Recyclers</strong> &bull; {dateStr}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-extrabold text-[#4FD68C] font-mono">
                      ₹{Math.round(lot.estimatedValuePaise / 100).toLocaleString('en-IN')}
                    </div>
                    <span className="text-[11px] text-stone-400 font-mono">
                      {lot.declaredWeightKg} kg
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#1E3A2B]/60">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-[#4FD68C] bg-[#163324] px-2 py-0.5 rounded border border-[#2FBF71]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#4FD68C]" />
                    <span>PAID VIA UPI</span>
                  </div>

                  {onOpenLotPassport && (
                    <button
                      type="button"
                      onClick={() => onOpenLotPassport(lot.id)}
                      className="text-xs font-semibold text-[#4FD68C] hover:text-white flex items-center gap-1 transition-colors"
                    >
                      <span>Digital Passport</span>
                      <span>&rarr;</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Trust & Guarantee Box */}
      <div className="p-3.5 rounded-xl border border-[#1E3A2B] bg-[#0E2018] flex items-start gap-3 text-xs text-stone-300">
        <div className="w-7 h-7 rounded-lg bg-[#163324] border border-[#2FBF71]/40 text-[#4FD68C] flex items-center justify-center shrink-0">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <strong className="block font-bold text-white">100% Direct Payout Guarantee</strong>
          <span className="text-stone-400 mt-0.5 block leading-relaxed">
            ReScrap guarantees exact weight payouts. In case of any dispute or weight mismatch over 10%, our fair mediation team steps in immediately.
          </span>
        </div>
      </div>
    </div>
  );
};
