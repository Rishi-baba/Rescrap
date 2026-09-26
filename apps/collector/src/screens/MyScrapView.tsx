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
    <div className="flex flex-col gap-4 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-stone-900">My Scrap / मेरा कचरा</h2>
          <p className="text-xs text-stone-500">All scrap lots created on this phone</p>
        </div>
        <button
          type="button"
          onClick={onStartAddScrap}
          className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold text-xs"
        >
          + Add
        </button>
      </div>

      {lots.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-stone-200 flex flex-col items-center gap-3">
          <span className="text-4xl">📦</span>
          <h3 className="text-sm font-bold text-stone-800">No scrap registered yet</h3>
          <p className="text-xs text-stone-500">
            Tap &ldquo;Add Scrap&rdquo; to photograph and evaluate your first e-waste batch.
          </p>
          <button
            type="button"
            onClick={onStartAddScrap}
            className="mt-2 min-h-[48px] px-6 rounded-xl bg-emerald-700 text-white font-bold text-sm shadow-sm"
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
                className="p-4 rounded-xl border border-stone-200 bg-white shadow-xs flex flex-col gap-2 cursor-pointer hover:border-emerald-300 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-stone-900 text-sm">{lot.materialName}</h3>
                    <p className="text-xs text-stone-500">
                      {lot.declaredWeightKg} kg &bull; {lot.condition}
                    </p>
                  </div>
                  <PriceDisplay paise={lot.estimatedValuePaise} isEstimate={!isCompleted} size="sm" />
                </div>

                <div className="flex justify-between items-center border-t border-stone-100 pt-2 text-[11px]">
                  <span className="font-mono text-stone-400">ID: {lot.id}</span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-bold uppercase text-[10px] ${
                        isCompleted
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {lot.lifecycleState}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {lot.syncStatus === 'SYNCED' ? '✓ Synced' : '📱 Saved on phone'}
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
