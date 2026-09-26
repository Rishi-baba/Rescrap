import React, { useState } from 'react';
import { formatMoney, money } from '@rescrap/shared';
import { DemoBanner, StatusPill } from '@rescrap/design-system';
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
    <div className="flex flex-col gap-4 pb-24">
      {/* Title */}
      <div>
        <h2 className="text-xl font-extrabold text-stone-900">
          {locale === 'hi' ? 'मेरी कमाई व भुगतान' : locale === 'mr' ? 'माझी कमाई आणि पेमेंट्स' : 'Earnings & Settlements'}
        </h2>
        <p className="text-xs text-stone-500 mt-1">
          {locale === 'hi'
            ? 'अधिकृत रीसायकलर्स से सीधे आपके बैंक / UPI खाते में पारदर्शी भुगतान'
            : 'Direct formal payments credited to your account with zero middlemen deductions'}
        </p>
      </div>

      <DemoBanner />

      {/* Main Earnings Hero Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 text-white shadow-lg">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold text-emerald-200">
              {locale === 'hi' ? 'कुल प्राप्त राशि' : 'Total Confirmed Payouts'}
            </span>
            <div className="text-3xl font-extrabold font-mono mt-1 tracking-tight">
              {formatMoney(money(totalConfirmedPaise))}
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
            UPI: ramesh@oksbi
          </span>
        </div>

        {/* Secondary Stats Row */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-emerald-700/60">
          <div>
            <span className="text-[11px] text-emerald-200 font-medium">
              {locale === 'hi' ? 'प्रक्रिया में (लंबित)' : 'Pending Verification'}
            </span>
            <div className="text-base font-bold font-mono text-emerald-100">
              {formatMoney(money(pendingPaise))}
            </div>
          </div>
          <div>
            <span className="text-[11px] text-emerald-200 font-medium">
              {locale === 'hi' ? 'कुल वजन निपटाया' : 'Total Scrap Recycled'}
            </span>
            <div className="text-base font-bold font-mono text-emerald-100">
              {totalWeightKg.toFixed(1)} kg
            </div>
          </div>
        </div>
      </div>

      {/* Period Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          type="button"
          onClick={() => setSelectedPeriod('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            selectedPeriod === 'ALL'
              ? 'bg-emerald-800 text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          {locale === 'hi' ? 'सभी समय' : 'All Time'}
        </button>
        <button
          type="button"
          onClick={() => setSelectedPeriod('MONTH')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            selectedPeriod === 'MONTH'
              ? 'bg-emerald-800 text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          {locale === 'hi' ? 'इस महीने' : 'This Month'}
        </button>
        <button
          type="button"
          onClick={() => setSelectedPeriod('WEEK')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            selectedPeriod === 'WEEK'
              ? 'bg-emerald-800 text-white'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          {locale === 'hi' ? 'इस सप्ताह' : 'This Week'}
        </button>
      </div>

      {/* Payment Ledger Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-bold text-stone-900">
            {locale === 'hi' ? 'लेन-देन इतिहास' : 'Settlement Ledger'}
          </h3>
          <span className="text-xs text-stone-500 font-medium">
            {completedLots.length} records
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
                className="p-3.5 rounded-xl border border-stone-200 bg-white shadow-xs flex flex-col gap-2.5"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-bold text-stone-900 text-sm">{lot.materialName}</h4>
                    <p className="text-[11px] text-stone-500 mt-0.5">
                      Recycler: <strong className="text-stone-700">EcoRecycle Maharashtra</strong> &bull; {dateStr}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-extrabold text-emerald-800 font-mono">
                      +{formatMoney(money(lot.estimatedValuePaise))}
                    </div>
                    <span className="text-[11px] text-stone-500 font-medium">
                      {lot.declaredWeightKg} kg
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-stone-100">
                  <StatusPill status="success" label="PAID VIA UPI" />

                  {onOpenLotPassport && (
                    <button
                      type="button"
                      onClick={() => onOpenLotPassport(lot.id)}
                      className="text-xs font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                    >
                      <span>📜 Digital Passport</span>
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
      <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-start gap-2.5 text-xs text-emerald-950">
        <span className="text-xl">🛡️</span>
        <div>
          <strong className="block font-bold">100% Direct Payout Guarantee</strong>
          <span>
            ReScrap guarantees exact weight payouts. In case of any dispute or weight mismatch over 10%, our fair mediation team steps in immediately.
          </span>
        </div>
      </div>
    </div>
  );
};
