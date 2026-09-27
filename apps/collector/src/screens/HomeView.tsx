import React, { useEffect, useState } from 'react';
import { SyncChip } from '../components/SyncChip.js';
import { useI18n } from '../lib/i18n.js';
import { offlineDb, type LocalScrapLot } from '../lib/offline-db.js';
import { PriceDisplay } from '@rescrap/design-system';

interface HomeViewProps {
  onStartAddScrap: () => void;
  onOpenLot: (lotId: string) => void;
  onOpenPrices: () => void;
  onOpenEarnings: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onStartAddScrap,
  onOpenLot,
  onOpenPrices,
  onOpenEarnings,
}) => {
  const { t } = useI18n();
  const [lots, setLots] = useState<LocalScrapLot[]>([]);
  const [activeLot, setActiveLot] = useState<LocalScrapLot | null>(null);

  useEffect(() => {
    const allLots = offlineDb.getLots();
    setLots(allLots);
    const active = allLots.find((l) => l.lifecycleState !== 'COMPLETED');
    setActiveLot(active ?? null);
  }, []);

  const priceTeasers = [
    { name: 'Laptop / Computer', rate: 'Around ₹140/kg', icon: '💻' },
    { name: 'Mobile / Smartphone', rate: 'Around ₹350/kg', icon: '📱' },
    { name: 'Copper Wires', rate: 'Around ₹620/kg', icon: '⚡' },
    { name: 'Printed Circuit Boards', rate: 'Around ₹220/kg', icon: '🔌' },
  ];

  return (
    <div className="flex flex-col gap-4 pb-20">
      {/* Sync Status Banner */}
      <div className="flex justify-between items-center">
        <SyncChip />
        <span className="text-[11px] text-stone-500 font-medium">Pune - Hadapsar</span>
      </div>

      {/* Primary Hero CTA (Add Scrap >= 56dp) */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 to-emerald-600 p-5 text-white shadow-md">
        <div className="relative z-10 flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-200">
            {t('collector', 'home') || 'Namaste, Sunita'}
          </span>
          <h2 className="text-xl font-extrabold leading-tight">
            Have e-waste or scrap to sell today?
          </h2>
          <p className="text-xs text-emerald-100">
            Photograph, check fair rate, and connect directly with verified authorized recyclers.
          </p>

          <button
            type="button"
            onClick={onStartAddScrap}
            className="w-full min-h-[56px] bg-white text-emerald-900 hover:bg-emerald-50 active:bg-emerald-100 font-extrabold text-lg rounded-xl shadow-lg flex items-center justify-center gap-2 mt-2 transition-transform active:scale-98"
          >
            <span className="text-2xl">📸</span>
            <span>{t('collector', 'addScrap') || 'Add Scrap / कचरा जोड़ें'}</span>
          </button>
        </div>
      </div>

      {/* Active Scrap Progress Card */}
      {activeLot ? (
        <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/70 shadow-xs flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-emerald-800 tracking-wider">
              Active Scrap Lot &bull; {activeLot.lifecycleState}
            </span>
            <span className="text-[11px] font-mono text-stone-500">ID: {activeLot.id}</span>
          </div>

          <div className="flex items-center justify-between mt-1">
            <div>
              <h3 className="font-bold text-stone-900 text-base">{activeLot.materialName}</h3>
              <p className="text-xs text-stone-600">Weight: <strong>{activeLot.declaredWeightKg} kg</strong></p>
            </div>
            <div className="text-right">
              <PriceDisplay paise={activeLot.estimatedValuePaise} isEstimate size="sm" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenLot(activeLot.id)}
            className="w-full min-h-[44px] mt-2 rounded-lg bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1 hover:bg-emerald-800"
          >
            <span>View Offers &amp; Handover Status</span>
            <span>&rarr;</span>
          </button>
        </div>
      ) : null}

      {/* Today's Market Rates Teaser */}
      <div className="p-4 rounded-xl border border-stone-200 bg-white shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900">
              {t('collector', 'priceBoard') || "Today's Rates / आज के भाव"}
            </h3>
            <span className="text-[10px] text-stone-400">Reference rates per kg in Hadapsar</span>
          </div>
          <button
            type="button"
            onClick={onOpenPrices}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800"
          >
            Full Board &rarr;
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {priceTeasers.map((pt) => (
            <div
              key={pt.name}
              onClick={onOpenPrices}
              className="p-2.5 rounded-lg border border-stone-100 bg-stone-50/70 flex items-center justify-between cursor-pointer hover:bg-emerald-50/40"
            >
              <div className="flex items-center gap-1.5 truncate">
                <span className="text-base">{pt.icon}</span>
                <span className="text-xs font-medium text-stone-800 truncate">{pt.name}</span>
              </div>
              <span className="text-xs font-bold text-emerald-800 font-mono shrink-0 ml-1">
                {pt.rate}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Earnings Quick Summary */}
      <div
        onClick={onOpenEarnings}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter') onOpenEarnings(); }}
        className="p-3.5 rounded-xl border border-stone-200 bg-white shadow-xs flex items-center justify-between cursor-pointer hover:border-emerald-300"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-lg font-bold">
            ₹
          </div>
          <div>
            <div className="text-xs text-stone-500 font-medium">My Total Lots: {lots.length}</div>
            <div className="text-sm font-bold text-stone-900">Check Payouts &amp; Passports</div>
          </div>
        </div>
        <span className="text-xs font-bold text-emerald-700">View &rarr;</span>
      </div>

      {/* Safety Card (Low-literacy visual warning) */}
      <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/80 flex items-start gap-3 text-xs text-amber-900">
        <span className="text-2xl">⚠️</span>
        <div>
          <strong className="block text-amber-950 font-bold mb-0.5">
            Safety Tip: Lithium Batteries
          </strong>
          <span>
            Never puncture, crush, or burn laptop or phone batteries. Keep stored in dry shade to
            prevent sparks.
          </span>
        </div>
      </div>
    </div>
  );
};
