import React, { useEffect, useState } from 'react';
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
  const [activeLot, setActiveLot] = useState<LocalScrapLot | null>(null);

  useEffect(() => {
    const allLots = offlineDb.getLots();
    const active = allLots.find((l) => l.lifecycleState !== 'COMPLETED');
    setActiveLot(active ?? null);
  }, []);

  const materials = [
    {
      id: 'mat_motherboard',
      name: 'Motherboard',
      rateDisplay: '₹220 – 280',
      image: '/assets/mat-motherboard.jpg',
    },
    {
      id: 'mat_copper',
      name: 'Copper Wire',
      rateDisplay: '₹600 – 720',
      image: '/assets/mat-copper.jpg',
    },
    {
      id: 'mat_aluminium',
      name: 'Aluminium',
      rateDisplay: '₹140 – 180',
      image: '/assets/mat-aluminium.jpg',
    },
    {
      id: 'mat_phones',
      name: 'Mobile Phones',
      rateDisplay: '₹90 – 130',
      image: '/assets/mat-phones.jpg',
    },
  ];

  return (
    <div className="flex flex-col gap-4 pb-24 text-stone-100">
      {/* 1. HERO SECTION: Authentic Documentary Collector Photography & Dual-Language Typography */}
      <div className="relative overflow-hidden rounded-3xl bg-[#0C1A14] border border-[#1A3024] p-5 pt-4 min-h-[190px] sm:min-h-[210px] flex items-center shadow-lg">
        {/* Real Documentary Photography of Indian Collector with Scrap Sack */}
        <div className="absolute right-0 top-0 bottom-0 w-[58%] overflow-hidden pointer-events-none">
          <img
            src="/assets/collector-hero.jpg"
            alt="Informal e-waste collector with collected electronics scrap"
            className="w-full h-full object-cover object-top opacity-85"
          />
          {/* Subtle directional vignette fading image into the dark forest background */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#0C1A14] via-[#0C1A14]/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C1A14] via-transparent to-transparent opacity-80" />
        </div>

        {/* Hero Editorial Typography */}
        <div className="relative z-10 max-w-[62%] flex flex-col justify-center">
          <span className="text-stone-300 text-xs font-semibold tracking-wide">
            Hello,
          </span>
          <h1 className="text-2xl sm:text-[32px] font-black text-white tracking-tight leading-tight mt-1">
            आज क्या <br />
            बेचना है?
          </h1>
          <p className="text-stone-300 text-[11px] sm:text-xs leading-relaxed mt-2 font-medium">
            Take a photo, know the price, and sell to verified recyclers.
          </p>
        </div>
      </div>

      {/* 2. PRIMARY ACTION CTA: Warm Parchment "Add Scrap Item" Card */}
      <button
        type="button"
        onClick={onStartAddScrap}
        className="w-full bg-[#F5EFE6] text-stone-900 rounded-2xl p-4 shadow-xl flex items-center justify-between border border-[#E8DFC8]/90 transition-all active:scale-[0.98] hover:bg-[#FAF6EF] text-left cursor-pointer group"
      >
        <div className="flex items-center gap-3.5">
          {/* Circular Emerald Green Camera Icon */}
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#1E8E53] to-[#2FBF71] flex items-center justify-center shadow-md shadow-emerald-950/20 text-white shrink-0">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>

          <div className="flex flex-col">
            <span className="text-base sm:text-lg font-black text-stone-900 tracking-tight leading-tight">
              Add Scrap Item
            </span>
            <span className="text-xs text-stone-600 font-medium mt-0.5 leading-tight">
              Take a photo to identify material
            </span>
          </div>
        </div>

        {/* Tactile Chevron */}
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-stone-400 group-hover:text-stone-700 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>

      {/* 3. ACTIVE BATCH TRACKING (Preserved Operational Feature) */}
      {activeLot ? (
        <div className="p-4 rounded-2xl bg-[#11241C] border border-[#234533] shadow-md flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-[#183B29] text-[#4FD68C] tracking-wider border border-[#2B5E43]">
              Active Lot &bull; {activeLot.lifecycleState}
            </span>
            <span className="text-[10px] font-mono text-stone-400">ID: {activeLot.id}</span>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">{activeLot.materialName}</h3>
              <p className="text-xs text-stone-400">
                Declared: <strong className="text-stone-200 font-mono">{activeLot.declaredWeightKg} kg</strong>
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-stone-400 uppercase font-semibold block mb-0.5">Approx. Value</span>
              <PriceDisplay paise={activeLot.estimatedValuePaise} isEstimate size="sm" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => onOpenLot(activeLot.id)}
            className="w-full min-h-[40px] rounded-xl bg-[#183B29] hover:bg-[#204E36] text-[#4FD68C] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors border border-[#2B5E43]"
          >
            <span>View Offers &amp; Handover Status</span>
            <span>&rarr;</span>
          </button>
        </div>
      ) : null}

      {/* 4. THREE QUICK ACTIONS (Live Prices, Find Recycler, My Earnings) */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Quick Action 1: Live Prices */}
        <button
          type="button"
          onClick={onOpenPrices}
          className="bg-[#12231B] hover:bg-[#182F24] border border-[#1E3A2B] hover:border-[#2C553F] rounded-2xl p-3 flex flex-col justify-between min-h-[102px] text-left transition-all shadow-sm cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-[#1A3326] flex items-center justify-center text-[#2FBF71]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-bold text-white block leading-tight">Live Prices</span>
            <span className="text-[10px] text-stone-400 font-medium group-hover:text-stone-300 flex items-center gap-0.5 mt-0.5">
              Check today&apos;s rates &rsaquo;
            </span>
          </div>
        </button>

        {/* Quick Action 2: Find Recycler */}
        <button
          type="button"
          onClick={onStartAddScrap}
          className="bg-[#12231B] hover:bg-[#182F24] border border-[#1E3A2B] hover:border-[#2C553F] rounded-2xl p-3 flex flex-col justify-between min-h-[102px] text-left transition-all shadow-sm cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-[#1A3326] flex items-center justify-center text-[#2FBF71]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-bold text-white block leading-tight">Find Recycler</span>
            <span className="text-[10px] text-stone-400 font-medium group-hover:text-stone-300 flex items-center gap-0.5 mt-0.5">
              Near your location &rsaquo;
            </span>
          </div>
        </button>

        {/* Quick Action 3: My Earnings */}
        <button
          type="button"
          onClick={onOpenEarnings}
          className="bg-[#12231B] hover:bg-[#182F24] border border-[#1E3A2B] hover:border-[#2C553F] rounded-2xl p-3 flex flex-col justify-between min-h-[102px] text-left transition-all shadow-sm cursor-pointer group"
        >
          <div className="w-8 h-8 rounded-xl bg-[#1A3326] flex items-center justify-center text-[#2FBF71]">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div>
            <span className="text-xs font-bold text-white block leading-tight">My Earnings</span>
            <span className="text-[10px] text-stone-400 font-medium group-hover:text-stone-300 flex items-center gap-0.5 mt-0.5">
              View your income &rsaquo;
            </span>
          </div>
        </button>
      </div>

      {/* 5. TODAY'S RATES SECTION WITH AUTHENTIC MATERIAL PHOTOGRAPHY */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <h2 className="text-sm font-bold text-white tracking-tight">Today&apos;s Rates</h2>
            <span className="text-xs text-stone-400 font-medium">(per kg)</span>
          </div>
          <button
            type="button"
            onClick={onOpenPrices}
            className="text-xs font-semibold text-[#2FBF71] hover:text-[#4FD68C] flex items-center gap-1 transition-colors"
          >
            <span>View All</span>
            <span>&rarr;</span>
          </button>
        </div>

        {/* 4 Realistic Material Photography Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {materials.map((mat) => (
            <div
              key={mat.id}
              onClick={onStartAddScrap}
              className="bg-[#12231B] hover:bg-[#172D23] border border-[#1E3A2B] hover:border-[#2C553F] rounded-2xl p-2.5 flex flex-col justify-between transition-all cursor-pointer group shadow-sm"
            >
              {/* Actual Material Photograph */}
              <div className="w-full aspect-square rounded-xl overflow-hidden mb-2 bg-[#0C1A14] border border-[#1E3A2B]">
                <img
                  src={mat.image}
                  alt={mat.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div>
                <span className="text-xs font-semibold text-stone-200 block truncate">
                  {mat.name}
                </span>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-xs font-extrabold text-[#2FBF71] font-mono">
                    {mat.rateDisplay}
                  </span>
                  <span className="text-stone-400 text-xs group-hover:text-stone-200 font-bold">&rsaquo;</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. ENVIRONMENTAL IMPACT SECTION: Warm Parchment Banner */}
      <div className="bg-[#F5EFE6] text-stone-900 rounded-2xl p-4 flex items-center justify-between border border-[#E8DFC8]/90 shadow-md">
        <div className="flex items-center gap-3">
          {/* Leaf Emblem */}
          <div className="w-10 h-10 rounded-full bg-[#E5F3EB] text-[#1E8E53] flex items-center justify-center shrink-0">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>

          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-black text-stone-900 leading-tight">
              You are making a difference
            </span>
            <span className="text-[10px] sm:text-[11px] text-stone-600 font-medium leading-tight mt-0.5 max-w-[210px]">
              Your scrap helps reduce e-waste and protect our environment.
            </span>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="h-8 w-px bg-stone-300/80 mx-2 shrink-0" />

        {/* Monthly Diverted Weight Statistic */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-full bg-[#E5F3EB] text-[#1E8E53] flex items-center justify-center">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-xs sm:text-sm font-black text-stone-900 font-mono">
              12.4 kg
            </span>
            <span className="text-[9px] text-stone-500 font-semibold">
              Diverted this month
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
