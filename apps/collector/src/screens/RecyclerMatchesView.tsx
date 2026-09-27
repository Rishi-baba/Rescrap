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
    <div className="flex flex-col gap-4 max-w-md mx-auto p-4 pb-20">
      <div className="flex items-center justify-between border-b border-stone-200 pb-3">
        <button type="button" onClick={onBack} className="text-stone-500 font-semibold text-xs">
          &larr; Back to Home
        </button>
        <span className="text-xs font-bold uppercase text-emerald-800 tracking-wider">
          Nearby Recycler Offers
        </span>
      </div>

      {/* Lot Context */}
      <div className="p-3.5 rounded-xl bg-white border border-stone-200 flex justify-between items-center text-xs">
        <div>
          <span className="text-stone-400 block text-[10px] uppercase font-bold">Your Lot</span>
          <strong className="text-stone-900 text-sm">{lot?.materialName ?? 'Scrap Material'}</strong>
          <span className="text-stone-500 block">{lot?.declaredWeightKg ?? 12} kg declared</span>
        </div>
        <div className="text-right">
          <span className="text-stone-400 block text-[10px] uppercase font-bold">Estimated Rate</span>
          <PriceDisplay paise={lot?.estimatedValuePaise ?? 140000} isEstimate size="sm" />
        </div>
      </div>

      {acceptedOfferId ? (
        /* Screen A-13: Offer Accepted */
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 text-center flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-emerald-600 text-white flex items-center justify-center text-2xl shadow-sm">
            ✓
          </div>
          <h2 className="text-lg font-extrabold text-emerald-950">Offer Accepted! / स्वीकार किया</h2>
          <p className="text-xs text-emerald-800">
            The verified recycler has been notified. They will schedule pickup and bring an electronic
            scale to your location.
          </p>

          <button
            type="button"
            onClick={onProceedToHandover}
            className="w-full min-h-[52px] bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl text-sm shadow-md mt-2 flex items-center justify-center gap-2"
          >
            <span>Track Pickup &amp; Verify Handover</span>
            <span>&rarr;</span>
          </button>
        </div>
      ) : (
        /* Screen A-12: Recycler Offers */
        <div className="flex flex-col gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            {offers.length} Competing Offers Received
          </span>

          {offers.map((offer) => (
            <div
              key={offer.id}
              className="p-4 rounded-xl border border-stone-200 bg-white shadow-xs flex flex-col gap-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-stone-900 text-sm">{offer.recyclerName}</h3>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-stone-500 mt-0.5">{offer.area}</p>
                </div>
                <PriceDisplay paise={offer.amountPaise} approximate size="md" />
              </div>

              <div className="p-2.5 rounded-lg bg-stone-50 text-[11px] text-stone-600">
                {offer.notes} &bull; <span className="text-stone-400">Valid until {offer.validUntil}</span>
              </div>

              <button
                type="button"
                onClick={() => handleAccept(offer.id)}
                disabled={isAccepting}
                className="w-full min-h-[48px] bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-lg text-sm flex items-center justify-center transition-colors"
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
