import React, { useEffect, useState } from 'react';
import { offlineDb, type LocalScrapLot } from '../lib/offline-db.js';
import { PriceDisplay } from '@rescrap/design-system';

interface MyScrapViewProps {
  onOpenLot: (lotId: string) => void;
  onStartAddScrap: () => void;
}

export const MyScrapView: React.FC<MyScrapViewProps> = ({ onOpenLot, onStartAddScrap }) => {
  const [lots, setLots] = useState<LocalScrapLot[]>([]);

  useEffect(() => {
    setLots(offlineDb.getLots());
  }, []);

  return (
    <div className="flex flex-col gap-4 pb-24 text-stone-100">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-black text-white">My Scrap / मेरा कचरा</h2>
          <p className="text-xs text-stone-400 font-medium">All scrap lots created on this phone</p>
        </div>
        <button
          type="button"
          onClick={onStartAddScrap}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#1E8E53] to-[#2FBF71] hover:from-[#249E5D] hover:to-[#35CD7C] text-white font-black text-xs shadow-md shadow-emerald-950/40 transition-transform active:scale-95"
        >
          + Add Scrap
        </button>
      </div>

      {lots.length === 0 ? (
        <div className="p-8 text-center bg-[#12231B] rounded-2xl border border-[#1E3A2B] flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#183627] text-[#2FBF71] flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-sm font-bold text-white">No scrap registered yet</h3>
          <p className="text-xs text-stone-400 max-w-xs font-medium">
            Tap &ldquo;Add Scrap&rdquo; to photograph and evaluate your first e-waste batch.
          </p>
          <button
            type="button"
            onClick={onStartAddScrap}
            className="mt-2 min-h-[48px] px-6 rounded-2xl bg-gradient-to-r from-[#1E8E53] to-[#2FBF71] text-white font-extrabold text-sm shadow-md"
          >
            Add Scrap Now
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {lots.map((lot) => {
            const isCompleted = lot.lifecycleState === 'COMPLETED';
            return (
              <div
                key={lot.id}
                onClick={() => onOpenLot(lot.id)}
                className="p-4 rounded-2xl border border-[#1E3A2B] bg-[#12231B] hover:border-[#2C553F] shadow-sm flex flex-col gap-2.5 cursor-pointer transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-white text-sm sm:text-base">{lot.materialName}</h3>
                    <p className="text-xs text-stone-400 font-medium mt-0.5">
                      <strong className="text-stone-200 font-mono">{lot.declaredWeightKg} kg</strong> &bull; {lot.condition} &bull; {lot.sourceType}
                    </p>
                  </div>
                  <PriceDisplay paise={lot.estimatedValuePaise} isEstimate={!isCompleted} size="sm" />
                </div>

                <div className="flex justify-between items-center border-t border-[#1C3326] pt-2.5 text-[11px]">
                  <span className="font-mono text-stone-400">ID: {lot.id}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded-full font-extrabold uppercase text-[10px] border ${
                        isCompleted
                          ? 'bg-[#183B29] text-[#4FD68C] border-[#2B5E43]'
                          : 'bg-[#162D3B] text-[#5CC1F5] border-[#234B62]'
                      }`}
                    >
                      {lot.lifecycleState}
                    </span>
                    <span className="text-[10px] text-stone-400 font-medium">
                      {lot.syncStatus === 'SYNCED' ? 'Synced' : 'Saved on phone'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
