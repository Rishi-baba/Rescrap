import React, { useState } from 'react';
import { offlineDb } from '../lib/offline-db.js';
import { collectorSession } from '../lib/session.js';
import { PriceDisplay } from '@rescrap/design-system';

interface RecyclerMatchesViewProps {
  lotId: string;
  onBack: () => void;
  onProceedToHandover: () => void;
}

export const RecyclerMatchesView: React.FC<RecyclerMatchesViewProps> = ({
  lotId,
  onBack,
  onProceedToHandover,
}) => {
  const lot = offlineDb.getLot(lotId);
  const [acceptedOfferId, setAcceptedOfferId] = useState<string | null>(null);
  const [isAccepting, setIsAccepting] = useState(false);

  // Demo matching offers from verified recyclers
  const offers = [
    {
      id: `off_apex_${lotId}`,
      recyclerName: 'Apex E-Waste Recyclers',
      area: 'Hadapsar Industrial Area (1.8 km)',
      verifiedBadge: true,
      amountPaise: lot ? Math.round(lot.estimatedValuePaise * 1.05) : 150000,
      validUntil: 'Tomorrow, 5:00 PM',
      notes: 'Free on-site pickup included with calibrated electronic scale',
    },
    {
      id: `off_eco_${lotId}`,
      recyclerName: 'GreenTech Recovery Ltd',
      area: 'Pune Central (4.2 km)',
      verifiedBadge: true,
      amountPaise: lot ? Math.round(lot.estimatedValuePaise * 0.98) : 140000,
      validUntil: 'In 3 days',
      notes: 'Direct UPI or instant cash settlement',
    },
  ];

  const handleAccept = async (offerId: string) => {
    setIsAccepting(true);
    const key = `accept_${offerId}_${Date.now()}`;
    try {
      if (offlineDb.isOnline()) {
        await collectorSession.client.acceptOffer(offerId, key);
      }
      if (lot) {
        lot.lifecycleState = 'OFFER_ACCEPTED';
        offlineDb.saveLot(lot);
      }
      setAcceptedOfferId(offerId);
    } catch {
      // In offline mode, still accept locally!
      if (lot) {
        lot.lifecycleState = 'OFFER_ACCEPTED';
        offlineDb.saveLot(lot);
      }
      setAcceptedOfferId(offerId);
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 max-w-md mx-auto p-4 pb-24 text-stone-100">
      <div className="flex items-center justify-between border-b border-[#1C3326] pb-3">
        <button
          type="button"
          onClick={onBack}
          className="text-stone-400 hover:text-stone-200 font-semibold text-xs flex items-center gap-1.5"
        >
          <span>&larr;</span>
          <span>Back to Home</span>
        </button>
        <span className="text-[11px] font-black uppercase text-[#2FBF71] tracking-wider px-2 py-0.5 rounded-full bg-[#183627] border border-[#26533D]">
          Nearby Recycler Offers
        </span>
      </div>

      {/* Lot Context */}
      <div className="p-4 rounded-2xl bg-[#12231B] border border-[#1E3A2B] flex justify-between items-center text-xs shadow-sm">
        <div>
          <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider">Your Lot Batch</span>
          <strong className="text-white text-base">{lot?.materialName ?? 'Scrap Material'}</strong>
          <span className="text-stone-400 block font-mono mt-0.5">{lot?.declaredWeightKg ?? 12} kg declared</span>
        </div>
        <div className="text-right">
          <span className="text-stone-400 block text-[10px] uppercase font-bold tracking-wider mb-0.5">Estimated Rate</span>
          <PriceDisplay paise={lot?.estimatedValuePaise ?? 140000} isEstimate size="sm" tone="light" />
        </div>
      </div>

      {acceptedOfferId ? (
        /* Screen A-13: Offer Accepted (Warm Parchment Card) */
        <div className="p-6 rounded-3xl bg-[#F5EFE6] text-stone-900 border border-[#E8DFC8]/90 text-center flex flex-col items-center gap-3 shadow-xl">
          <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#1E8E53] to-[#2FBF71] text-white flex items-center justify-center shadow-lg">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-black text-stone-950">Offer Accepted! / स्वीकार किया</h2>
          <p className="text-xs text-stone-600 max-w-xs font-medium leading-relaxed">
            The verified recycler has been notified. They will dispatch logistics with a calibrated digital scale to your location.
          </p>

          <button
            type="button"
            onClick={onProceedToHandover}
            className="w-full min-h-[52px] bg-gradient-to-r from-[#1E8E53] to-[#2FBF71] hover:from-[#249E5D] hover:to-[#35CD7C] text-white font-extrabold rounded-2xl text-sm shadow-lg shadow-emerald-950/40 mt-2 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            <span>Track Pickup &amp; Verify Handover</span>
            <span>&rarr;</span>
          </button>
        </div>
      ) : (
        /* Screen A-12: Recycler Offers */
        <div className="flex flex-col gap-3">
          <span className="text-xs font-extrabold uppercase tracking-wider text-stone-400">
            {offers.length} Competing Offers Received
          </span>

          {offers.map((offer) => (
            <div
              key={offer.id}
              className="p-4 rounded-2xl border border-[#1E3A2B] bg-[#12231B] hover:border-[#2C553F] shadow-sm flex flex-col gap-3 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-white text-sm">{offer.recyclerName}</h3>
                    <span className="text-[10px] bg-[#183B29] text-[#4FD68C] font-extrabold px-2 py-0.5 rounded-full border border-[#2B5E43] flex items-center gap-1">
                      <svg className="w-3 h-3 text-[#2FBF71]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 font-medium mt-0.5">{offer.area}</p>
                </div>
                <PriceDisplay paise={offer.amountPaise} approximate size="md" tone="emerald" />
              </div>

              <div className="p-3 rounded-xl bg-[#0C1A14] border border-[#1C3326] text-xs text-stone-300">
                {offer.notes} &bull; <span className="text-stone-400 font-medium">Valid until {offer.validUntil}</span>
              </div>

              <button
                type="button"
                onClick={() => handleAccept(offer.id)}
                disabled={isAccepting}
                className="w-full min-h-[50px] bg-gradient-to-r from-[#1E8E53] to-[#2FBF71] hover:from-[#249E5D] hover:to-[#35CD7C] text-white font-extrabold rounded-xl text-sm shadow-md transition-all active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {isAccepting ? 'Accepting...' : 'Accept This Offer / स्वीकार करें'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
